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

test("Attack Pumper is the default fourth carousel calculator in the requested order", () => {
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
  assert.match(appSource, /confirm\("End this incident and remove every active attack line\?"\)/);
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
  assert.match(snapshotSource, /structure\.confidence !== "confident"/);
  assert.match(snapshotSource, /row\.frictionLoss/);
  assert.match(snapshotSource, /row\.hose/);
  assert.match(snapshotSource, /capturedAt: nowIsoString\(\)/);
  assert.match(snapshotSource, /\bhoseSummary\b/);
});

test("other-calculator setups add and replace while incomplete normalized records fail closed", () => {
  const sources = [
    functionSource("formatAttackPumperNumber"),
    functionSource("normalizeAttackPumperSnapshotText"),
    functionSource("formatAttackPumperPackageSummary"),
    functionSource("getAttackPumperSnapshot"),
    functionSource("applyAttackPumperSnapshot")
  ].join("\n");
  let generatedId = 0;
  const context = {
    getPumpOperatorHydraulicStructure: setup => setup.normalizedStructure,
    getPumpOperatorSetupRow: setup => setup.normalizedRow,
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

  assert.equal(relaySnapshot.sourceMode, "relay");
  assert.equal(relaySnapshot.hoseSummary, `200' • 1.75\"`);
  assert.equal(splitSnapshot.sourceMode, "splitLay");
  assert.equal(splitSnapshot.frictionLoss, "S 12 • A 32");
  assert.equal(splitSnapshot.hoseSummary, `500' • 3\" → 200' • 1.75\" • NP 50`);
  assert.equal(standpipeSnapshot.sourceMode, "standpipeOps");
  assert.equal(futureSnapshot.sourceMode, "futureDischargeCalculator");

  let incident = context.applyAttackPumperSnapshot({ version: 1, lines: [] }, relaySnapshot);
  incident = context.applyAttackPumperSnapshot(incident, splitSnapshot);
  const retainedId = incident.lines[0].id;
  incident = context.applyAttackPumperSnapshot(incident, standpipeSnapshot, retainedId);

  assert.equal(incident.lines.length, 2);
  assert.equal(incident.lines[0].id, retainedId);
  assert.equal(incident.lines[0].sourceMode, "standpipeOps");
  assert.equal(incident.lines[1].sourceMode, "splitLay");

  const invalidOverrides = [
    { name: "" },
    { gpm: "" },
    { pdp: "" },
    { frictionLoss: "" },
    { frictionLoss: "S —\nA —" },
    { hose: "" }
  ];
  invalidOverrides.forEach(overrides => {
    assert.equal(context.getAttackPumperSnapshot(makeNormalizedSetup("relay", overrides)), null);
  });

  const ambiguous = makeNormalizedSetup("standpipeOps");
  ambiguous.normalizedStructure.confidence = "ambiguous";
  assert.equal(context.getAttackPumperSnapshot(ambiguous), null);
});

test("Pump Chart selection override is scoped to Attack Pumper and preserves ordinary loading", () => {
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
  assert.match(renderSource, />Friction Loss</);
  assert.match(renderSource, /attack-pumper-hose-summary/);
  assert.match(renderSource, /attack-pumper-gate-to/);
  assert.doesNotMatch(renderSource, /<button[\s\S]*attack-pumper-line/);
  assert.match(cssSource, /\.attack-pumper-line-content/);
  assert.match(cssSource, /font-size: clamp\(58px, 16vw, 72px\)/);
  assert.doesNotMatch(cssSource, /\.attack-pumper-add-card[\s\S]{0,260}border-style: dashed/);
  assert.match(cssSource, /\.attack-pumper-header\.is-pinned/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
});
