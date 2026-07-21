const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const packageApi = require("../www/js/pump-operator-package.js");

const appSource = fs.readFileSync(path.join(__dirname, "../www/js/app.js"), "utf8");
const componentsCss = fs.readFileSync(path.join(__dirname, "../www/css/components.css"), "utf8");
const responsiveCss = fs.readFileSync(path.join(__dirname, "../www/css/responsive.css"), "utf8");

function readAppFunction(name, nextName) {
  const start = appSource.indexOf(`function ${name}`);
  const asyncStart = appSource.indexOf(`async function ${name}`);
  const resolvedStart = asyncStart >= 0 ? asyncStart : start;
  const end = appSource.indexOf(`async function ${nextName}`, resolvedStart + 1);
  assert.notEqual(resolvedStart, -1, `${name} should exist in app.js`);
  assert.notEqual(end, -1, `${nextName} should follow ${name} in app.js`);
  return appSource.slice(resolvedStart, end);
}

function readStandaloneFunction(name) {
  const start = appSource.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist in app.js`);
  const parametersStart = appSource.indexOf("(", start);
  let parameterDepth = 0;
  let bodyStart = -1;
  for (let index = parametersStart; index < appSource.length; index += 1) {
    if (appSource[index] === "(") parameterDepth += 1;
    if (appSource[index] === ")") parameterDepth -= 1;
    if (parameterDepth === 0) {
      bodyStart = appSource.indexOf("{", index);
      break;
    }
  }
  assert.notEqual(bodyStart, -1, `${name} body should exist in app.js`);
  let depth = 0;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    if (appSource[index] === "{") depth += 1;
    if (appSource[index] === "}") depth -= 1;
    if (depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`Unable to read ${name} from app.js`);
}

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
    pdp: "85",
    hydraulicStructure: {
      confidence: "confident",
      supplySections: [],
      attackSections: [{ hoseSize: '1.75"', hoseLength: "200", frictionLoss: "35" }]
    }
  };
}

function withStructure(setup, supplyCount, attackCount, confidence = "confident") {
  return {
    ...setup,
    hydraulicStructure: {
      confidence,
      supplySections: Array.from({ length: supplyCount }, (_, index) => ({
        hoseSize: '3"', hoseLength: String(500 + index * 100), frictionLoss: "18"
      })),
      attackSections: Array.from({ length: attackCount }, (_, index) => ({
        hoseSize: '1.75"', hoseLength: String(200 + index * 50), frictionLoss: "32"
      }))
    }
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

test("setup classification uses hydraulic section counts and fails closed for ambiguity", () => {
  assert.equal(packageApi.classifySetupStructure(withStructure(makeSetup(1), 0, 1)).className, "simple");
  assert.equal(packageApi.classifySetupStructure(withStructure(makeSetup(2), 1, 1)).className, "simple");
  assert.equal(packageApi.classifySetupStructure(withStructure(makeSetup(3), 2, 1)).className, "complex");
  assert.equal(packageApi.classifySetupStructure(withStructure(makeSetup(4), 1, 2)).className, "complex");
  assert.equal(packageApi.classifySetupStructure(withStructure(makeSetup(5), 0, 0)).exportable, false);
  assert.equal(packageApi.classifySetupStructure(withStructure(makeSetup(6), 0, 1, "ambiguous")).exportable, false);
});

test("classification is independent of calculator type", () => {
  const structure = withStructure(makeSetup("same"), 1, 1).hydraulicStructure;
  assert.equal(packageApi.classifySetupStructure({ id: "a", mode: "futureManifold", hydraulicStructure: structure }).className, "simple");
  assert.equal(packageApi.classifySetupStructure({ id: "b", mode: "reverse", hydraulicStructure: structure }).className, "simple");
});

test("selector state keeps complex setups visible and excludes them from the six-simple limit", () => {
  const simple = Array.from({ length: 7 }, (_, index) => withStructure(makeSetup(`s${index + 1}`), 0, 1));
  const complex = withStructure(makeSetup("complex"), 1, 2);
  const selectedIds = [...simple.slice(0, 6).map(setup => setup.id), complex.id];
  const states = packageApi.getExportSelectionState([...simple, complex], selectedIds);

  assert.equal(states.length, 8);
  assert.equal(states.filter(state => state.selected).length, 6);
  assert.equal(states[6].disabledReason, "limit");
  assert.equal(states[7].disabledReason, "complex");
  assert.equal(states[7].selected, false);
});

test("programmatic complex selection is rejected before export payload creation", () => {
  const simple = withStructure(makeSetup("simple"), 0, 1);
  const complex = withStructure(makeSetup("complex"), 1, 2);
  const result = packageApi.validateExportSelection([simple, complex], [simple.id, complex.id]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.selected.map(setup => setup.id), ["simple"]);
  assert.deepEqual(result.ineligible.map(setup => setup.id), ["complex"]);
});

test("hose paths and section friction loss use the normalized structured model", () => {
  const attackOnly = withStructure(makeSetup("attack"), 0, 1).hydraulicStructure;
  const supplyAndAttack = withStructure(makeSetup("both"), 1, 1).hydraulicStructure;
  assert.equal(packageApi.formatHosePath(attackOnly), `1.75" × 200'`);
  assert.equal(packageApi.formatHosePath(supplyAndAttack), `3" × 500' → 1.75" × 200'`);
  assert.equal(packageApi.formatSectionFrictionLoss(attackOnly), "32");
  assert.equal(packageApi.formatSectionFrictionLoss(supplyAndAttack), "S 18\nA 32");
});

test("Standpipe export maps saved supply and attack hose FL without using system loss", () => {
  const adapterSource = appSource.slice(
    appSource.indexOf("function getPumpOperatorNumericValue"),
    appSource.indexOf("function getPumpOperatorSetupCandidate")
  );
  const context = {};
  vm.runInNewContext(`${adapterSource}; this.getPumpOperatorHydraulicStructure = getPumpOperatorHydraulicStructure;`, context);
  const setup = {
    mode: "standpipeOps",
    inputs: {
      standpipeOps: {
        supplyHoseSize: "3",
        supplyLength: "50",
        dualSupply: false,
        attack1HoseSize: "2.5",
        attack1Length: "100",
        attack2Enabled: false
      }
    },
    result: {
      splitSupplyLoss: "—",
      splitAttack1FlResult: "—",
      standpipeSupplyLoss: "0.4 psi",
      standpipeAttack1FlResult: "8.0 psi",
      standpipeLossResult: "25 psi"
    }
  };
  const structure = context.getPumpOperatorHydraulicStructure(setup);
  assert.equal(structure.confidence, "confident");
  assert.equal(structure.supplySections[0].frictionLoss, "0.4");
  assert.equal(structure.attackSections[0].frictionLoss, "8.0");
  assert.equal(packageApi.formatSectionFrictionLoss(structure), "S 0.4\nA 8.0");
  assert.notEqual(structure.supplySections[0].frictionLoss, "25");
  assert.notEqual(structure.attackSections[0].frictionLoss, "25");
});

test("Standpipe elevation uses the live floor convention and survives saved-result normalization", () => {
  const context = {
    numberOrNull: value => value === "" || value === null || value === undefined
      ? null
      : Number.isFinite(Number(value)) ? Number(value) : null
  };
  vm.runInNewContext([
    readStandaloneFunction("getStandpipeElevationPressure"),
    readStandaloneFunction("getApparatusElevationPressure"),
    readStandaloneFunction("normalizePumpChartResult")
  ].join("\n"), context);

  assert.equal(context.getStandpipeElevationPressure("1"), 0);
  assert.equal(context.getStandpipeElevationPressure("3"), 10);
  assert.equal(context.getStandpipeElevationPressure("8"), 35);
  assert.equal(context.getStandpipeElevationPressure("0"), null);
  assert.equal(context.getStandpipeElevationPressure("-2"), null);
  assert.equal(context.getStandpipeElevationPressure(""), null);

  const saved = {
    mode: "standpipeOps",
    inputs: { standpipeOps: { attack1Floor: "3", attack2Enabled: false } },
    result: { pdpSummary: "143 PSI", calculatedPdp: "143" }
  };
  const reloaded = JSON.parse(JSON.stringify(saved));
  reloaded.result = context.normalizePumpChartResult(
    reloaded.mode,
    reloaded.inputs,
    reloaded.result
  );
  assert.equal(reloaded.inputs.standpipeOps.attack1Floor, "3");
  assert.equal(reloaded.result.standpipeAttack1ElevationResult, "10 psi");
  assert.equal(reloaded.result.standpipePrimaryPdp, "143 PSI");

  const firstFloor = context.normalizePumpChartResult(
    "standpipeOps",
    { standpipeOps: { attack1Floor: "1" } },
    { standpipePrimaryPdp: "132 PSI" }
  );
  assert.equal(firstFloor.standpipeAttack1ElevationResult, "0 psi");

  const missingLegacy = context.normalizePumpChartResult(
    "standpipeOps",
    { standpipeOps: {} },
    { calculatedPdp: "132" }
  );
  assert.equal(missingLegacy.standpipeAttack1ElevationResult, undefined);
});

test("Standpipe package row exposes saved elevation pressure and exact authoritative PDP", () => {
  const source = readStandaloneFunction("getPumpOperatorSetupRow");
  const context = {
    window: { ReverseFlowPumpOperatorPackage: packageApi },
    getPumpOperatorHydraulicStructure: () => ({
      confidence: "confident",
      supplySections: [{ hoseSize: "3", hoseLength: "50", frictionLoss: "0.4" }],
      attackSections: [{ hoseSize: "2.5", hoseLength: "100", frictionLoss: "8.0" }]
    }),
    formatHoseSize: value => value,
    getNozzlePressureSummary: () => "50 psi",
    getSetupPdpSummary: () => "999 PSI",
    getPumpOperatorNumericValue: value => {
      const match = String(value || "").match(/-?\d+(?:\.\d+)?/);
      return match ? match[0] : "";
    },
    getPumpOperatorNozzleLabel: () => "Fixed Fog"
  };
  const getRow = vm.runInNewContext(`${source}; getPumpOperatorSetupRow`, context);
  const row = getRow({
    id: "standpipe-third-floor",
    name: "Third Floor Standpipe",
    mode: "standpipeOps",
    inputs: { standpipeOps: { attack1Floor: "3" } },
    result: {
      flowSummary: "185 GPM",
      standpipeAttack1NpResult: "50 psi",
      standpipeAttack1ElevationResult: "10 psi",
      standpipePrimaryPdp: "143 PSI",
      pdpSummary: "143 PSI"
    }
  });
  assert.equal(row.elevation, "10");
  assert.equal(row.pdp, "143");
  assert.equal(row.frictionLoss, "S 0.4\nA 8.0");
});

test("apparatus-mounted elevation exports calculated pressure while other setups stay unchanged", () => {
  const context = {
    numberOrNull: value => value === "" || value === null || value === undefined
      ? null
      : Number.isFinite(Number(value)) ? Number(value) : null
  };
  vm.runInNewContext([
    readStandaloneFunction("getStandpipeElevationPressure"),
    readStandaloneFunction("getApparatusElevationPressure"),
    readStandaloneFunction("normalizePumpChartResult")
  ].join("\n"), context);

  const apparatus = context.normalizePumpChartResult(
    "apparatusMounted",
    { apparatusElevation: "30" },
    { pdpSummary: "88 PSI" }
  );
  assert.equal(apparatus.apparatusElevationLoss, "13.0 psi");
  assert.equal(apparatus.pdpSummary, "88 PSI");

  const ordinary = { pdpSummary: "85 PSI", totalFl: "35 psi" };
  const unchanged = context.normalizePumpChartResult(
    "requiredPdp",
    { applianceLoss: "0" },
    ordinary
  );
  assert.deepEqual({ ...unchanged }, ordinary);
});

test("live Standpipe and apparatus calculations share the export elevation helpers", () => {
  const standpipeSource = readStandaloneFunction("calculateStandpipeAttackLine");
  const standpipeOpsSource = readStandaloneFunction("calculateStandpipeOps");
  const apparatusSource = readStandaloneFunction("calculateApparatusMounted");
  const snapshotSource = readStandaloneFunction("captureCurrentResultSnapshot");
  assert.match(standpipeSource, /getStandpipeElevationPressure\(floor\)/);
  assert.doesNotMatch(standpipeSource, /\(floor - 1\) \* 5/);
  assert.match(standpipeSource, /requiredPdp = nozzlePressure \+ totalFl \+ elevationLoss/);
  assert.match(standpipeOpsSource, /highestAttackSidePdp \+\s*standpipeLoss \+\s*supplyTotalFl/);
  assert.match(apparatusSource, /getApparatusElevationPressure\(elevationFeet\)/);
  assert.match(snapshotSource, /standpipeAttack1ElevationResult/);
  assert.match(snapshotSource, /standpipePrimaryPdp/);
  assert.match(snapshotSource, /apparatusElevationLoss/);
});

test("legacy Standpipe export with missing saved hose FL fails safely", () => {
  const adapterSource = appSource.slice(
    appSource.indexOf("function getPumpOperatorNumericValue"),
    appSource.indexOf("function getPumpOperatorSetupCandidate")
  );
  const context = {};
  vm.runInNewContext(`${adapterSource}; this.getPumpOperatorHydraulicStructure = getPumpOperatorHydraulicStructure;`, context);
  const structure = context.getPumpOperatorHydraulicStructure({
    mode: "standpipeOps",
    inputs: {
      standpipeOps: {
        supplyHoseSize: "3",
        supplyLength: "50",
        attack1HoseSize: "2.5",
        attack1Length: "100",
        attack2Enabled: false
      }
    },
    result: { standpipeLossResult: "25 psi" }
  });
  assert.equal(packageApi.formatSectionFrictionLoss(structure), "S —\nA —");
});

test("non-Standpipe no-supply and one-supply FL normalization is unchanged", () => {
  const adapterSource = appSource.slice(
    appSource.indexOf("function getPumpOperatorNumericValue"),
    appSource.indexOf("function getPumpOperatorSetupCandidate")
  );
  const context = {};
  vm.runInNewContext(`${adapterSource}; this.getPumpOperatorHydraulicStructure = getPumpOperatorHydraulicStructure;`, context);
  const attackOnly = context.getPumpOperatorHydraulicStructure({
    mode: "requiredPdp",
    inputs: { hoseSize: "1.75", hoseLength: "200", reverseSupplyEnabled: false },
    result: { totalFl: "32 psi" }
  });
  const oneSupply = context.getPumpOperatorHydraulicStructure({
    mode: "requiredPdp",
    inputs: {
      hoseSize: "1.75",
      hoseLength: "200",
      reverseSupplyEnabled: true,
      reverseSupplyHoseSize: "3",
      reverseSupplyLength: "500"
    },
    result: { supplyFrictionLoss: "18 psi", attackFrictionLoss: "32 psi" }
  });
  assert.equal(packageApi.formatSectionFrictionLoss(attackOnly), "32");
  assert.equal(packageApi.formatSectionFrictionLoss(oneSupply), "S 18\nA 32");
});

test("appliance export uses only explicit saved operational appliance data", () => {
  assert.equal(packageApi.formatSavedAppliance({
    mode: "reverse",
    inputs: { reverseSupplyEnabled: false, reverseSupplyAppliance: "gateValve" }
  }), "");
  assert.equal(packageApi.formatSavedAppliance({
    mode: "reverse",
    inputs: { reverseSupplyEnabled: true, reverseSupplyAppliance: "gateValve" }
  }), "Gate Valve");
  assert.equal(packageApi.formatSavedAppliance({
    mode: "splitLay",
    inputs: { splitLay: { appliance1: "gatedWye" } }
  }), "Gated Wye");
  assert.equal(packageApi.formatSavedAppliance({
    mode: "reverse",
    inputs: { reverseSupplyEnabled: true }
  }), "");
  assert.equal(packageApi.formatSavedAppliance({
    mode: "gateValve",
    inputs: { nozzleType: "gateValve", reverseSupplyEnabled: false }
  }), "");
  assert.equal(packageApi.formatSavedAppliance({
    mode: "standpipeOps",
    inputs: { nozzleType: "gatedWye", standpipeOps: {} }
  }), "");
});

test("six attack-only, six supply-and-attack, and mixed simple rows retain their hydraulic fields", () => {
  const variants = [
    Array.from({ length: 6 }, (_, index) => withStructure(makeSetup(`attack-${index}`), 0, 1)),
    Array.from({ length: 6 }, (_, index) => withStructure(makeSetup(`supply-${index}`), 1, 1)),
    Array.from({ length: 6 }, (_, index) => withStructure(makeSetup(`mixed-${index}`), index % 2, 1))
  ];

  variants.forEach(setups => {
    const rows = setups.map(setup => ({
      ...setup,
      hose: packageApi.formatHosePath(setup.hydraulicStructure),
      frictionLoss: packageApi.formatSectionFrictionLoss(setup.hydraulicStructure)
    }));
    const model = packageApi.createLayoutModel(makeData({ setups: rows }));
    assert.equal(model.pages[0].setupRows.length, 6);
    assert.equal(model.pages[0].setupRows.every(row => row.hose && row.frictionLoss), true);
    assert.equal(model.pageCount, 2);
  });
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
  assert.match(result.message, /no more than 6 simple setups/i);
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

test("rendered package contains four seven-column worksheet rows, exact formulas, and no removed modules", () => {
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
  assert.match(html, /GPM \/<br>Tip Size<\/th><th>Nozzle<br>Pressure<\/th><th>Hose<\/th><th>FL<\/th><th>Appliance<\/th><th>Elevation<\/th><th>PDP<\/th>/);
  assert.equal((html.match(/<tr><td><\/td><td><\/td><td><\/td><td><\/td><td><\/td><td><\/td><td><\/td><\/tr>/g) || []).length, 4);
  assert.match(html, /FL = C × \(Q ÷ 100\)<sup>2<\/sup> × \(L ÷ 100\)/);
  assert.match(html, /GPM = 29\.7 × d<sup>2<\/sup> × √NP/);
  assert.match(html, /NR = 1\.57 × d<sup>2<\/sup> × NP/);
  assert.match(html, /NR = 0\.0505 × GPM × √NP/);
  assert.doesNotMatch(html, /Inline Foam Eductor|Relay Pumping|Pressure Adjustments|Typical Nozzle Pressures|Class A Foam Settings/);
});

test("operational export uses combined Hose and FL columns without changing page dimensions", () => {
  const model = packageApi.createLayoutModel(makeData({
    setups: [{
      ...makeSetup("path"),
      hose: `3" × 500' → 1.75" × 200'`,
      frictionLoss: "S 18\nA 32"
    }]
  }));
  const html = packageApi.renderPackageHtml(model);
  assert.match(html, />Hose<\/th>/);
  assert.doesNotMatch(html, />Hose Size<\/th>|>Hose Length<\/th>/);
  assert.match(html, /rf-pop-hose-content"><span class="rf-pop-hose-section">3&quot; × 500&#039;<\/span>/);
  assert.match(html, /rf-pop-hose-arrow"> → <\/span>/);
  assert.match(html, /rf-pop-hose-section">1\.75&quot; × 200&#039;<\/span>/);
  assert.match(html, /rf-pop-fl-stack"><span>S 18<\/span><span>A 32<\/span>/);
  assert.equal(packageApi.PAGE_WIDTH_PX, 816);
  assert.equal(packageApi.PAGE_HEIGHT_PX, 1056);
  assert.equal(model.pageCount, 2);
});

test("setup and worksheet widths are balanced without globally shrinking hose text", () => {
  const styles = packageApi.PAGE_STYLES;
  assert.match(styles, /rf-pop-worksheet th:nth-child\(1\)\{width:13%\}/);
  assert.match(styles, /rf-pop-worksheet th:nth-child\(3\)\{width:22%\}/);
  assert.match(styles, /rf-pop-worksheet th:nth-child\(7\)\{width:14%\}/);
  assert.match(styles, /rf-pop-setups th:first-child,[^{]+\{width:20%/);
  assert.match(styles, /rf-pop-setups th:nth-child\(3\)\{width:21%\}/);
  assert.match(styles, /rf-pop-setups th:nth-child\(5\)\{width:12%\}/);
  assert.match(styles, /rf-pop-setups th:nth-child\(7\)\{width:9%\}/);
  assert.match(styles, /rf-pop-setups th:nth-child\(9\)\{width:7%\}/);
  assert.match(styles, /rf-pop-cell-hose\.rf-pop-hose-tight,[^{]+\{font-size:9px\}/);
  assert.doesNotMatch(styles, /\.rf-pop-cell-hose\{[^}]*font-size/);
  assert.match(packageApi.mountPackagePages.toString(), /content\.getBoundingClientRect\(\)\.width/);
  assert.match(packageApi.mountPackagePages.toString(), /measuredWidth > availableWidth/);
});

test("common nozzle and appliance labels stay whole with measured local fallback", () => {
  const model = packageApi.createLayoutModel(makeData({
    setups: [
      { ...makeSetup("smooth"), nozzle: 'Smoothbore • 1 3/16"', appliance: "Gate Valve" },
      { ...makeSetup("fixed"), nozzle: "Fixed Fog", appliance: "Gated Wye" },
      { ...makeSetup("automatic"), nozzle: "Automatic Fog", appliance: "" }
    ]
  }));
  const html = packageApi.renderPackageHtml(model);
  assert.match(html, /rf-pop-nowrap-label">SB 1 3\/16&quot;<\/span>/);
  assert.match(html, /rf-pop-nowrap-label">Fixed Fog<\/span>/);
  assert.match(html, /rf-pop-nowrap-label">Automatic Fog<\/span>/);
  assert.match(html, /rf-pop-nowrap-label">Gate Valve<\/span>/);
  assert.match(html, /rf-pop-nowrap-label">Gated Wye<\/span>/);
  assert.match(packageApi.PAGE_STYLES, /rf-pop-nowrap-label\{[^}]*white-space:nowrap/);
  assert.match(packageApi.PAGE_STYLES, /rf-pop-cell-nozzle\.rf-pop-label-tight,[^{]+\{font-size:9px\}/);
  assert.match(packageApi.mountPackagePages.toString(), /rf-pop-cell-nozzle, \.rf-pop-cell-appliance/);
});

test("smoothbore setup labels use concise export-only SB typography", () => {
  assert.equal(packageApi.formatSmoothboreNozzle('7/8"'), 'SB 7/8"');
  assert.equal(packageApi.formatSmoothboreNozzle('Smoothbore • 15/16"'), 'SB 15/16"');
  assert.equal(packageApi.formatSmoothboreNozzle('SB 1 3/16"'), 'SB 1 3/16"');
  assert.equal(packageApi.formatSmoothboreNozzle('1 1/4"'), 'SB 1¼"');

  const adapterSource = appSource.slice(
    appSource.indexOf("function getPumpOperatorNozzleLabel"),
    appSource.indexOf("function getPumpOperatorSetupRow")
  );
  assert.match(adapterSource, /splitLay\.attack1SmoothboreTip/);
  assert.match(adapterSource, /standpipe\.attack1SmoothboreTip/);
  assert.match(adapterSource, /inputs\.smoothboreTip/);
  assert.match(adapterSource, /packageApi\.formatSmoothboreNozzle/);

  const tipLabels = {
    "7/8": '7/8"',
    "15/16": '15/16"',
    "1-3/16": '1 3/16"',
    "1-1/4": '1 1/4"'
  };
  const context = {
    window: { ReverseFlowPumpOperatorPackage: packageApi },
    normalizeNozzleType: value => value,
    getStandpipeTipLabel: value => tipLabels[value] || "",
    getSplitNozzleConfigurationLabel: () => "Fixed Fog",
    getStandpipeOpsData: setup => setup.inputs.standpipeOps,
    getStandpipeNozzleSummary: () => "Automatic Fog 150 GPM",
    getNozzleConfigurationLabel: () => "Fixed Fog • 150 GPM @ 50 PSI"
  };
  const getLabel = vm.runInNewContext(`${adapterSource}; getPumpOperatorNozzleLabel`, context);
  assert.equal(getLabel({ inputs: { nozzleType: "smoothbore", smoothboreTip: "7/8" } }), 'SB 7/8"');
  assert.equal(getLabel({
    mode: "splitLay",
    inputs: { splitLay: { attack1NozzleType: "smoothbore", attack1SmoothboreTip: "15/16" } }
  }), 'SB 15/16"');
  assert.equal(getLabel({
    mode: "standpipeOps",
    inputs: { standpipeOps: { attack1NozzleType: "smoothbore", attack1SmoothboreTip: "1-3/16" } }
  }), 'SB 1 3/16"');
  assert.equal(getLabel({
    inputs: { nozzleType: "masterstream", masterStreamType: "smoothbore", smoothboreTip: "1-1/4" }
  }), 'SB 1¼"');
  assert.equal(getLabel({ inputs: { nozzleType: "fixedFog" } }), "Fixed Fog");
});

test("empty optional setup values render as em dashes", () => {
  const model = packageApi.createLayoutModel(makeData({
    setups: [{ ...makeSetup("empty"), appliance: "", elevation: "", nozzle: "" }]
  }));
  const html = packageApi.renderPackageHtml(model);
  assert.match(html, /rf-pop-cell-appliance">—<\/td>/);
  assert.match(html, /rf-pop-cell-elevation">—<\/td>/);
  assert.match(html, /rf-pop-cell-nozzle">—<\/td>/);
});

test("setup row adapter does not infer appliance from defaults, calculator type, nozzle type, or manual loss", () => {
  const source = appSource.slice(
    appSource.indexOf("function getPumpOperatorSetupRow"),
    appSource.indexOf("function getPumpOperatorPackageData")
  );
  assert.match(source, /appliance: packageApi\.formatSavedAppliance\(setup\)/);
  assert.doesNotMatch(source, /getApplianceLabel|appliance = "FDC"|hasManualApplianceLoss/);
});

test("ordinary package body content is pinned to the dark print palette", () => {
  const model = packageApi.createLayoutModel(makeData({
    setups: [{
      ...makeSetup("print-color", "Dark Setup Name"),
      hose: `3" × 500' → 1.75" × 200'`,
      frictionLoss: "S 18\nA 32",
      nozzle: "Smoothbore"
    }]
  }));
  const html = packageApi.renderPackageHtml(model);
  const styles = packageApi.PAGE_STYLES;

  assert.equal(packageApi.PRINT_PALETTE.bodyText, "#18202b");
  assert.equal(packageApi.PRINT_PALETTE.pageBackground, "#ffffff");
  assert.match(styles, /\.rf-pop-page\{[^}]*color:#18202b;[^}]*color-scheme:light;[^}]*opacity:1;filter:none/);
  assert.match(styles, /\.rf-pop-page main,[^{]+\{color:#18202b\}/);
  assert.doesNotMatch(styles, /var\(--ink\)|var\(--muted\)|currentColor/);

  assert.match(html, /rf-pop-cell-name">Dark Setup Name/);
  assert.match(html, /rf-pop-cell-hose">/);
  assert.match(html, /rf-pop-cell-frictionLoss"><span class="rf-pop-fl-stack"><span>S 18<\/span><span>A 32<\/span>/);
  assert.match(html, /rf-pop-cell-nozzle"><span class="rf-pop-nowrap-label">SB/);
  assert.match(html, /rf-pop-friction[\s\S]*?<td>15\.5<\/td>/);
  assert.match(html, /rf-pop-smoothbore[\s\S]*?<td>161<\/td>/);
  assert.match(html, /rf-pop-formula-grid[\s\S]*?FL = C ×/);
  assert.match(html, /rf-pop-bullet-groups[\s\S]*?Riser supports/);
});

test("package capture host and clone force the fixed print palette before html2canvas", () => {
  const captureSource = appSource.slice(
    appSource.indexOf("async function createPumpOperatorPackagePngFiles"),
    appSource.indexOf("function readBlobAsDataUrl")
  );
  assert.match(captureSource, /captureHost\.style\.color = packageApi\.PRINT_PALETTE\.bodyText/);
  assert.match(captureSource, /captureHost\.style\.colorScheme = "light"/);
  assert.match(captureSource, /pageClone\.style\.color = packageApi\.PRINT_PALETTE\.bodyText/);
  assert.match(captureSource, /pageClone\.style\.opacity = "1"/);
  assert.match(captureSource, /pageClone\.style\.filter = "none"/);
});

test("selection UI identifies simple scope, explains complex setups, and preserves focus and dark contrast rules", () => {
  assert.match(appSource, /Choose up to \$\{maxSetups\} Simple Setups/);
  assert.match(appSource, /Complex setup<\/b> — Saved and reloadable, but not supported in Pump Chart export/);
  assert.match(appSource, /getExportSelectionState\(setupCandidates, selectedIds\)/);
  assert.match(componentsCss, /\.pump-operator-setup-choice:focus-within/);
  assert.match(componentsCss, /appearance:\s*none/);
  assert.match(componentsCss, /\.pump-operator-setup-choice\.is-complex/);
  assert.match(componentsCss, /\.pump-operator-setup-choice\.is-limit-disabled/);
  assert.match(responsiveCss, /data-resolved-theme="dark"\] \.pump-operator-setup-choice\.is-selected/);
  assert.match(responsiveCss, /data-resolved-theme="dark"\] \.pump-operator-setup-choice\.is-complex/);
});

test("legacy export adapter reads hose fields structurally and fails closed when sections are incomplete", () => {
  const adapterSource = appSource.slice(
    appSource.indexOf("function getPumpOperatorHydraulicStructure"),
    appSource.indexOf("function getPumpOperatorSetupCandidate")
  );
  assert.match(adapterSource, /const nested = inputs\[setup\.mode\] \|\| setup\[setup\.mode\]/);
  assert.match(adapterSource, /confidence: hasCompleteSections \? "confident" : "ambiguous"/);
  assert.match(adapterSource, /nested\.attack1HoseSize, nested\.attack1Length/);
  assert.match(adapterSource, /inputs\.reverseSupplyHoseSize/);
  assert.doesNotMatch(adapterSource, /parse.*(?:hoseSize|hoseLength)/i);
});

test("export result removes the embedded document preview and uses final share wording", () => {
  const previewSource = readAppFunction("renderPumpOperatorPackagePreview", "createPumpOperatorPackagePngFiles");
  assert.doesNotMatch(previewSource, /pump-operator-preview-pages|renderPackageHtml|PAGE_STYLES/);
  assert.match(previewSource, /Change Setups/);
  assert.match(appSource, /pngButton\.textContent = "Share PNG Pages"/);
  assert.match(appSource, /pdfButton\.textContent = "Share PDF"/);
  assert.match(previewSource, /contains.*full-resolution pages/);
});

test("native package sharing writes and shares both PNG files in page order", async () => {
  const shareSource = readAppFunction("sharePumpOperatorPackageFiles", "sharePumpOperatorPackage");
  const writtenPaths = [];
  const shareCalls = [];
  let browserShareCalls = 0;
  const context = {
    getPumpChartSharePlatform: () => ({ supportsNativeFileShare: true, platform: "ios" }),
    blobToBase64Payload: async file => `base64:${file.name}`,
    window: {
      Capacitor: {
        Plugins: {
          Filesystem: {
            writeFile: async options => {
              writtenPaths.push(options.path);
              return { uri: `file:///cache/${options.path}` };
            }
          },
          Share: {
            share: async options => { shareCalls.push(options); }
          }
        }
      },
      setTimeout
    },
    navigator: {
      share: async () => { browserShareCalls += 1; },
      canShare: () => true
    },
    URL,
    document: {}
  };
  const shareFiles = vm.runInNewContext(`${shareSource}; sharePumpOperatorPackageFiles`, context);
  const files = [
    { name: "Engine-1-Pump-Operator-Package-Page-1.png" },
    { name: "Engine-1-Pump-Operator-Package-Page-2.png" }
  ];

  const result = await shareFiles(files, "Engine 1 Pump Operator Package", "pump-operator-packages");

  assert.deepEqual(writtenPaths, [
    "pump-operator-packages/Engine-1-Pump-Operator-Package-Page-1.png",
    "pump-operator-packages/Engine-1-Pump-Operator-Package-Page-2.png"
  ]);
  assert.equal(shareCalls.length, 1);
  assert.deepEqual(Array.from(shareCalls[0].files), [
    "file:///cache/pump-operator-packages/Engine-1-Pump-Operator-Package-Page-1.png",
    "file:///cache/pump-operator-packages/Engine-1-Pump-Operator-Package-Page-2.png"
  ]);
  assert.equal(browserShareCalls, 0);
  assert.deepEqual({ ...result }, { shared: true, downloaded: false });
});

test("native package sharing never falls through to browser sharing", async () => {
  const shareSource = readAppFunction("sharePumpOperatorPackageFiles", "sharePumpOperatorPackage");
  let browserShareCalls = 0;
  const context = {
    getPumpChartSharePlatform: () => ({ supportsNativeFileShare: true, platform: "ios" }),
    blobToBase64Payload: async () => "base64",
    window: { Capacitor: { Plugins: {} }, setTimeout },
    navigator: {
      share: async () => { browserShareCalls += 1; },
      canShare: () => true
    },
    URL,
    document: {}
  };
  const shareFiles = vm.runInNewContext(`${shareSource}; sharePumpOperatorPackageFiles`, context);

  await assert.rejects(
    shareFiles([{ name: "Page-1.png" }, { name: "Page-2.png" }], "Package", "packages"),
    /Native ios share is unavailable/
  );
  assert.equal(browserShareCalls, 0);
});
