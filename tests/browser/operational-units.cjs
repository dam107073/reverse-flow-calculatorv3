// Run with Node and Playwright available (NODE_PATH may point to the workspace runtime).
// Uses an isolated browser profile and loopback server; never accesses user app data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = process.env.US_BASELINE_ROOT || path.resolve(__dirname, "../../www");
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
    const B = require("../../www/js/required-pdp-units");
    const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-8*Math.max(1,Math.abs(b)), `${a} != ${b}`);
    const scenarios = [
      ["reverse-fog", {mode:"reverse",nozzleType:"automaticFog",pdp:"150",hoseLength:"200",hoseSize:"1.88",nozzlePressure:"50"}],
      ["reverse-custom-supply", {mode:"reverse",nozzleType:"automaticFog",pdp:"200",hoseLength:"100",hoseSize:"2.5",nozzlePressure:"50",useCustomCoefficient:true,customCoefficient:"2.1",reverseSupplyEnabled:true,reverseSupplyLength:"500",reverseSupplyHoseSize:"3",applianceLoss:"-10"}],
      ["reverse-smoothbore", {mode:"reverse",nozzleType:"smoothbore",pdp:"150",hoseLength:"200",hoseSize:"1.88",smoothboreTip:"7/8"}],
      ["reverse-fixed", {mode:"reverse",nozzleType:"fixedFog",pdp:"175",hoseLength:"300",hoseSize:"1.75",ratedFlow:"185",ratedPressure:"50"}],
      ["reverse-blade", {mode:"reverse",nozzleType:"blade",pdp:"125",hoseLength:"150",hoseSize:"1.88",bladeModel:"blade160"}],
      ["reverse-hen", {mode:"reverse",nozzleType:"automaticFog",pdp:"125.96",hoseLength:"200",hoseSize:"1.88",nozzlePressure:"60",henTurboEnabled:true}],
      ["reverse-master", {mode:"reverse",nozzleType:"masterstream",masterStreamType:"automaticFog",masterStreamLoss:"25",pdp:"200",hoseLength:"100",hoseSize:"3",nozzlePressure:"80"}],
      ["apparatus-fog", {mode:"apparatusMounted",nozzleType:"automaticFog",nozzlePressure:"80",apparatusFogFlow:"1000",apparatusElevation:"25",masterStreamLoss:"25"}],
      ["apparatus-smooth", {mode:"apparatusMounted",nozzleType:"smoothbore",nozzlePressure:"80",smoothboreTip:"1-1/4",apparatusElevation:"100",masterStreamLoss:"25"}],
      ["apparatus-fixed", {mode:"apparatusMounted",nozzleType:"fixedFog",ratedFlow:"1000",ratedPressure:"80",apparatusElevation:"50",masterStreamLoss:"15"}],
      ["relay-dual", {mode:"relay",targetGpm:"1000",hoseLength:"500",hoseSize:"dual3",relayResidualPressure:"30",applianceLoss:"-10"}],
      ...[270,270.01,370,370.01].map(length=>[`relay-threshold-${length}`,{mode:"relay",targetGpm:"1000",hoseLength:String(length),hoseSize:"5",relayResidualPressure:"30",useCustomCoefficient:true,customCoefficient:"1",applianceLoss:"0"}])
    ];
    const fixturePath = path.resolve(__dirname,"../fixtures/operational-us-baseline.json");
    const baseline = process.env.US_BASELINE_ROOT ? {} : JSON.parse(fs.readFileSync(fixturePath));
    async function configure(config) {
      await page.evaluate(config=> {
        clearPumpChartEditState();
        state = {...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...config};
        populateHoseOptions(); populateSmoothboreTips(true); syncInputsFromState();
        renderPressureButtons(); calculateAndRender(); saveState();
      },config);
    }
    const snapshot = () => page.evaluate(()=>({state:JSON.stringify(state), result:operationalResult}));
    const savedSnapshot = () => page.evaluate(()=>({inputs:getComparablePumpChartInputs(buildPresetData()), result:operationalResult}));
    const usOutput = () => page.evaluate(()=>({
      result:document.getElementById("standardResultsCard").innerText,
      warnings:document.getElementById("warningsCard").innerText,
      calculatedPressure:document.getElementById("calculatedNozzlePressure").hidden ? "" : document.getElementById("calculatedNozzlePressureValue").textContent
    }));
    async function preferences(unitSystem, metricPressureUnit="bar",metricReactionUnit="n", back=false) {
      const before=await snapshot(), stored=await persisted();
      await page.locator('a[href="settings.html"]').click();
      await page.locator("#unitPreferences > summary").click();
      await page.check(`input[name="unitSystem"][value="${unitSystem}"]`);
      if (unitSystem === "metric") {
        await page.check(`input[name="metricPressureUnit"][value="${metricPressureUnit}"]`);
        await page.check(`input[name="metricReactionUnit"][value="${metricReactionUnit}"]`);
      }
      if(back) await page.goBack(); else await page.locator('a[href="index.html"]').click();
      await ready();
      assert.deepEqual(await snapshot(), before,"preference changed canonical state/result");
      assert.deepEqual(await persisted(),stored,"preference changed stored bytes/timestamps");
    }
    async function assertMetric() {
      const texts=await page.evaluate(()=>["standardResultsCard","warningsCard","calculatorInputCard"].map(id=>document.getElementById(id)?.innerText||"").join("\n"));
      assert.doesNotMatch(texts,/\bPSI\b|\bpsi\b|\bGPM\b|\bfeet\b|\blb\b|\bft\b/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,"horizontal overflow");
    }
    for(const [name,config] of scenarios) {
      await configure(config);
      const output=await usOutput();
      if(process.env.US_BASELINE_ROOT) {baseline[name]=output;continue;}
      assert.deepEqual(output,baseline[name],`${name}: exact pre-edit U.S. output`);
      const r=await page.evaluate(()=>operationalResult); assert.ok(r,`${name}: result missing`);
      for(const pressure of ["bar","kpa"]) {
        await preferences("metric",pressure,pressure==="bar"?"n":"kgf");
        await assertMetric();
        assert.equal(await page.locator("#roundedGpm").textContent(),B.number(config.mode==="reverse"?r.roundedFlowGpm:r.roundedPdpPsi,config.mode==="reverse"?"flow":"pressure",U.normalizePreferences({unitSystem:"metric",metricPressureUnit:pressure})));
      }
      await page.screenshot({path:`/tmp/phase2b-${name}.png`,fullPage:true});
      await preferences("us");
      assert.deepEqual(await usOutput(),baseline[name],`${name}: restored U.S. output`);
      console.log(`PASS ${name}: exact baseline, bar/kPa parity, no state drift or mixed units`);
    }
    if(process.env.US_BASELINE_ROOT) {
      fs.mkdirSync(path.dirname(fixturePath),{recursive:true});fs.writeFileSync(fixturePath,JSON.stringify(baseline,null,2)+"\n");
      console.log("Captured pre-edit U.S. baseline");return;
    }
    async function save(name) {
      await page.evaluate(()=>openSavePumpChartSheet());
      if(await page.locator("#pumpChartNewName").isVisible()) await page.fill("#pumpChartNewName","Phase 2B Engine");
      await page.fill("#pumpChartSetupName",name);
      await page.locator('#pumpChartSaveForm button[type="submit"]').click();
      const saved=await page.evaluate(()=>{const c=loadPumpCharts().charts[0];return {chartId:c.id,setup:c.setups.at(-1)};});
      await page.click("#closePumpChartModal");return saved;
    }
    async function reload(saved,expected) {
      await page.evaluate(({chartId,setup})=>loadPumpChartSetup(chartId,setup.id),saved);
      assert.deepEqual(await savedSnapshot(),expected);
      assert.equal(await page.locator("#updatePumpChartSetupButton").isVisible(),false);
    }
    for(const mode of ["reverse","apparatusMounted","relay"]) {
      const config=scenarios.find(([,c])=>c.mode===mode)[1];
      await configure(config);
      const usExpected=await savedSnapshot(),usSaved=await save(`${mode} US`);
      await preferences("metric"); await reload(usSaved,usExpected);
      if(mode==="reverse") {
        await page.fill("#pdp","10.5"); await page.fill("#hoseLength","60");
        await page.click("#hoseLength + button");
        await page.click('[data-pressure="custom"]'); await page.fill("#customNozzlePressure","3.5");
        near(await page.evaluate(()=>Number(state.pdp)),U.barToPsi(10.5));
        near(await page.evaluate(()=>Number(state.hoseLength)),U.metresToFeet(75));
        near(await page.evaluate(()=>Number(state.customNozzlePressure)),U.barToPsi(3.5));
        await page.click("#reverseSupplyToggle"); await page.fill("#reverseSupplyLength","60"); await page.click("#reverseSupplyLength + button");
        near(await page.evaluate(()=>Number(state.reverseSupplyLength)),U.metresToFeet(75));
      } else if(mode==="apparatusMounted") {
        await page.selectOption("#apparatusFogFlow","custom"); await page.fill("#apparatusCustomFogFlow","3800");
        await page.fill("#apparatusElevation","15"); await page.fill("#masterStreamLoss","1.5");
        await page.click('[data-pressure="custom"]');await page.fill("#customNozzlePressure","");await page.locator("#customNozzlePressure").pressSequentially("7.0");
        near(await page.evaluate(()=>Number(state.customNozzlePressure)),U.barToPsi(7));
        near(await page.evaluate(()=>Number(state.apparatusElevation)),U.metresToFeet(15));
        near(await page.evaluate(()=>operationalResult.elevationLossPsi),U.metresToFeet(15)*.434);
        near(await page.evaluate(()=>Number(state.apparatusCustomFogFlow)),U.litresPerMinuteToGpm(3800));
      } else {
        await page.fill("#pdp","4000");await page.fill("#hoseLength","300");await page.fill("#applianceLoss","-0.5");
        near(await page.evaluate(()=>Number(state.targetGpm)),U.litresPerMinuteToGpm(4000));
        near(await page.evaluate(()=>Number(state.applianceLoss)),U.barToPsi(-.5));
        await page.selectOption("#relayResidualPressure","40");
        assert.equal(await page.evaluate(()=>state.relayResidualPressure),"40");
      }
      const pressureField = mode === "relay" ? "applianceLoss" : "customNozzlePressure";
      const priorPressure = await page.inputValue(`#${pressureField}`);
      await page.fill(`#${pressureField}`, "3.55");
      assert.equal(await page.evaluate(() => operationalResult), null, "invalid pressure retained saveable result");
      assert.equal(await page.evaluate(() => hasValidRenderedCalculation()), false);
      await assertMetric();
      await page.fill(`#${pressureField}`, priorPressure);
      await page.locator("#primaryResultLabel").click();await assertMetric();
      assert.ok(await page.evaluate(()=>operationalResult));
      const expected=await savedSnapshot(),saved=await save(`${mode} metric`);
      assert.deepEqual(saved.setup.result.canonicalOperational,{version:1,...expected.result});
      assert.doesNotMatch(JSON.stringify(saved.setup.result),/bar|kPa|L\/min|kgf/);
      await preferences("metric","kpa");await reload(saved,expected);
      await preferences("us");await reload(saved,expected);
      for(let i=0;i<2;i++) {await preferences("metric","bar","n",true);await preferences("us");}
      console.log(`PASS ${mode}: metric edits, both save origins, bar/kPa/US reload, Browser Back and no dirty state`);
    }
    // Insufficient pressure and HEN range failures must remain unavailable in Metric.
    await configure({...scenarios[0][1],pdp:"20"});
    await preferences("metric");
    assert.equal(await page.evaluate(()=>operationalResult),null);await assertMetric();
    assert.match(await page.locator("#warningsCard").innerText(),/PDP must exceed/);
    await preferences("us");
    await configure({...scenarios[5][1],pdp:"500"});
    await preferences("metric");
    assert.equal(await page.evaluate(()=>operationalResult),null);await assertMetric();
    assert.match(await page.locator("#warningsCard").innerText(),/L\/min/);
    console.log("PASS invalid decimal entry, insufficient pressure, and HEN range failures remain unavailable");
    assert.deepEqual(errors,[]);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
