const test = require("node:test");
const assert = require("node:assert/strict");
const packageApi = require("../www/js/pump-operator-package.js");

function makeSetup(id, name = `Setup ${id}`) {
  return {
    id: String(id),
    name,
    gpm: "185",
    hoseSize: '1.75"',
    hoseLength: "200",
    frictionLoss: "35",
    nozzle: "Smoothbore",
    nozzlePressure: "50",
    appliance: "-",
    elevation: "0",
    pdp: "85"
  };
}

function makeData(overrides = {}) {
  return {
    chartName: "Engine 1",
    generatedAt: "2026-07-18T12:00:00.000Z",
    setups: [makeSetup(1), makeSetup(2), makeSetup(3)],
    hoses: [
      { id: "1.75", label: "1.75", coefficient: 15.5 },
      { id: "2.5", label: "2.5", coefficient: 2 },
      { id: "5", label: "5", coefficient: 0.08 }
    ],
    tips: [
      { id: "7/8", label: '7/8"', diameter: 0.875 },
      { id: "1", label: '1"', diameter: 1 },
      { id: "1-1/4", label: '1 1/4"', diameter: 1.25 },
      { id: "1-1/2", label: '1 1/2"', diameter: 1.5 }
    ],
    ...overrides
  };
}

test("setup name validation accepts 28 characters and rejects 29 without truncating", () => {
  const valid = "A".repeat(28);
  const invalid = "B".repeat(29);
  assert.equal(packageApi.validateSetupName(valid).ok, true);
  assert.equal(packageApi.validateSetupName(invalid).ok, false);
  assert.equal(packageApi.validateSetupName(invalid).name, invalid);
});

test("export selection blocks zero selections and selected legacy over-limit names", () => {
  const legacy = makeSetup("legacy", "L".repeat(29));
  const setups = [makeSetup("one"), legacy];
  assert.equal(packageApi.validateExportSelection(setups, []).ok, false);
  const result = packageApi.validateExportSelection(setups, ["legacy"]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.overLimit.map(setup => setup.id), ["legacy"]);
  assert.equal(legacy.name, "L".repeat(29));
});

test("selected setup subsets preserve chart order without sorting", () => {
  const setups = [makeSetup("charlie"), makeSetup("alpha"), makeSetup("bravo")];
  const selected = packageApi.selectSetupsInChartOrder(setups, ["bravo", "charlie"]);
  assert.deepEqual(selected.map(setup => setup.id), ["charlie", "bravo"]);
});

test("export selection enforces the six-setup operational limit without changing the selection", () => {
  const setups = Array.from({ length: 7 }, (_, index) => makeSetup(index + 1));
  const sixIds = setups.slice(0, 6).map(setup => setup.id);
  assert.equal(packageApi.MAX_EXPORT_SETUPS, 6);
  assert.equal(packageApi.validateExportSelection(setups, sixIds).ok, true);

  const result = packageApi.validateExportSelection(setups, setups.map(setup => setup.id));
  assert.equal(result.ok, false);
  assert.equal(result.limitExceeded, true);
  assert.equal(result.selected.length, 7);
  assert.match(result.message, /no more than 6 setups/i);
});

test("standard layout is two letter-size pages with all hero elements protected", () => {
  const model = packageApi.createLayoutModel(makeData());
  assert.equal(model.pageCount, 2);
  assert.equal(model.pages[0].kind, "operational");
  assert.equal(model.pages[0].worksheet, true);
  assert.equal(model.pages[0].setupRows.length, 3);
  assert.equal(model.pages[1].kind, "hydraulic");
  assert.equal(model.frictionLossChartPageNumber, 2);
  assert.equal(model.frictionLossChartSplit, false);
  assert.equal(model.pages[0].referenceModules.length, 2);
  assert.equal(model.pages[1].referenceModules.length, 2);
  assert.deepEqual(model.omittedReferenceModules, []);
});

test("dense reference configuration remains two pages and omits lower-priority references", () => {
  const hoses = Array.from({ length: 11 }, (_, index) => ({
    id: String(index),
    label: String(index + 1),
    coefficient: 0.08 + index
  }));
  const tips = Array.from({ length: 19 }, (_, index) => ({
    id: String(index),
    label: `${index + 1}/16\"`,
    diameter: 0.75 + index * 0.0625
  }));
  const setups = Array.from({ length: 5 }, (_, index) => makeSetup(index + 1));
  const model = packageApi.createLayoutModel(makeData({ setups, hoses, tips }));
  assert.equal(model.pageCount, 2);
  assert.equal(model.pages[0].kind, "operational");
  assert.equal(model.pages[1].kind, "hydraulic");
  assert.equal(model.pages[1].hoses.length, 11);
  assert.equal(model.pages[1].tips.length, 19);
  assert.deepEqual(model.pages[0].referenceModules, []);
  assert.deepEqual(model.pages[1].referenceModules, []);
  assert.deepEqual(model.omittedReferenceModules, [
    "Appliance Loss Guide",
    "Additional Water Available",
    "Common Formulas",
    "Dry Standpipe Quick Reference"
  ]);
  assert.equal(model.frictionLossChartSplit, false);
});

test("maximum realistic setup selection stays on Page 1 and preserves order", () => {
  const setups = Array.from({ length: 6 }, (_, index) =>
    makeSetup(index + 1, index % 3 === 0 ? `Maximum Length Setup ${String(index).padStart(2, "0")}` : `Setup ${index + 1}`)
  );
  const model = packageApi.createLayoutModel(makeData({ setups }));
  assert.equal(model.pageCount, 2);
  assert.equal(model.pages[0].kind, "operational");
  assert.equal(model.pages[1].kind, "hydraulic");
  assert.equal(model.firstHydraulicPageNumber, 2);
  assert.deepEqual(
    model.pages[0].setupRows.map(setup => setup.id),
    setups.map(setup => setup.id)
  );
  assert.deepEqual(model.omittedReferenceModules, ["Appliance Loss Guide", "Additional Water Available"]);
});

test("rendered package contains five worksheet rows, exact formulas, and no removed modules", () => {
  const model = packageApi.createLayoutModel(makeData({ chartName: "Banana" }));
  const html = packageApi.renderPackageHtml(model);
  assert.match(html, />Banana</);
  assert.match(html, />1000</);
  assert.match(html, /Handline Smoothbore \(50 PSI\)/);
  assert.match(html, /Masterstream Smoothbore \(80 PSI\)/);
  const smoothboreHtml = html.match(/<section class="rf-pop-section rf-pop-smoothbore[\s\S]*?<\/section>/)?.[0] || "";
  const [handlineHtml, masterStreamHtml] = smoothboreHtml.split("Masterstream Smoothbore (80 PSI)");
  assert.match(handlineHtml, /7\/8&quot;/);
  assert.match(handlineHtml, /1 1\/4&quot;/);
  assert.doesNotMatch(handlineHtml, /1 1\/2&quot;/);
  assert.doesNotMatch(masterStreamHtml, /7\/8&quot;/);
  assert.match(masterStreamHtml, /1 1\/4&quot;/);
  assert.match(masterStreamHtml, /1 1\/2&quot;/);
  assert.equal((html.match(/<tr><td><\/td><td><\/td><td><\/td><td><\/td><td><\/td><td><\/td><td><\/td><td><\/td><td><\/td><\/tr>/g) || []).length, 5);
  assert.match(html, /FL = C × \(Q ÷ 100\)<sup>2<\/sup> × \(L ÷ 100\)/);
  assert.match(html, /GPM = 29\.7 × d<sup>2<\/sup> × √NP/);
  assert.match(html, /NR = 1\.57 × d<sup>2<\/sup> × NP/);
  assert.match(html, /NR = 0\.0505 × GPM × √NP/);
  assert.doesNotMatch(html, /Inline Foam Eductor|Relay Pumping|Pressure Adjustments|Typical Nozzle Pressures|Class A Foam Settings/);
});
