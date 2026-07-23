const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("feature resolver and Tools guard always allow production functionality", () => {
  const entitlement = read("www/js/services/entitlement.js");
  assert.match(entitlement, /function canAccessFeature[\s\S]*return true;/);
  assert.match(entitlement, /function guardToolsAccess[\s\S]*setToolsContentLocked\(false\);[\s\S]*return true;/);
});

test("production save, load, and export paths do not check legacy eligibility", () => {
  const app = read("www/js/app.js");
  const guardedOperationalPath =
    /(?:function\s+|window\.)(savePresets|savePumpCharts|submitPumpChartSaveForm|updateActivePumpChartSetup|saveCurrentSetupAsPreset|openSavePumpChartSheet|loadPumpChartSetup|exportPumpChart)[\s\S]{0,240}if\s*\(!isProUser\(\)\)/;
  assert.doesNotMatch(app, guardedOperationalPath);
});

test("main app exposes one centralized support action and no access ribbons", () => {
  const html = read("www/index.html");
  assert.equal((html.match(/data-support-action/g) || []).length, 1);
  assert.doesNotMatch(html, /mode-card-pro|Upgrade to Pro|Restore Purchase|Buy Pro|Go Pro/i);
});
