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

    page.on("dialog", dialog => dialog.accept());
    await page.goto(base + "/index.html"); await ready();
    const U = require("../../www/js/units");
    const near = (a, b) => assert.ok(Math.abs(a-b) < 1e-8 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
    const snapshot = () => page.evaluate(() => ({ state: JSON.stringify(state), result: JSON.stringify(requiredPdpResult) }));
    const savedSnapshot = () => page.evaluate(() => ({ inputs: getComparablePumpChartInputs(buildPresetData()), result: requiredPdpResult }));
    async function preferences(unitSystem, metricPressureUnit = "bar", metricReactionUnit = "n") {
      const before = await snapshot(); const stored = await persisted();
      await page.locator('a[href="settings.html"]').click();
      await page.locator("#unitPreferences > summary").click();
      await page.check(`input[name="unitSystem"][value="${unitSystem}"]`);
      if (unitSystem === "metric") {
        await page.check(`input[name="metricPressureUnit"][value="${metricPressureUnit}"]`);
        await page.check(`input[name="metricReactionUnit"][value="${metricReactionUnit}"]`);
      }
      await page.locator('a[href="index.html"]').click(); await ready();
      assert.deepEqual(await snapshot(), before, "preference-only navigation changed canonical input/result");
      assert.deepEqual(await persisted(), stored, "preference-only navigation changed stored bytes/timestamps");
    }
    async function setup(nozzle, length = "200", coefficient = null, masterType = null) {
      await page.evaluate(() => setMode("requiredPdp"));
      await page.selectOption("#nozzleType", nozzle);
      await page.fill("#hoseLength", length);
      if (masterType) await page.selectOption("#masterStreamType", masterType);
      if (nozzle === "smoothbore" || masterType === "smoothbore") await page.selectOption("#smoothboreTip", masterType ? "1-1/4" : "7/8");
      else if (nozzle !== "blade") await page.fill("#pdp", masterType ? "1000" : "185");
      if (nozzle === "fixedFog" || masterType === "fixedFog") {
        await page.fill("#ratedFlow", masterType ? "1000" : "185");
        await page.fill("#ratedPressure", "50");
      }
      if (coefficient) { await page.click("#coefficientToggle"); await page.fill("#customCoefficient", coefficient); }
      if (masterType) await page.check("#dualLineSupplyToggle");
      await page.locator("#primaryResultLabel").click();
      assert.ok(await page.evaluate(() => requiredPdpResult), "valid canonical result");
    }
    for (const scenario of [
      ["automaticFog", "200"], ["automaticFog", "350", "12.63"],
      ["smoothbore", "150"], ["fixedFog", "300"], ["blade", "50"],
      ["masterstream", "400", null, "automaticFog"], ["masterstream", "200", null, "smoothbore"]
    ]) {
      await setup(...scenario);
      const usOutput = await page.locator("#standardResultsCard").innerText();
      const result = await page.evaluate(() => requiredPdpResult);
      await preferences("metric", "bar");
      assert.equal(await page.inputValue("#hoseLength"), U.feetToMetres(Number(scenario[1])).toFixed(0));
      assert.equal(await page.inputValue("#pdp"), U.gpmToLitresPerMinute(result.flowGpm).toFixed(0));
      assert.equal(await page.locator("#roundedGpm").textContent(), U.psiToBar(result.roundedPdpPsi).toFixed(1));
      assert.equal(await page.locator("#primaryResultUnit").textContent(), "bar");
      assert.match(await page.locator("#hoseSize option:checked").textContent(), /48 mm/);
      assert.equal(await page.locator("#hoseLength + button").textContent().then(s => s.trim()), "+15 m");
      assert.doesNotMatch(await page.locator("#standardResultsCard").innerText(), /PSI|psi|GPM|ft|lb\b|[0-9]"/);
      await preferences("metric", "kpa", "kgf");
      assert.equal(await page.locator("#roundedGpm").textContent(), U.psiToKpa(result.roundedPdpPsi).toFixed(0));
      await preferences("us");
      assert.equal(await page.locator("#standardResultsCard").innerText(), usOutput, "U.S. output changed after switching");
      console.log(`PASS cross-unit parity and exact U.S. rendering: ${scenario.join(" / ")}`);
    }

    // Explicit metric entry uses real input events, including decimal pressure typing.
    await setup("automaticFog"); await preferences("metric");
    await page.fill("#pdp", "700"); await page.fill("#hoseLength", "60");
    await page.click('[data-pressure="custom"]');
    await page.fill("#customNozzlePressure", "");
    await page.locator("#customNozzlePressure").pressSequentially("3.5");
    assert.equal(await page.inputValue("#customNozzlePressure"), "3.5");
    near(await page.evaluate(() => Number(state.customNozzlePressure)), U.barToPsi(3.5));
    await page.fill("#customNozzlePressure", "7.0");
    near(await page.evaluate(() => Number(state.customNozzlePressure)), U.barToPsi(7));
    await page.fill("#applianceLoss", "-0.5");
    near(await page.evaluate(() => Number(state.applianceLoss)), U.barToPsi(-.5));
    await page.click("#invertApplianceLossButton");
    near(await page.evaluate(() => Number(state.applianceLoss)), U.barToPsi(.5));
    await page.click("#hoseLength + button");
    near(await page.evaluate(() => Number(state.hoseLength)), U.metresToFeet(75));
    assert.equal(await page.inputValue("#hoseLength"), "75");
    near(await page.evaluate(() => Number(state.targetGpm)), U.litresPerMinuteToGpm(700));
    await page.fill("#customNozzlePressure", "3.55");
    assert.equal(await page.evaluate(() => requiredPdpResult), null, "invalid input retained a saveable result");
    assert.doesNotMatch(await page.locator("#standardResultsCard").innerText(), /PSI|psi|GPM|ft|lb\b|[0-9]"/);
    await page.fill("#customNozzlePressure", "3.5");
    await page.locator("#primaryResultLabel").click();

    async function saveSetup(name) {
      await page.evaluate(() => openSavePumpChartSheet());
      if (await page.locator("#pumpChartNewName").isVisible()) await page.fill("#pumpChartNewName", "Unit Test Engine");
      await page.fill("#pumpChartSetupName", name);
      await page.locator('#pumpChartSaveForm button[type="submit"]').click();
      const saved = await page.evaluate(() => {
        const chart = loadPumpCharts().charts[0];
        return { chartId: chart.id, setup: chart.setups.at(-1) };
      });
      await page.click("#closePumpChartModal");
      return saved;
    }
    const metricInput = await savedSnapshot();
    const metricSaved = await saveSetup("Metric input");
    assert.equal(metricSaved.setup.inputs.hoseLength, String(U.metresToFeet(75)));
    near(metricSaved.setup.result.canonicalRequiredPdp.nozzlePressurePsi, U.barToPsi(3.5));
    assert.match(metricSaved.setup.result.primaryResult, /PSI$/);
    assert.match(metricSaved.setup.result.calculatedFlow, /GPM$/);
    assert.doesNotMatch(JSON.stringify(metricSaved.setup.result), /bar|kPa|L\/min|kgf/);
    await preferences("metric", "kpa");
    await page.evaluate(({ chartId, setup }) => loadPumpChartSetup(chartId, setup.id), metricSaved);
    assert.deepEqual(await savedSnapshot(), metricInput);
    assert.equal(await page.inputValue("#customNozzlePressure"), "350");
    assert.equal(await page.locator("#updatePumpChartSetupButton").isVisible(), false);
    await preferences("us");
    await page.evaluate(({ chartId, setup }) => loadPumpChartSetup(chartId, setup.id), metricSaved);
    assert.deepEqual(await savedSnapshot(), metricInput);
    near(Number(await page.inputValue("#hoseLength")), U.metresToFeet(75));
    assert.equal(await page.locator("#updatePumpChartSetupButton").isVisible(), false);
    for (let i = 0; i < 3; i++) { await preferences("metric", "bar"); await preferences("us"); }
    console.log("PASS decimal bar, signed loss, +15 m, metric save → kPa/U.S. reload, dirty state and repeated switching");

    await setup("smoothbore", "200");
    const usInput = await savedSnapshot();
    const usSaved = await saveSetup("US smoothbore");
    await preferences("metric");
    await page.evaluate(({ chartId, setup }) => loadPumpChartSetup(chartId, setup.id), usSaved);
    assert.deepEqual(await savedSnapshot(), usInput);
    assert.match(await page.locator("#smoothboreTip option:checked").textContent(), /22.225 mm/);
    assert.equal(await page.locator("#updatePumpChartSetupButton").isVisible(), false);
    await page.screenshot({ path: "/tmp/reverse-flow-2a-required-pdp.png", fullPage: true });
    await preferences("us");

    // Browser Back must apply newly saved preferences without resetting a loaded setup.
    const beforeBack = await snapshot();
    const bytesBeforeBack = await persisted();
    await page.locator('a[href="settings.html"]').click();
    await page.locator("#unitPreferences > summary").click();
    await page.check('input[name="unitSystem"][value="metric"]');
    await page.check('input[name="metricPressureUnit"][value="kpa"]');
    await page.goBack(); await ready();
    assert.deepEqual(await snapshot(), beforeBack);
    assert.deepEqual(await persisted(), bytesBeforeBack);
    assert.equal(await page.locator("#primaryResultUnit").textContent(), "kPa");
    assert.equal(await page.locator("#updatePumpChartSetupButton").isVisible(), false);
    await preferences("us");
    console.log("PASS Browser Back applies kPa preference and preserves the loaded setup");

    // HEN interpolation and out-of-range warnings retain GPM semantics internally.
    await setup("automaticFog"); await page.fill("#pdp", "160"); await page.click("#henTurboToggle");
    const henResult = await page.evaluate(() => requiredPdpResult);
    assert.equal(henResult.turboLossPsi, 25);
    await preferences("metric");
    assert.match(await page.locator("#turboLossDisplay").textContent(), /bar @ 606 L\/min/);
    await page.fill("#pdp", "1000");
    assert.equal(await page.evaluate(() => requiredPdpResult), null);
    assert.match(await page.locator("#warningsCard").innerText(), /568–719 L\/min/);
    assert.doesNotMatch(await page.locator("#warningsCard").innerText(), /GPM/);
    console.log("PASS U.S. save → metric reload, exact physical tips, HEN loss and warnings");

    // Leaving the converted mode restores shared controls and outputs for all other modes.
    for (const mode of ["attackPumper"]) {
      await page.evaluate(mode => setMode(mode), mode);
      assert.equal(await page.locator("#hoseLength + button").textContent().then(s => s.trim()), "+50");
      assert.equal(await page.getAttribute("#hoseLength", "placeholder"), "Feet");
      assert.doesNotMatch(await page.locator("#hoseSize").innerText(), /mm/);
    }
    assert.deepEqual(errors, []);
    console.log("PASS all other modes retain U.S. shared controls; no browser JavaScript errors");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
