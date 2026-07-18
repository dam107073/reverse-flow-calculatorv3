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
      { id: "1", label: '1"', diameter: 1 }
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

test("standard layout is two letter-size pages with all hero elements protected", () => {
  const model = packageApi.createLayoutModel(makeData());
  assert.equal(model.pageCount, 2);
  assert.equal(model.pages[0].kind, "operational");
  assert.equal(model.pages[0].worksheet, true);
  assert.equal(model.pages[0].setupRows.length, 3);
  assert.equal(model.pages[1].kind, "hydraulic");
  assert.equal(model.frictionLossChartPageNumber, 2);
  assert.equal(model.frictionLossChartSplit, false);
});

test("dense reference configuration moves supporting modules to a deterministic third page", () => {
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
  assert.equal(model.pageCount, 3);
  assert.equal(model.pages[0].kind, "operational");
  assert.equal(model.pages[1].kind, "hydraulic");
  assert.equal(model.pages[2].kind, "supplemental");
  assert.equal(model.pages[1].hoses.length, 11);
  assert.equal(model.pages[1].tips.length, 19);
  assert.equal(model.frictionLossChartSplit, false);
});

test("many selected setups use an operational continuation before the intact hydraulic page", () => {
  const setups = Array.from({ length: 24 }, (_, index) =>
    makeSetup(index + 1, index % 3 === 0 ? `Maximum Length Setup ${String(index).padStart(2, "0")}` : `Setup ${index + 1}`)
  );
  const model = packageApi.createLayoutModel(makeData({ setups }));
  assert.equal(model.pages[0].kind, "operational");
  assert.equal(model.pages[1].kind, "operational-continuation");
  assert.equal(model.pages[2].kind, "hydraulic");
  assert.equal(model.firstHydraulicPageNumber, 3);
  assert.deepEqual(
    model.pages.filter(page => page.setupRows).flatMap(page => page.setupRows).map(setup => setup.id),
    setups.map(setup => setup.id)
  );
});

test("rendered hydraulic page reaches 1000 GPM and uses exact Pump Chart name", () => {
  const model = packageApi.createLayoutModel(makeData({ chartName: "Banana" }));
  const html = packageApi.renderPackageHtml(model);
  assert.match(html, />Banana</);
  assert.match(html, />1000</);
  assert.match(html, /Smoothbore 50 PSI/);
  assert.match(html, /Smoothbore 80 PSI/);
  assert.doesNotMatch(html, /Pressure Adjustments|Typical Nozzle Pressures|Class A Foam Settings/);
});
