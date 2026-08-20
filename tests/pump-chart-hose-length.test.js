const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.join(__dirname, "../www/js/app.js"), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
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
  assert.notEqual(bodyStart, -1, `${name} should have a function body`);
  let depth = 0;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    if (appSource[index] === "{") depth += 1;
    if (appSource[index] === "}") depth -= 1;
    if (depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`Unable to extract ${name}`);
}

const context = {
  extractInputsFromLegacyPreset: setup => ({
    mode: setup.mode || "",
    hoseLength: setup.hoseLength || "",
    hoseSize: setup.hoseSize || ""
  }),
  formatHoseSize: value => `${String(value).replace(/"$/, "")}"`,
  getNozzleConfigurationLabel: () => "Smoothbore",
  getModeLabel: mode => mode,
  getSplitLayConfigurationSummary: () => "Split Lay",
  getStandpipeOpsConfigurationSummary: () => "Standpipe Ops",
  getApparatusMountedConfigurationSummary: () => "Apparatus Mounted",
  logPumpChartApparatusDisplay: () => {},
  getRelayConfigurationSummary: () => "Relay",
  getMasterStreamSavedFlowSummary: () => ""
};

vm.runInNewContext([
  functionSource("getResolvedPumpChartInputs"),
  functionSource("formatLengthAndHose"),
  functionSource("getSetupConfigurationSummary"),
  "this.getResolvedPumpChartInputs = getResolvedPumpChartInputs;",
  "this.getSetupConfigurationSummary = getSetupConfigurationSummary;"
].join("\n"), context);

test("Pump Chart displays and reloads each saved hose length without changing other inputs", () => {
  for (const hoseLength of [50, 150, 200, 500, 1000]) {
    const setup = {
      mode: "requiredPdp",
      inputs: {
        mode: "requiredPdp",
        hoseLength: String(hoseLength),
        hoseSize: "1.75",
        targetGpm: "185",
        nozzleType: "smoothbore",
        smoothboreTip: "7/8",
        applianceLoss: "10"
      },
      result: { calculatedPdp: "112" }
    };

    const savedInputs = context.getResolvedPumpChartInputs(setup);
    const loadedPreset = { ...savedInputs, ...setup.result };

    assert.equal(savedInputs.hoseLength, String(hoseLength));
    assert.match(context.getSetupConfigurationSummary(setup), new RegExp(`^${hoseLength}'`));
    assert.equal(loadedPreset.hoseLength, String(hoseLength));
    assert.equal(loadedPreset.hoseSize, "1.75");
    assert.equal(loadedPreset.targetGpm, "185");
    assert.equal(loadedPreset.nozzleType, "smoothbore");
    assert.equal(loadedPreset.smoothboreTip, "7/8");
    assert.equal(loadedPreset.applianceLoss, "10");
  }
});

test("legacy result-overlay hose length is displayed exactly as the existing load path restores it", () => {
  const legacySetup = {
    mode: "requiredPdp",
    hoseLength: "150",
    inputs: {
      mode: "requiredPdp",
      hoseLength: "1000",
      hoseSize: "1.75",
      targetGpm: "185",
      nozzleType: "smoothbore",
      applianceLoss: "10"
    },
    result: {
      hoseLength: "150",
      calculatedPdp: "112"
    }
  };

  const savedInputs = context.getResolvedPumpChartInputs(legacySetup);
  const loadedPreset = { ...savedInputs, ...legacySetup.result };

  assert.equal(savedInputs.hoseLength, "150");
  assert.match(context.getSetupConfigurationSummary(legacySetup), /^150'/);
  assert.doesNotMatch(context.getSetupConfigurationSummary(legacySetup), /^1000'/);
  assert.equal(loadedPreset.hoseLength, "150");
  assert.equal(loadedPreset.hoseSize, "1.75");
  assert.equal(loadedPreset.targetGpm, "185");
  assert.equal(loadedPreset.nozzleType, "smoothbore");
  assert.equal(loadedPreset.applianceLoss, "10");
});

test("every Pump Chart hose presentation path uses the resolved saved inputs", () => {
  for (const functionName of [
    "getSetupConfigurationSummary",
    "getSetupReferenceSections",
    "getSetupInputRows",
    "applyPumpChartSetup",
    "getPumpOperatorHydraulicStructure",
    "getPumpOperatorSetupRow"
  ]) {
    assert.match(functionSource(functionName), /getResolvedPumpChartInputs\(setup\)/);
  }
});
