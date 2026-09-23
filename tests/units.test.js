const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const U = require("../www/js/units");
const Settings = require("../www/js/units-settings");
const Session = require("../www/js/settings-session");
const H = require("../www/js/hydraulics-core");
const metric = { unitSystem: "metric" };
const near = (a, b) => assert.ok(Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
function storage() {
  const values = new Map();
  const writes = [];
  return { values, writes,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes.push(key); values.set(key, value); },
    removeItem: key => { writes.push(key); values.delete(key); }
  };
}

test("preference defaults and malformed/unsupported versions are read-only and fail to U.S.", () => {
  const s = storage();
  for (const raw of [null, "bad JSON", "null", "[]", "4", '{}', '{"unitSystem":"metric"}',
    '{"version":2,"unitSystem":"metric"}', '{"version":1,"unitSystem":"other"}']) {
    if (raw === null) s.values.delete(U.STORAGE_KEY); else s.values.set(U.STORAGE_KEY, raw);
    assert.deepEqual(U.createPreferenceStore(s).get(), U.DEFAULTS);
    assert.deepEqual(s.writes, []);
  }
  assert.deepEqual(U.createPreferenceStore({ getItem() { throw Error("denied"); } }).get(), U.DEFAULTS);
});

test("all approved selections survive reload, with bar/N metric defaults", () => {
  const s = storage();
  for (const unitSystem of ["us", "metric"]) {
    for (const metricPressureUnit of [undefined, "invalid", "bar", "kpa"]) {
      for (const metricReactionUnit of [undefined, "invalid", "n", "kgf"]) {
        const saved = U.createPreferenceStore(s).save({ unitSystem, metricPressureUnit, metricReactionUnit });
        // A new store is the same read path used after a page/app reload.
        assert.deepEqual(U.createPreferenceStore(s).get(), saved);
        assert.equal(saved.unitSystem, unitSystem);
        assert.equal(saved.metricPressureUnit, metricPressureUnit === "kpa" ? "kpa" : "bar");
        assert.equal(saved.metricReactionUnit, metricReactionUnit === "kgf" ? "kgf" : "n");
      }
    }
  }
});

for (const [forward, reverse, canonical, converted] of [
  ["psiToBar", "barToPsi", 100, 6.894757293168361],
  ["psiToKpa", "kpaToPsi", 100, 689.4757293168361],
  ["gpmToLitresPerMinute", "litresPerMinuteToGpm", 100, 378.5411784],
  ["feetToMetres", "metresToFeet", 50, 15.24],
  ["inchesToMillimetres", "millimetresToInches", 1.75, 44.45],
  ["gallonsToLitres", "litresToGallons", 1000, 3785.411784],
  ["lbfToNewtons", "newtonsToLbf", 100, 444.82216152605],
  ["lbfToKgf", "kgfToLbf", 100, 45.359237],
  ["feetPerSecondToMetresPerSecond", "metresPerSecondToFeetPerSecond", 10, 3.048]
]) {
  test(`${forward} / ${reverse}: independent known values, signed, zero, precision`, () => {
    near(U[forward](canonical), converted);
    near(U[reverse](converted), canonical);
    near(U[reverse](U[forward](canonical + 0.123456789)), canonical + 0.123456789);
    near(U[forward](-canonical), -converted);
    assert.equal(U[forward](0), 0);
    for (const invalid of ["45 mm", "1.75", "dual3", "", null, NaN, Infinity]) assert.throws(() => U[forward](invalid), TypeError);
  });
}

test("quantity adapters and metric formatting stay separate from canonical precision", () => {
  for (const quantity of ["pressure", "flow", "length", "diameter", "volume", "force", "velocity"]) {
    for (const p of [U.DEFAULTS, metric, { ...metric, metricPressureUnit: "kpa", metricReactionUnit: "kgf" }]) {
      near(U.toCanonical(U.fromCanonical(123.456789, quantity, p), quantity, p), 123.456789);
    }
    assert.equal(U.fromCanonical(123.456789, quantity, U.DEFAULTS), 123.456789);
  }
  assert.equal(U.formatMetric(100, "pressure", metric, { digits: 2 }), "6.89 bar");
  assert.equal(U.formatMetric(100, "pressure", { ...metric, metricPressureUnit: "kpa" }, { digits: 1 }), "689.5 kPa");
  assert.equal(U.formatMetric(100, "force", { ...metric, metricReactionUnit: "kgf" }, { digits: 2 }), "45.36 kgf");
  assert.equal(U.displayUnit("force", metric), "N");
  assert.throws(() => U.formatMetric(100, "pressure", U.DEFAULTS, { digits: 2 }));
  assert.throws(() => U.formatMetric(100, "pressure", metric));
  assert.throws(() => U.fromCanonical(1, "coefficient", metric));
});

test("every nominal label preserves actual catalog identities, coefficients, and hydraulics", () => {
  const context = vm.createContext({ localStorage: storage() });
  vm.runInContext(fs.readFileSync(require.resolve("../www/js/constants"), "utf8") +
    fs.readFileSync(require.resolve("../www/js/data/hydraulics"), "utf8"), context);
  const hoses = vm.runInContext("getSupportedHoseEquipmentOptions()", context);
  const before = JSON.stringify(hoses);
  const labels = { "1": "25 mm", "1.5": "38 mm", "1.75": "45 mm", "1.88": "48 mm", "2": "51 mm", "2.25": "57 mm", "2.5": "64 mm", "3": "76 mm", dual3: "Dual 76 mm", "4": "102 mm", "5": "127 mm" };
  for (const hose of hoses) {
    const loss = H.frictionLoss(hose.coefficient, 185, 200);
    assert.equal(U.factoryHoseLabel(hose, metric), labels[hose.id]);
    assert.equal(U.factoryHoseLabel(hose, U.DEFAULTS), hose.label);
    assert.throws(() => U.millimetresToInches(U.factoryHoseLabel(hose, metric)), TypeError);
    assert.equal(H.frictionLoss(hose.coefficient, 185, 200), loss);
  }
  assert.equal(JSON.stringify(hoses), before);
  assert.equal(U.physicalDiameterLabel(1.75, metric), "44.45 mm");
  assert.equal(U.physicalDiameterLabel(0.875, metric), "22.225 mm");
  near(U.inchesToMillimetres(1.91), 48.514);
  assert.throws(() => U.factoryHoseLabel({ id: "custom-45", label: "Custom" }, metric));
});

function settingsHarness(s) {
  const controls = [];
  for (const [name, values] of Object.entries({ unitSystem: ["us", "metric"], metricPressureUnit: ["bar", "kpa"], metricReactionUnit: ["n", "kgf"] })) {
    for (const value of values) controls.push({ name, value, checked: false, addEventListener(_, fn) { this.change = fn; } });
  }
  const elements = { unitPreferences: { querySelectorAll: () => controls }, metricUnitPreferences: { hidden: true }, unitPreferenceStatus: { textContent: "" } };
  Settings.bind({ getElementById: id => elements[id] }, U, s);
  return { controls, elements, choose(name, value) {
    const control = controls.find(c => c.name === name && c.value === value);
    control.checked = true; control.change();
  } };
}

test("Settings conditionally renders, persists immediately, and retains hidden metric choices", () => {
  const s = storage(); const h = settingsHarness(s);
  assert.equal(h.elements.metricUnitPreferences.hidden, true);
  assert.deepEqual(s.writes, []);
  h.choose("unitSystem", "metric");
  assert.equal(h.elements.metricUnitPreferences.hidden, false);
  h.choose("metricPressureUnit", "kpa"); h.choose("metricReactionUnit", "kgf");
  h.choose("unitSystem", "us");
  assert.equal(h.elements.metricUnitPreferences.hidden, true);
  const reloaded = settingsHarness(s);
  reloaded.choose("unitSystem", "metric");
  assert.equal(reloaded.controls.find(c => c.value === "kpa").checked, true);
  assert.equal(reloaded.controls.find(c => c.value === "kgf").checked, true);
  s.setItem = () => { throw Error("quota"); };
  const failed = settingsHarness(s); failed.choose("unitSystem", "us");
  assert.match(failed.elements.unitPreferenceStatus.textContent, /Unable to save/);
  assert.equal(failed.elements.metricUnitPreferences.hidden, false);
});

test("repeated unit changes touch no existing persisted bytes and cause no canonical drift", () => {
  const s = storage();
  for (const [key, value] of Object.entries({
    "reverse-flow-calculator-v3": { hoseLength: "157.123456789", pdp: "123", hoseSize: "1.75" },
    "reverse-flow-calculator-presets-v1": [{ calculatedFlow: "185 GPM", hoseSize: "1.75" }],
    "reverse-flow-pump-charts-v2": { charts: [{ result: { primaryResult: "125 PSI" } }] },
    "reverse-flow-attack-pumper-incident-v1": { lines: [{ pdp: 125, gpm: 185, hoseSummary: '200\' of 1.75"' }] },
    "reverse-flow-hose-coefficients-v1": { "1.75": 12.63 },
    reverseFlowCustomHoseProfiles: [{ id: "custom", chargedId50: 1.91, coefficient: 12.63 }],
    reverseFlowDefaultHoseProfiles: { "1.75": { id: "custom" } },
    "reverse-flow-hose-library-selections-v1": { "1.75": { id: "custom" } },
    visibleHoseSizes: ["1.75", "dual3"], visibleSmoothboreTips: ["7/8"]
  })) s.values.set(key, JSON.stringify(value));
  const before = new Map(s.values);
  const canonical = Object.freeze({ length: 157.123456789, diameter: 1.75, pressure: 123.456789 });
  const h = settingsHarness(s);
  for (let i = 0; i < 100; i++) {
    h.choose("unitSystem", "metric");
    const p = U.createPreferenceStore(s).get();
    for (const [quantity, value] of Object.entries(canonical)) U.formatMetric(value, quantity, p, { digits: 2 });
    h.choose("unitSystem", "us");
  }
  for (const [key, value] of before) assert.equal(s.getItem(key), value, key);
  assert.ok(s.writes.every(key => key === U.STORAGE_KEY));
  assert.equal(canonical.length, 157.123456789);
});

test("Settings return session preserves nested state/edit context and is consumed once", () => {
  const s = storage();
  const state = { mode: "wyeOps", hoseSize: "1.75", customCoefficient: "12.63", splitLay: {}, standpipeOps: {}, wyeOps: { attack1CustomTip: "0.912345" } };
  const edit = { chartId: "engine", setupId: "line", originalInputs: { hoseSize: "1.75" } };
  Session.capture(s, state, edit);
  assert.deepEqual(Session.take(s, new Set(["wyeOps"])), { version: 1, state, activePumpChartEdit: edit });
  assert.equal(Session.take(s, new Set(["wyeOps"])), null);
  s.values.set(Session.KEY, "broken");
  assert.equal(Session.take(s, new Set(["wyeOps"])), null);
  assert.equal(s.getItem(Session.KEY), null);
  assert.ok(s.writes.every(key => key === Session.KEY));
});
