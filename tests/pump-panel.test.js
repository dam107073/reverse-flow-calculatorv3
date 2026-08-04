const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "www/js/app.js"), "utf8");
const constantsSource = fs.readFileSync(path.join(root, "www/js/constants.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "www/index.html"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "www/css/components.css"), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const bodyStart = appSource.indexOf(") {", start) + 2;
  assert.ok(bodyStart > start + 1, `${name} should have a function body`);

  let depth = 0;
  let opened = false;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    if (appSource[index] === "{") {
      depth += 1;
      opened = true;
    } else if (appSource[index] === "}") {
      depth -= 1;
      if (opened && depth === 0) return appSource.slice(start, index + 1);
    }
  }

  throw new Error(`Could not extract ${name}`);
}

test("Pump Panel is the default fourth carousel calculator in the requested order", () => {
  const carousel = htmlSource.match(/<div class="mode-carousel" id="modeButtons"[\s\S]*?<\/div>/)?.[0] || "";
  const modes = [...carousel.matchAll(/data-mode="([^"]+)"/g)].map(match => match[1]);

  assert.deepEqual(modes, [
    "apparatusMounted",
    "relay",
    "wyeOps",
    "attackPumper",
    "reverse",
    "requiredPdp",
    "splitLay",
    "standpipeOps"
  ]);
  assert.match(appSource, /const DEFAULT_STATE = \{\s*mode: "attackPumper"/);
  assert.match(appSource, /"attackPumper",\s*"requiredPdp"/);
});

test("incident persistence is isolated and only End Incident clears every line", () => {
  assert.match(
    constantsSource,
    /ATTACK_PUMPER_INCIDENT_KEY = "reverse-flow-attack-pumper-incident-v1"/
  );
  assert.match(appSource, /saveAttackPumperIncident\(\{ version: 1, lines: \[\] \}\)/);
  assert.match(appSource, /confirm\("End this incident and remove every active discharge\?"\)/);
  assert.doesNotMatch(functionSource("setMode"), /saveAttackPumperIncident/);
  assert.doesNotMatch(functionSource("closePumpChartModal"), /saveAttackPumperIncident/);
});

test("totals use only sum of GPM and highest PDP", () => {
  const source = `${functionSource("formatAttackPumperNumber")}\n${functionSource("getAttackPumperTotals")}`;
  const context = {
    loadAttackPumperIncident: () => ({ lines: [] })
  };
  vm.runInNewContext(`${source}; this.getAttackPumperTotals = getAttackPumperTotals;`, context);

  const totals = context.getAttackPumperTotals([
    { gpm: 185, pdp: 98 },
    { gpm: 160, pdp: 139 },
    { gpm: 106, pdp: 58 }
  ]);

  assert.equal(totals.totalFlow, 451);
  assert.equal(totals.pumpPressure, 139);
  assert.match(source, /reduce\(\(total, line\) => total \+ \(Number\(line\.gpm\) \|\| 0\), 0\)/);
  assert.match(source, /Math\.max\(highest, Number\(line\.pdp\) \|\| 0\)/);
});

test("compatible selections use normalized saved data instead of calculator origin", () => {
  const snapshotSource = functionSource("getAttackPumperSnapshot");

  assert.doesNotMatch(snapshotSource, /requiredPdp|reverse|relay|splitLay|standpipeOps|wyeOps/);
  assert.match(snapshotSource, /getAttackPumperFrictionLoss/);
  assert.match(snapshotSource, /getAttackPumperPackageSummary/);
  assert.match(snapshotSource, /capturedAt: nowIsoString\(\)/);
  assert.match(snapshotSource, /\bhoseSummary\b/);
});

test("other-calculator setups add and replace while incomplete normalized records fail closed", () => {
  const sources = [
    functionSource("formatAttackPumperNumber"),
    functionSource("normalizeAttackPumperSnapshotText"),
    functionSource("formatAttackPumperPackageSummary"),
    functionSource("getAttackPumperPackageSummary"),
    functionSource("getAttackPumperFrictionLoss"),
    functionSource("normalizePumpChartAccentColorID"),
    functionSource("getAttackPumperSnapshot"),
    functionSource("applyAttackPumperSnapshot")
  ].join("\n");
  let generatedId = 0;
  const context = {
    getPumpOperatorHydraulicStructure: setup => setup.normalizedStructure,
    getPumpOperatorSetupRow: setup => setup.normalizedRow,
    getPumpOperatorNumericValue: value => String(value || "").match(/-?\d+(?:\.\d+)?/)?.[0] || "",
    generatePumpChartId: prefix => `${prefix}-${++generatedId}`,
    nowIsoString: () => "2026-08-04T12:00:00.000Z"
  };
  vm.runInNewContext(
    `${sources}; this.getAttackPumperSnapshot = getAttackPumperSnapshot; this.applyAttackPumperSnapshot = applyAttackPumperSnapshot;`,
    context
  );

  const makeNormalizedSetup = (mode, overrides = {}) => ({
    id: `setup-${mode}`,
    mode,
    accentColorID: mode === "splitLay" ? "blue" : "red",
    normalizedStructure: {
      confidence: "confident",
      supplySections: mode === "splitLay" ? [{ hoseSize: "3", hoseLength: "500", frictionLoss: "12" }] : [],
      attackSections: [{ hoseSize: "1.75", hoseLength: "200", frictionLoss: "32" }]
    },
    normalizedRow: {
      name: `${mode} Setup`,
      gpm: "185",
      pdp: "98",
      frictionLoss: mode === "splitLay" ? "S 12\nA 32" : "32",
      hose: mode === "splitLay" ? `3\" × 500' → 1.75\" × 200'` : `1.75\" × 200'`,
      nozzlePressure: mode === "relay" ? "" : "50",
      ...overrides
    }
  });

  const relaySnapshot = context.getAttackPumperSnapshot(makeNormalizedSetup("relay"));
  const splitSnapshot = context.getAttackPumperSnapshot(makeNormalizedSetup("splitLay"));
  const standpipeSnapshot = context.getAttackPumperSnapshot(makeNormalizedSetup("standpipeOps"));
  const futureSnapshot = context.getAttackPumperSnapshot(makeNormalizedSetup("futureDischargeCalculator"));
  const reverseSnapshot = context.getAttackPumperSnapshot(makeNormalizedSetup("reverse"));
  const requiredPdpSnapshot = context.getAttackPumperSnapshot(makeNormalizedSetup("requiredPdp"));
  const apparatusMounted = makeNormalizedSetup("apparatusMounted", {
    gpm: "1000",
    pdp: "88",
    frictionLoss: "50",
    hose: "—",
    nozzlePressure: "50"
  });
  apparatusMounted.normalizedStructure.confidence = "ambiguous";
  apparatusMounted.result = { setupDisplay: `Deck Gun 1 1/8" SB @ 50 psi` };
  const apparatusSnapshot = context.getAttackPumperSnapshot(apparatusMounted);

  assert.equal(relaySnapshot.sourceMode, "relay");
  assert.equal(relaySnapshot.accentColorID, "red");
  assert.equal(relaySnapshot.hoseSummary, `200' • 1.75\"`);
  assert.equal(splitSnapshot.sourceMode, "splitLay");
  assert.equal(splitSnapshot.accentColorID, "blue");
  assert.equal(splitSnapshot.frictionLoss, "S 12 • A 32");
  assert.equal(splitSnapshot.hoseSummary, `500' • 3\" → 200' • 1.75\" • NP 50`);
  assert.equal(standpipeSnapshot.sourceMode, "standpipeOps");
  assert.equal(futureSnapshot.sourceMode, "futureDischargeCalculator");
  assert.equal(reverseSnapshot.sourceMode, "reverse");
  assert.equal(requiredPdpSnapshot.sourceMode, "requiredPdp");
  assert.equal(apparatusSnapshot.sourceMode, "apparatusMounted");
  assert.equal(apparatusSnapshot.gpm, 1000);
  assert.equal(apparatusSnapshot.pdp, 88);
  assert.equal(apparatusSnapshot.frictionLoss, "38");
  assert.equal(apparatusSnapshot.hoseSummary, `Deck Gun 1 1/8" SB @ 50 psi`);
  assert.match(functionSource("getAttackPumperFrictionLoss"), /structure\?\.confidence === "confident"/);

  let incident = context.applyAttackPumperSnapshot({ version: 1, lines: [] }, relaySnapshot);
  incident = context.applyAttackPumperSnapshot(incident, splitSnapshot);
  const retainedId = incident.lines[0].id;
  incident = context.applyAttackPumperSnapshot(incident, standpipeSnapshot, retainedId);

  assert.equal(incident.lines.length, 2);
  assert.equal(incident.lines[0].id, retainedId);
  assert.equal(incident.lines[0].sourceMode, "standpipeOps");
  assert.equal(incident.lines[1].sourceMode, "splitLay");
  assert.equal(incident.lines[1].accentColorID, "blue");

  const invalidOverrides = [
    { name: "" },
    { gpm: "" },
    { pdp: "" },
    { frictionLoss: "", nozzlePressure: "" },
    { frictionLoss: "S —\nA —", nozzlePressure: "" },
    { hose: "" }
  ];
  invalidOverrides.forEach(overrides => {
    assert.equal(context.getAttackPumperSnapshot(makeNormalizedSetup("relay", overrides)), null);
  });

  const ambiguous = makeNormalizedSetup("standpipeOps");
  ambiguous.normalizedStructure.confidence = "ambiguous";
  assert.equal(context.getAttackPumperSnapshot(ambiguous), null);
});

test("Pump Chart selection override is scoped to Pump Panel and preserves ordinary loading", () => {
  const loaderSource = appSource.match(/window\.loadPumpChartSetup = function[\s\S]*?\n\};/)?.[0] || "";

  assert.match(loaderSource, /if \(attackPumperSelection\)/);
  assert.match(loaderSource, /window\.selectAttackPumperSetup\(chartId, setupId\)/);
  assert.match(loaderSource, /applyPumpChartSetup\(chartId, setupId\)/);
  assert.match(functionSource("closePumpChartModal"), /finishAttackPumperSelectionSession\(\)/);
  assert.match(functionSource("finishAttackPumperSelectionSession"), /restoreAttackPumperScrollPosition\(scrollY\)/);
});

test("line cards expose the required hierarchy without card action buttons", () => {
  const renderSource = functionSource("renderAttackPumperIncident");

  assert.match(renderSource, />Gate To</);
  assert.match(renderSource, />GPM</);
  assert.match(renderSource, />FL</);
  assert.match(renderSource, /attack-pumper-hose-summary/);
  assert.match(renderSource, /attack-pumper-line-flow/);
  assert.match(renderSource, /attack-pumper-line-friction/);
  assert.match(renderSource, /attack-pumper-gate-to/);
  assert.match(renderSource, /getPumpChartAccentColorValue\(line\.accentColorID\)/);
  assert.doesNotMatch(renderSource, /<button[\s\S]*attack-pumper-line/);
  assert.match(cssSource, /\.attack-pumper-line-content/);
  assert.match(cssSource, /--attack-pumper-widget-accent: #f98f3d/);
  assert.match(cssSource, /html\[data-resolved-theme="dark"\] \.attack-pumper-gate-to > strong[\s\S]*?var\(--attack-pumper-widget-accent\)/);
  assert.match(cssSource, /\.attack-pumper-gate-to > strong[\s\S]*?color: var\(--attack-pumper-widget-accent\)/);
  assert.match(cssSource, /\.attack-pumper-line-content::before/);
  assert.match(cssSource, /grid-template-columns: minmax\(0, 0\.9fr\)/);
  assert.match(cssSource, /\.attack-pumper-line-name[\s\S]*?overflow-wrap: anywhere/);
  assert.doesNotMatch(cssSource, /\.attack-pumper-add-card[\s\S]{0,260}border-style: dashed/);
  assert.doesNotMatch(cssSource, /body\.attack-pumper-active \.mode-carousel/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /body\.attack-pumper-active #viewPumpChartButton/);
  assert.match(htmlSource, /<span>PDP<\/span>/);
  assert.match(htmlSource, /<span>Total Flow<\/span>/);
});

test("Pump Chart color selection uses the Required PDP widget palette and survives normalization", () => {
  const normalizeSource = functionSource("normalizePumpChartAccentColorID");
  const valueSource = functionSource("getPumpChartAccentColorValue");
  const normalizeSetupSource = functionSource("normalizePumpChartSetup");
  const saveFormSource = functionSource("renderSavePumpChartForm");
  const submitSource = functionSource("submitPumpChartSaveForm");
  const updateSource = functionSource("updateActivePumpChartSetup");
  const context = {};

  vm.runInNewContext(
    `${normalizeSource}; ${valueSource}; this.normalizeColor = normalizePumpChartAccentColorID; this.colorValue = getPumpChartAccentColorValue;`,
    context
  );

  assert.deepEqual(
    ["orange", "red", "blue", "green", "yellow", "white", "gray"].map(context.normalizeColor),
    ["orange", "red", "blue", "green", "yellow", "white", "gray"]
  );
  assert.equal(context.normalizeColor(), "orange");
  assert.equal(context.normalizeColor("javascript:alert(1)"), "orange");
  assert.equal(context.colorValue("red"), "#ff615c");
  assert.equal(context.colorValue("invalid"), "#f98f3d");
  assert.match(normalizeSetupSource, /accentColorID: normalizePumpChartAccentColorID\(setup\.accentColorID\)/);
  assert.match(saveFormSource, /<legend>Widget Color<\/legend>/);
  assert.match(saveFormSource, /Reverse Flow Orange/);
  assert.match(saveFormSource, /name="pumpChartAccentColor"/);
  assert.match(submitSource, /accentColorID = normalizePumpChartAccentColorID/);
  assert.match(submitSource, /buildCurrentPumpChartSetup\(\{[\s\S]*?accentColorID/);
  assert.match(updateSource, /accentColorID: existingSetup\.accentColorID/);
  assert.match(cssSource, /\.pump-chart-color-option:has\(input:checked\)/);
});

test("Pump Panel uses one native sticky status bar and an ordinary carousel", () => {
  const renderSource = functionSource("renderAttackPumperIncident");
  const interactionSource = functionSource("setupAttackPumperInteractions");
  const explanation = htmlSource.match(/<p id="attackPumperExplanation"[\s\S]*?<\/p>/)?.[0] || "";
  const headerStyles = cssSource.match(/\.attack-pumper-header \{[\s\S]*?\n\}/)?.[0] || "";
  const metricStyles = cssSource.match(/\.attack-pumper-header-metric \{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(explanation, /Build your pump panel from eligible setups saved in your Pump Chart\./);
  assert.doesNotMatch(explanation, /active incident|manage|represents|calculator/i);
  assert.equal((htmlSource.match(/Add a Line/g) || []).length, 2);
  assert.doesNotMatch(htmlSource, />\s*Add Line\s*</);
  assert.match(renderSource, /attackPumperExplanation\.hidden = hasLines/);
  assert.equal((htmlSource.match(/id="attackPumperHeader"/g) || []).length, 1);
  assert.equal((htmlSource.match(/id="attackPumperTitle"/g) || []).length, 1);
  assert.doesNotMatch(htmlSource, /attackPumperTakeover|attackPumperStickySentinel|attackPumperSafeAreaProbe/);
  assert.match(cssSource, /\.mode-carousel-shell[\s\S]*?position: relative/);
  assert.match(headerStyles, /position: sticky/);
  assert.match(headerStyles, /top: env\(safe-area-inset-top, 0px\)/);
  assert.match(headerStyles, /border-radius: 0/);
  assert.match(headerStyles, /border-bottom: 1px solid var\(--border\)/);
  assert.match(headerStyles, /box-shadow: none/);
  assert.match(headerStyles, /transition: none/);
  assert.doesNotMatch(headerStyles, /transform|will-change/);
  assert.match(metricStyles, /opacity: 1/);
  assert.doesNotMatch(metricStyles, /transition/);
  assert.match(cssSource, /body\.attack-pumper-active[\s\S]*?overflow-x: clip/);
  assert.match(cssSource, /body\.attack-pumper-active #calculatorInputCard[\s\S]*?overflow: visible/);
  assert.match(cssSource, /body\.attack-pumper-active #modeHelper/);
  assert.doesNotMatch(cssSource, /attack-pumper-transition-progress|attack-pumper-carousel-shift|attack-pumper-header-shift|attack-pumper-safe-area-probe|attack-pumper-sticky-sentinel|attack-pumper-takeover/);
  assert.doesNotMatch(appSource, /attackPumperTransition|attackPumperGeometry|AttackPumperHeaderTransition|AttackPumperTakeoverGeometry|AttackPumperGeometryMeasurement|AttackPumperHeaderCollapse/);
  assert.doesNotMatch(interactionSource, /addEventListener\("scroll"|ResizeObserver|document\.fonts|orientationchange/);
  assert.match(cssSource, /html\[data-resolved-theme="dark"\] \.attack-pumper-line-content/);
  assert.match(cssSource, /\.attack-pumper-line-content[\s\S]*?var\(--surface\)/);
});
