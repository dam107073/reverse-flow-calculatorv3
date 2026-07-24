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
  assert.equal((html.match(/data-support-card/g) || []).length, 1);
  assert.match(html, /<\/header>\s*<a[\s\S]*class="support-action-bar"[\s\S]*<\/a>\s*<main>/);
  assert.doesNotMatch(html, /data-support-message|support-eyebrow|support-card-message/);
  assert.doesNotMatch(html, /mode-card-pro|Upgrade to Pro|Restore Purchase|Buy Pro|Go Pro/i);
});

test("support UI uses one compact action, live store options, and approved copy", () => {
  const supporter = read("www/js/services/supporter.js");
  const supportHtml = read("www/support.html");
  const supportCss = read("www/css/support.css");
  const bundledSupportSources = [
    supporter,
    supportHtml,
    supportCss,
    read("www/index.html")
  ].join("\n");

  assert.match(supporter, /option\.state === "ready"[\s\S]*"Purchase"/);
  assert.doesNotMatch(supporter, /Coming Soon/);
  assert.match(supportHtml, /Already purchased Reverse Flow PRO\?/);
  assert.match(supportHtml, />Check Existing Purchase</);
  assert.match(supportCss, /\.support-option\.is-unavailable:disabled\s*\{[\s\S]*opacity:\s*1/);
  assert.match(supportCss, /\.support-action-bar\s*\{[\s\S]*min-height:\s*46px/);
  const retiredAccessPhrase = new RegExp(
    ["production", "tools?"].join("\\s+"),
    "i"
  );
  assert.doesNotMatch(bundledSupportSources, retiredAccessPhrase);
});

test("legacy eligibility alone never renders a Supporter badge", () => {
  const supporter = read("www/js/services/supporter.js");
  assert.match(
    supporter,
    /badge\.hidden = !state\.isSupporter;[\s\S]*if \(state\.isSupporter\)/
  );
  assert.doesNotMatch(
    supporter,
    /badge\.hidden\s*=\s*!state\.hasLegacyProEntitlement/
  );
});
