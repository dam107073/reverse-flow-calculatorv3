const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "www/index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "www/js/app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "www/css/components.css"), "utf8");

function functionSource(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const bodyStart = app.indexOf(") {", start) + 2;
  let depth = 0;
  let opened = false;
  for (let index = bodyStart; index < app.length; index += 1) {
    if (app[index] === "{") {
      depth += 1;
      opened = true;
    } else if (app[index] === "}") {
      depth -= 1;
      if (opened && depth === 0) return app.slice(start, index + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

test("redundant mode-section labels are absent without a replacement spacer", () => {
  assert.doesNotMatch(html, /Operations Module/i);
  assert.doesNotMatch(html, /Select a hydraulic calculation mode\./);
  assert.doesNotMatch(html, /id="operationsModuleLabel"|id="operationsModuleHelper"/);
  assert.match(
    html,
    /id="operationsModuleField"[^>]*>\s*<div class="mode-carousel-shell">/
  );
});

test("home renders exactly one shared Tools control", () => {
  assert.equal((html.match(/id="homeToolsLink"/g) || []).length, 1);
  assert.equal((html.match(/href="tools\.html"/g) || []).length, 1);
  assert.doesNotMatch(functionSource("syncHomeToolsPlacement"), /cloneNode|createElement|innerHTML/);
});

test("Pump Panel moves Tools before Resources and hides the empty source field", () => {
  const placement = functionSource("syncHomeToolsPlacement");
  const syncMode = functionSource("syncModeUi");

  assert.match(placement, /isAttackPumperMode\(\)[\s\S]*?els\.homeFooterActions/);
  assert.match(placement, /destination\.querySelector\('a\[href="resources\.html"\]'\)/);
  assert.match(placement, /destination\.insertBefore\(toolsLink, before\)/);
  assert.match(syncMode, /syncHomeToolsPlacement\(\)/);
  assert.match(
    css,
    /body\.attack-pumper-active #pumpChartEntryField\s*\{[\s\S]*?display:\s*none !important;/
  );
  assert.ok(html.indexOf('id="homeFooterActions"') < html.indexOf('href="resources.html"'));
});

test("every non-Pump-Panel mode restores Tools above its calculator", () => {
  const placement = functionSource("syncHomeToolsPlacement");
  assert.match(
    placement,
    /isAttackPumperMode\(\)[\s\S]*?els\.homeFooterActions[\s\S]*?: els\.pumpChartButtons/
  );
  assert.match(placement, /const before = isAttackPumperMode\(\)[\s\S]*?: null/);
  assert.doesNotMatch(placement, /scrollTo|scrollIntoView|focus\(/);
});
