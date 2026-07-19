const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const packageApi = require("../www/js/pump-operator-package.js");

const appSource = fs.readFileSync(path.join(__dirname, "../www/js/app.js"), "utf8");

function readAppFunction(name, nextName) {
  const start = appSource.indexOf(`function ${name}`);
  const asyncStart = appSource.indexOf(`async function ${name}`);
  const resolvedStart = asyncStart >= 0 ? asyncStart : start;
  const end = appSource.indexOf(`async function ${nextName}`, resolvedStart + 1);
  assert.notEqual(resolvedStart, -1, `${name} should exist in app.js`);
  assert.notEqual(end, -1, `${nextName} should follow ${name} in app.js`);
  return appSource.slice(resolvedStart, end);
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
