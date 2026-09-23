// Run with Node and Playwright available (NODE_PATH may point to the workspace runtime).
// Uses an isolated browser profile and loopback server; never accesses user app data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "../../www");
const keys = ["reverse-flow-calculator-v3", "reverse-flow-calculator-presets-v1", "reverse-flow-pump-charts-v2",
  "reverse-flow-attack-pumper-incident-v1", "reverse-flow-hose-coefficients-v1", "reverseFlowCustomHoseProfiles",
  "reverseFlowDefaultHoseProfiles", "reverse-flow-hose-library-selections-v1", "visibleHoseSizes", "visibleSmoothboreTips"];

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, "." + new URL(req.url, "http://localhost").pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(404).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" })[path.extname(file)] || "application/octet-stream");
      res.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const persisted = () => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), keys);
    const current = () => page.evaluate(() => ({ state: JSON.stringify(state), edit: JSON.stringify(activePumpChartEdit) }));
    const ready = () => page.waitForFunction(() => typeof state !== "undefined" && document.body.classList.contains("access-ready"));

    await page.goto(base + "/index.html"); await ready();
    await page.evaluate(() => {
      saveHoseCoefficient("1.75", 12.63);
      localStorage.setItem(PRESETS_KEY, '[{"name":"Legacy","calculatedFlow":"185 GPM"}]');
      localStorage.setItem(PUMP_CHARTS_KEY, JSON.stringify({ version: 2, charts: [] }));
      localStorage.setItem(ATTACK_PUMPER_INCIDENT_KEY, JSON.stringify({ version: 1, lines: [] }));
      localStorage.setItem(CUSTOM_HOSE_PROFILES_KEY, JSON.stringify([{ id: "custom", profileName: "Engine hose", appHoseId: "1.75", tradeSize: '1.75"', coefficient: 12.63, chargedId50: 1.91 }]));
      localStorage.setItem(DEFAULT_HOSE_PROFILES_KEY, JSON.stringify({ "1.75": { id: "custom", profileName: "Engine hose", coefficient: 12.63 } }));
      localStorage.setItem(HOSE_LIBRARY_SELECTIONS_KEY, JSON.stringify({ "1.75": { id: "custom" } }));
      saveVisibleHoseSizeIds(getSupportedHoseEquipmentOptions().map(h => h.id));
      saveVisibleSmoothboreTipIds(SMOOTHBORE_TIPS.map(t => t.id));
    });

    for (const mode of ["requiredPdp", "reverse", "apparatusMounted", "relay", "splitLay", "standpipeOps", "wyeOps", "attackPumper"]) {
      await page.evaluate(mode => {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        Object.assign(state, { mode, pdp: "150", targetGpm: "185", hoseLength: "237", hoseSize: "1.75",
          nozzleType: "automaticFog", nozzlePressure: "50", applianceLoss: "-5", customCoefficient: "12.63123",
          useCustomCoefficient: true, apparatusElevation: "31", ratedFlow: "185", ratedPressure: "50" });
        for (const section of [state.splitLay, state.standpipeOps, state.wyeOps]) {
          Object.assign(section, { supplyLength: "175", supplyHoseSize: "3", attack1Length: "237", attack2Length: "183",
            attack1NozzleType: "automaticFog", attack2NozzleType: "automaticFog", attack1Flow: "185", attack2Flow: "150",
            attack1NozzlePressure: "50", attack2NozzlePressure: "50" });
        }
        state.wyeOps.attack1CustomTip = "0.912345";
        state.standpipeOps.attack1Floor = "7";
        populateHoseOptions(); syncInputsFromState(); syncSplitLayInputsFromState(); rerenderWyeOpsFields();
        calculateAndRender(); saveState();
        activePumpChartEdit = null;
        if (mode === "requiredPdp") {
          const setup = buildCurrentPumpChartSetup({ name: "Engine Line", timestamp: "2026-09-23T12:00:00.000Z", id: "line" });
          savePumpCharts({ version: 2, charts: [{ id: "engine", name: "Engine", createdAt: setup.createdAt, updatedAt: setup.updatedAt, setups: [setup] }] });
          setPumpChartEditState("engine", "line");
        }
      }, mode);
      const before = await persisted(); const activeBefore = await current();
      await page.locator('a[href="settings.html"]').click();
      await page.waitForURL("**/settings.html");
      await page.locator("#unitPreferences > summary").click();
      assert.equal(await page.locator("#metricUnitPreferences").isVisible(), false);
      await page.check('input[name="unitSystem"][value="metric"]');
      assert.equal(await page.locator("#metricUnitPreferences").isVisible(), true);
      await page.check('input[value="kpa"]'); await page.check('input[value="kgf"]');
      await page.reload();
      await page.locator("#unitPreferences > summary").click();
      assert.equal(await page.isChecked('input[value="metric"]'), true);
      assert.equal(await page.isChecked('input[value="kpa"]'), true);
      assert.equal(await page.isChecked('input[value="kgf"]'), true);
      await page.check('input[name="unitSystem"][value="us"]');
      assert.equal(await page.locator("#metricUnitPreferences").isVisible(), false);
      assert.deepEqual(await persisted(), before, `${mode}: Settings changed canonical storage`);
      await page.locator('a[href="index.html"]').click(); await ready();
      assert.deepEqual(await current(), activeBefore, `${mode}: active setup changed after Settings`);
      assert.deepEqual(await persisted(), before, `${mode}: return changed canonical storage`);
      console.log(`PASS ${mode}: Settings reload/return preserves canonical bytes and active edit context`);
    }

    // Return with Metric still selected: Pump Panel now renders selected units without changing canonical state.
    const metricBefore = await persisted(); const metricActiveBefore = await current();

    await page.locator('a[href="settings.html"]').click();
    await page.locator("#unitPreferences > summary").click();
    await page.check('input[value="metric"]');
    await page.locator('a[href="index.html"]').click(); await ready();
    assert.deepEqual(await current(), metricActiveBefore);
    assert.deepEqual(await persisted(), metricBefore);
    assert.match(await page.locator("#attackPumperPressure").textContent(), /kPa$/);

    // Browser Back is also a supported return path (including live-page restoration).
    await page.locator('a[href="settings.html"]').click();
    await page.goBack(); await ready();
    assert.deepEqual(await current(), metricActiveBefore);
    assert.deepEqual(await persisted(), metricBefore);
    console.log("PASS Pump Panel renders Metric; Browser Back preserves state");

    // The one-use session is gone: ordinary calculator reload retains fresh-launch behavior.
    await page.reload(); await ready();
    assert.equal(await page.evaluate(() => state.hoseLength), "");
    const beforeSettings = await persisted();
    await page.goto(base + "/settings.html");
    assert.deepEqual(await persisted(), beforeSettings, "direct Settings visit reset hydraulic storage");
    await page.locator("#unitPreferences > summary").click();
    await page.check('input[value="metric"]');
    await page.screenshot({ path: "/tmp/reverse-flow-phase1-settings.png", fullPage: true });
    assert.deepEqual(errors, [], "browser JavaScript errors");
    console.log("PASS fresh launch, direct Settings, conditional controls, preference reload, and no JavaScript errors");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
