const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "www/index.html"), "utf8");
const settingsHtml = fs.readFileSync(path.join(root, "www/settings.html"), "utf8");
const toolsHtml = fs.readFileSync(path.join(root, "www/tools.html"), "utf8");
const app = fs.readFileSync(path.join(root, "www/js/app.js"), "utf8");
const toolsCalculators = fs.readFileSync(path.join(root, "www/js/tools-calculators.js"), "utf8");
const disclosures = fs.readFileSync(path.join(root, "www/js/disclosures.js"), "utf8");
const componentsCss = fs.readFileSync(path.join(root, "www/css/components.css"), "utf8");
const supportCss = fs.readFileSync(path.join(root, "www/css/support.css"), "utf8");

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const bodyStart = source.indexOf(") {", start) + 2;
  let depth = 0;
  let opened = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
      opened = true;
    } else if (source[index] === "}") {
      depth -= 1;
      if (opened && depth === 0) return source.slice(start, index + 1);
    }
  }

  throw new Error(`Could not extract ${name}`);
}

test("the disclosure inventory covers every native details implementation", () => {
  const staticDetails = [indexHtml, settingsHtml, toolsHtml]
    .map(source => (source.match(/<details\b/g) || []).length)
    .reduce((total, count) => total + count, 0);
  const generatedDetails = [app, toolsCalculators]
    .map(source => (source.match(/<details\b/g) || []).length)
    .reduce((total, count) => total + count, 0);

  assert.equal(staticDetails, 17);
  assert.equal(generatedDetails, 6);
  assert.equal((toolsHtml.match(/data-tools-section=/g) || []).length, 10);
  assert.equal((settingsHtml.match(/collapsible-settings-card/g) || []).length, 5);
  assert.match(indexHtml, /<details class="card formula" id="formulaCard">/);
  assert.match(indexHtml, /<details class="about">/);
  assert.match(app, /<details class="pump-chart-overflow">/);
  assert.match(app, /<details class="pump-chart-advanced-details">/);
  assert.equal((toolsCalculators.match(/<details class="formula">/g) || []).length, 4);
});

test("shared disclosure state stays synchronized for static and generated details", () => {
  const initialize = functionSource(disclosures, "initializeDisclosure");
  const sync = functionSource(disclosures, "syncDisclosure");

  assert.match(initialize, /details\.addEventListener\("toggle", \(\) => syncDisclosure\(details\)\)/);
  assert.match(initialize, /event\.key !== "Enter" && event\.key !== " "/);
  assert.match(initialize, /event\.preventDefault\(\)[\s\S]*?summary\.click\(\)/);
  assert.match(sync, /summary\.setAttribute\("aria-expanded", details\.open \? "true" : "false"\)/);
  assert.match(sync, /summary\.setAttribute\("aria-controls", controlledIds\.join\(" "\)\)/);
  assert.match(disclosures, /new MutationObserver/);
  assert.match(disclosures, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(disclosures, /data\.collapsedLabel|dataset\.collapsedLabel/);
  assert.match(disclosures, /data\.expandedLabel|dataset\.expandedLabel/);

  [indexHtml, settingsHtml, toolsHtml].forEach(source => {
    assert.match(source, /js\/disclosures\.js\?v=1/);
  });
});

test("Tools disclosures collapse from Hide and preserve their section-navigation model", () => {
  const setup = functionSource(toolsCalculators, "setupToolsSectionNavigation");

  assert.match(setup, /section\.classList\.contains\("active-tools-section"\) && section\.open/);
  assert.match(setup, /parentSection[\s\S]*?enterToolsSection\(parentSection\)[\s\S]*?exitToolsSection\(\)/);
  assert.match(setup, /summary\.focus\(\{ preventScroll: true \}\)/);
  assert.match(setup, /return;[\s\S]*?enterToolsSection\(section\)/);
  assert.equal((setup.match(/summary\.addEventListener\("click"/g) || []).length, 1);
});

test("conditional calculator panels expose accurate state and controls", () => {
  const reverse = functionSource(app, "syncReverseSupplyUi");
  const split = functionSource(app, "syncSplitLayUi");
  const standpipe = functionSource(app, "syncStandpipeUi");

  assert.match(indexHtml, /id="reverseSupplyToggle"[\s\S]*?aria-expanded="false"[\s\S]*?aria-controls="reverseSupplySection"/);
  assert.match(reverse, /enabled[\s\S]*?"Remove Supply Section"[\s\S]*?: "Add Supply Section"/);
  assert.match(reverse, /"aria-expanded"[\s\S]*?enabled \? "true" : "false"/);
  assert.match(indexHtml, /id="standpipeAddOutletButton"[^>]*aria-expanded="false"[^>]*aria-controls="standpipeAttack2Section"/);
  assert.match(standpipe, /standpipeAddOutletButton\.setAttribute\([\s\S]*?"aria-expanded"/);
  assert.match(indexHtml, /data-sections="2" aria-controls="splitSupply2Section"/);
  assert.match(indexHtml, /data-attack-lines="2" aria-controls="splitAttack2Section"/);
  assert.equal((split.match(/setAttribute\("aria-pressed"/g) || []).length, 2);
});

test("expandable controls have action labels, visible focus, and minimum touch targets", () => {
  assert.match(app, /data-collapsed-label="Show Full Calculation" data-expanded-label="Hide Full Calculation"/);
  assert.match(supportCss, /collapsible-settings-card > summary:focus-visible/);
  assert.match(supportCss, /formula > summary:focus-visible/);
  assert.match(supportCss, /details\.about > summary:focus-visible/);
  assert.match(componentsCss, /pump-chart-overflow summary:focus-visible/);
  assert.match(componentsCss, /pump-chart-advanced-details summary:focus-visible/);
  assert.match(componentsCss, /\.pump-chart-overflow summary\s*\{[\s\S]*?width:\s*44px;[\s\S]*?min-height:\s*44px;/);
  assert.match(componentsCss, /\.pump-chart-advanced-details summary\s*\{[\s\S]*?min-height:\s*44px;/);
});
