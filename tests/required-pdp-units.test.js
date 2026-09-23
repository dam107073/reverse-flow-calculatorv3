const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const U = require("../www/js/units");
const B = require("../www/js/required-pdp-units");
const H = require("../www/js/hydraulics-core");
const source = fs.readFileSync(require.resolve("../www/js/app"), "utf8");
const bar = U.normalizePreferences({ unitSystem: "metric" });
const kpa = { ...bar, metricPressureUnit: "kpa" };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  const body = source.indexOf(") {", start) + 2;
  let depth = 0;
  for (let i = body; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error(name);
}

test("metric explicit edits respect quantities, decimal bar, whole-unit entry, and signs", () => {
  for (const text of ["3.5", "7.0", "7.", ".5"]) {
    const edit = B.parseEdit(text, "customNozzlePressure", bar);
    assert.equal(edit.valid, true); assert.equal(edit.text, text);
    near(Number(edit.canonical), U.barToPsi(Number(text)));
  }
  for (const [id, value, expected] of [["pdp", "700", U.litresPerMinuteToGpm(700)],
    ["hoseLength", "60", U.metresToFeet(60)], ["ratedPressure", "350", U.kpaToPsi(350)]]) {
    near(Number(B.parseEdit(value, id, kpa).canonical), expected);
  }
  near(Number(B.parseEdit("-0.5", "applianceLoss", bar).canonical), U.barToPsi(-0.5));
  for (const field of ["customNozzlePressure", "ratedPressure", "pdp", "hoseLength", "masterStreamLoss"]) {
    assert.equal(B.parseEdit("-1", field, bar).valid, false);
  }
  for (const value of ["3.55", "3..5", "3,5", "NaN", "7 PSI"]) assert.equal(B.parseEdit(value, "customNozzlePressure", bar).valid, false);
  assert.equal(B.parseEdit("3.5", "ratedPressure", kpa).valid, false);
  assert.equal(B.parseEdit("60.5", "hoseLength", bar).valid, false);
  assert.equal(B.parseEdit("", "hoseLength", bar).canonical, "");
});

test("metric increments add actual metres to unrounded physical length", () => {
  near(U.feetToMetres(B.incrementFeet(U.metresToFeet(60), bar)), 75);
  near(B.incrementFeet(200, bar), 200 + U.metresToFeet(15));
  near(B.incrementFeet(200, bar, 25), 200 + U.metresToFeet(10));
  near(B.incrementFeet(200, bar, 100), 200 + U.metresToFeet(30));
  assert.equal(B.incrementFeet(200, U.DEFAULTS), 250);
  assert.equal(B.number(200, "length", bar), "61");
});

function calculate(overrides = {}, stateOverrides = {}) {
  const rendered = [];
  const context = vm.createContext({
    state: { dualLineSupply: false, ...stateOverrides }, requiredPdpResult: null, requiredPdpSnapshot: null,
    window: { ReverseFlowOperationalUnits: B }, ReverseFlowHydraulics: H,
    isFixedFogType: type => type === "fixedFog", fixedFogPressureForFlow: (q, p, flow) => p * (flow / q) ** 2,
    isRequiredPdpMode: () => true, isSplitLayMode:()=>false,isStandpipeOpsMode:()=>false,isPhase2bMode: () => false, isMasterStream: () => !!stateOverrides.master,
    usesSmoothboreHydraulics: () => !!stateOverrides.smooth,
    getSelectedHydraulicSmoothboreModel: () => ({ diameter: 0.875 }),
    isBlade: () => false, isFogHydraulicType: type => type === "automaticFog" || type === "fixedFog",
    getMainNozzleType: () => overrides.nozzleType || "automaticFog",
    getActiveHenTurboCurve: () => null,
    calculateNozzleReaction: (flow, pressure) => `${Math.round(H.fogReaction(flow, pressure))} lb`,
    getNozzleDisplay: () => "Automatic Fog • 50 psi", getSetupDisplay: () => '200\' of 1.75"',
    renderWarnings() {}, validateCommonInputs: ({ hoseLength, coefficient }) => hoseLength > 0 && coefficient > 0,
    setResult: (...args) => rendered.push(args)
  });
  vm.runInContext(extract("calculateRequiredPdp"), context);
  const input = { targetGpm: 185, hoseLength: 200, nozzlePressure: 50, nozzleType: "automaticFog",
    ratedFlow: 185, ratedPressure: 50, applianceLoss: 0, masterStreamLoss: 0, coefficient: 15.5,
    selectedHose: { maxReferenceFlow: 2000, chartName: '1.75"' }, warnings: [], ...overrides };
  context.calculateRequiredPdp(input);
  return { result: context.requiredPdpResult, snapshot: context.requiredPdpSnapshot, rendered, input };
}

for (const [name, input, state] of [
  ["factory fog", {}, {}],
  ["custom coefficient / signed adjustment", { coefficient: 12.63, hoseLength: 350, applianceLoss: -5 }, {}],
  ["short line / high pressure", { hoseLength: 50, nozzlePressure: 100 }, {}],
  ["fixed fog", { nozzleType: "fixedFog", targetGpm: 210, ratedFlow: 185, ratedPressure: 75 }, {}],
  ["smoothbore-derived flow", { targetGpm: Math.round(H.smoothboreFlow(.875, 50)) }, { smooth: true }],
  ["dual master stream", { targetGpm: 1000, hoseLength: 400, coefficient: .2, masterStreamLoss: 25 }, { master: true, dualLineSupply: true }]
]) {
  test(`${name}: actual Required PDP calculation preserves canonical/U.S. results across representations`, () => {
    const x = calculate(input, state);
    const q = x.input.targetGpm / (state.dualLineSupply ? 2 : 1);
    const np = x.input.nozzleType === "fixedFog" ? x.input.ratedPressure * (x.input.targetGpm / x.input.ratedFlow) ** 2 : x.input.nozzlePressure;
    const fl = x.input.coefficient * (q / 100) ** 2 * (x.input.hoseLength / 100);
    near(x.result.requiredPdpPsi, np + fl + x.input.applianceLoss + x.input.masterStreamLoss);
    assert.equal(x.rendered[0][0], Math.round(x.result.requiredPdpPsi));
    assert.equal(x.rendered[0][1], `${Math.round(x.input.targetGpm)} GPM`);
    assert.equal(x.rendered[0][2], `${fl.toFixed(1)} psi`);
    const canonical = JSON.stringify(x.result);
    const saved = JSON.stringify(x.snapshot);
    for (let i = 0; i < 50; i++) {
      for (const p of [bar, kpa]) {
        assert.equal(B.number(x.result.roundedPdpPsi, "pressure", p), U.fromCanonical(x.result.roundedPdpPsi, "pressure", p).toFixed(p.metricPressureUnit === "bar" ? 1 : 0));
        B.format(x.result.flowGpm, "flow", p); B.format(x.result.hoseLengthFeet, "length", p);
      }
    }
    assert.equal(JSON.stringify(x.result), canonical);
    assert.equal(JSON.stringify(x.snapshot), saved);
    assert.equal(x.snapshot.calculatedPdp, String(Math.round(x.result.requiredPdpPsi)));
    assert.equal(x.snapshot.canonicalRequiredPdp.flowGpm, x.input.targetGpm);
  });
}

test("saved snapshots are canonical even if every result DOM field contains metric text", () => {
  const x = calculate();
  const context = vm.createContext({
    isRequiredPdpMode: () => true, isSplitLayMode:()=>false,isStandpipeOpsMode:()=>false,isPhase2bMode: () => false, requiredPdpSnapshot: x.snapshot,
    els: new Proxy({}, { get() { throw Error("Required PDP persistence must not read DOM"); } }),
    buildLegacyPresetSummary: () => "Canonical summary"
  });
  vm.runInContext(extract("captureCurrentResultSnapshot"), context);
  const saved = context.captureCurrentResultSnapshot({});
  assert.equal(saved.primaryResult, "156 PSI");
  assert.equal(saved.calculatedFlow, "185 GPM");
  near(saved.canonicalRequiredPdp.requiredPdpPsi, 156.0975);
});

test("metric labels keep nominal hose categories separate from nozzle physical diameters", () => {
  const state = { hoseLength: "200", nozzleType: "smoothbore", nozzlePressure: "50" };
  assert.match(B.metricSetup(state, { id: "1.75", label: '1.75"' }, bar), /61 m of 45 mm/);
  assert.match(B.metricNozzle(state, null, { diameter: .875 }, null, bar), /22.225 mm SB @ 3.4 bar/);
  assert.match(B.metricWarning("Turbo Published Range: 150–190 GPM", { id: "1.75", chartName: '1.75"' }, bar), /568–719 L\/min/);
});
