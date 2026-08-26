const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Resources preserves its website-backed browsers and adds learning destinations", () => {
  const page = read("www/resources.html");
  for (const label of ["Training Directory", "Hose Library", "Articles", "Formula Library", "Practice Quiz"]) assert.match(page, new RegExp(label));
  assert.doesNotMatch(page, /Manufacturer References|Training Resources Coming Soon/);
});

test("no bundled catalog, mock directory, or legacy merge path remains active", () => {
  assert.equal(fs.existsSync(path.join(root, "www/js/data/references.js")), false);
  const browser = read("www/js/resources-browser.js");
  const data = read("www/js/resources-data.js");
  assert.doesNotMatch(browser + data, /mergePublishedHoseReferences|ENABLE_PUBLISHED_HOSE_REFERENCES|mockTrainingDirectoryListings|hoseManufacturerReferences/);
  assert.match(data, /api\/resources\/v1\/libraries\/hose\/items\?limit=100/);
});

test("operational coefficient, saved-profile, and hose-size contracts remain unchanged", () => {
  const hydraulics = read("www/js/data/hydraulics.js");
  const app = read("www/js/app.js");
  const constants = read("www/js/constants.js");
  assert.match(hydraulics, /FACTORY_HOSE_COEFFS/);
  assert.match(hydraulics, /function getActiveHoseCoefficient\(hoseId\)/);
  assert.match(app, /function loadCustomHoseProfiles\(\)/);
  assert.match(app, /function loadSavedHoseLibrarySelections\(\)/);
  assert.match(constants, /reverseFlowCustomHoseProfiles/);
  assert.match(constants, /reverse-flow-hose-coefficients-v1/);
});

test("browser includes refresh, pull gesture, image fallback, safe canonical opening, and legacy route mapping", () => {
  const browser = read("www/js/resources-browser.js");
  assert.match(browser, /touchstart/);
  assert.match(browser, /data-image-fallback/);
  assert.match(browser, /openCanonicalResourceUrl/);
  assert.match(browser, /legacySection === "training-partners"/);
  assert.match(browser, /legacySection === "articles"/);
});
