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

    page.on('dialog',d=>d.accept());
    await page.goto(base+'/index.html'); await ready();
    const U=require('../../www/js/units'),B=require('../../www/js/required-pdp-units');
    const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
    const lines={supplyLength:'300',supplyHoseSize:'3',attack1Length:'150',attack1HoseSize:'1.88',attack1NozzleType:'automaticFog',attack1NozzlePressure:'50',attack1Flow:'185',attack1SmoothboreTip:'7/8',attack2Length:'200',attack2HoseSize:'1.75',attack2NozzleType:'smoothbore',attack2NozzlePressure:'50',attack2Flow:'200',attack2SmoothboreTip:'15/16'};
    const split={...lines,sectionCount:'3',attackLines:'2',appliance1:'gateValve',appliance2:'gatedWye',supply2Length:'100',supply2HoseSize:'2.5'};
    const standpipe={...lines,attack1Floor:'8',attack2Floor:'12',attack2Enabled:true,standpipeLoss:'25',dualSupply:true};
    const scenarios=[
      ['split-asymmetric','splitLay',split],
      ['split-custom-coefficient','splitLay',{...split,attack1NozzlePressure:'75'},9.125],
      ['split-fixed-dual','splitLay',{...split,dualSupply:true,appliance1:'siamese',attack2NozzleType:'fixedFog',attack2RatedFlow:'185',attack2RatedPressure:'50'}],
      ['standpipe-asymmetric','standpipeOps',standpipe],
      ['standpipe-fixed','standpipeOps',{...standpipe,attack1NozzleType:'fixedFog',attack1RatedFlow:'185',attack1RatedPressure:'50'}],
      ...[249.999,250,250.001].map(flow=>[`standpipe-boundary-${flow}`,'standpipeOps',{...standpipe,attack1Flow:String(flow),attack2Flow:String(flow),attack2Floor:'8',attack2NozzleType:'automaticFog',attack2HoseSize:'1.88',attack2Length:'150'}]),
      ['wye-asymmetric','wyeOps',lines],
      ['wye-custom-coefficient','wyeOps',lines,10.2],
      ['wye-custom','wyeOps',{...lines,attack1NozzleType:'smoothbore',attack1SmoothboreTip:'custom',attack1CustomTip:'0.9',attack2NozzleType:'fixedFog',attack2RatedFlow:'185',attack2RatedPressure:'50'}],
      ['wye-balanced','wyeOps',{...lines,attack2Length:'150',attack2HoseSize:'1.88',attack2NozzleType:'automaticFog',attack2Flow:'185'}]
    ];
    const fixturePath=path.resolve(__dirname,'../fixtures/multiline-us-baseline.json');
    const golden=process.env.US_BASELINE_ROOT?{}:JSON.parse(fs.readFileSync(fixturePath));
    async function configure(mode,section,coefficient=null) {
      await page.evaluate(({mode,section,coefficient})=>{
        localStorage.removeItem(HOSE_COEFFS_KEY);
        if(coefficient!==null)saveHoseCoefficient("1.88",coefficient);
        clearPumpChartEditState();
        state={...JSON.parse(JSON.stringify(DEFAULT_STATE)),mode,applianceLoss:'-10'};
        Object.assign(state[mode],section);
        if(typeof wyeClosedLine!=='undefined') wyeClosedLine=null;
        populateHoseOptions();populateSmoothboreTips(true);
        syncSplitLayInputsFromState();syncInputsFromState();syncSplitLayInputsFromState();syncSplitLayUi();syncStandpipeInputsFromState();syncStandpipeUi();
        rerenderWyeOpsFields();renderPressureButtons();calculateAndRender();saveState();
      },{mode,section,coefficient});
    }
    const snap=()=>page.evaluate(()=>({state:JSON.stringify(state),result:multiLineResult,closed:wyeClosedLine}));
    const savedSnap=()=>page.evaluate(()=>({inputs:getComparablePumpChartInputs(buildPresetData()),result:multiLineResult}));
    async function output(mode) {
      const selector={splitLay:'#splitResultsCard',standpipeOps:'#standpipeResultsCard',wyeOps:'#wyeCurrentResults'}[mode];
      const result=await page.locator(selector).innerText();
      const warnings=await page.locator('#warningsCard').innerText();
      if(mode!=='wyeOps') return {result,warnings};
      await page.click('#wyeAttack1ClosesButton');const close1=await page.locator('#wyeClosureResults').innerText();
      await page.click('#wyeBackToCurrentButton');await page.click('#wyeAttack2ClosesButton');const close2=await page.locator('#wyeClosureResults').innerText();
      await page.click('#wyeBackToCurrentButton');
      return {result,warnings,close1,close2};
    }
    async function prefs(unitSystem,pressure='bar',back=false) {
      const before=await snap(),stored=await persisted();
      await page.locator('a[href="settings.html"]').click();await page.locator('#unitPreferences > summary').click();
      await page.check(`input[name="unitSystem"][value="${unitSystem}"]`);
      if(unitSystem==='metric') {await page.check(`input[name="metricPressureUnit"][value="${pressure}"]`);await page.check(`input[name="metricReactionUnit"][value="${pressure==='bar'?'n':'kgf'}"]`);}
      if(back) await page.goBack();else await page.locator('a[href="index.html"]').click();await ready();
      assert.deepEqual(await snap(),before,'preference-only switch changed canonical state/result/view');
      assert.deepEqual(await persisted(),stored,'preference changed saved bytes/timestamps');
    }
    async function metricUi(mode) {
      const texts=await page.evaluate(mode=>[
        'calculatorInputCard',mode==='splitLay'?'splitResultsCard':mode==='standpipeOps'?'standpipeResultsCard':'wyeOpsFields','warningsCard'
      ].map(id=>document.getElementById(id)?.innerText||'').join('\n'),mode);
      assert.doesNotMatch(texts,/\bPSI\b|\bpsi\b|\bGPM\b|\bfeet\b|\blb\b|\bft\b/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile overflow');
    }
    for(const [name,mode,section,coefficient] of scenarios) {
      if(process.env.ONLY_MODE) continue;
      await configure(mode,section,coefficient);
      const us=await output(mode);
      if(process.env.US_BASELINE_ROOT){golden[name]=us;continue;}
      assert.deepEqual(us,golden[name],`${name}: pre-edit U.S. result/closure mismatch`);
      assert.ok(await page.evaluate(()=>multiLineResult),`${name}: canonical result missing`);
      for(const pressure of ['bar','kpa']) {
        await prefs('metric',pressure);await metricUi(mode);
        if(mode==='splitLay' && section.attack1NozzleType==='automaticFog') assert.equal(await page.locator('#splitAttack1Flow').isVisible(),true,'restored fog flow must stay visible');
        const r=await page.evaluate(()=>multiLineResult);
        const expected=B.format(Math.round(mode==='splitLay'?r.totalPdp:mode==='standpipeOps'?r.requiredPdp:r.fixedPdp),'pressure',U.normalizePreferences({unitSystem:'metric',metricPressureUnit:pressure}));
        if(mode==='wyeOps') assert.match(await page.locator('#wyeCurrentResults .split-results-header').innerText(),new RegExp(expected.replace('.','\\.')));
        else assert.equal(await page.locator(mode==='splitLay'?'#splitPrimaryPdp':'#standpipePrimaryPdp').textContent(),expected);
        if(mode==='standpipeOps') assert.equal(await page.inputValue('#standpipeAttack1Floor'),section.attack1Floor);
        await page.screenshot({path:`/tmp/phase2c-${name}-${pressure}.png`,fullPage:true});
      }
      if(mode==='wyeOps') {await page.click('#wyeAttack1ClosesButton');await prefs('metric','bar');assert.equal(await page.locator('#wyeClosureResults').isVisible(),true);await metricUi(mode);await page.click('#wyeBackToCurrentButton');}
      await prefs('us');assert.deepEqual(await output(mode),golden[name],`${name}: U.S. restore`);
      console.log(`PASS ${name}: exact U.S. baseline, bar/kPa parity, closure and floor preservation`);
    }
    if(process.env.US_BASELINE_ROOT){fs.writeFileSync(fixturePath,JSON.stringify(golden,null,2)+'\n');return;}
    async function save(name,mode) {
      await page.evaluate(()=>openSavePumpChartSheet());
      if(await page.locator('#pumpChartNewName').isVisible())await page.fill('#pumpChartNewName','Phase 2C Engine');
      await page.fill('#pumpChartSetupName',name);await page.locator('#pumpChartSaveForm button[type="submit"]').click();
      const item=await page.evaluate(()=>{const c=loadPumpCharts().charts[0];return {chartId:c.id,setup:c.setups.at(-1)};});
      await page.click('#closePumpChartModal');return item;
    }
    async function reload(item,expected,mode) {
      await page.evaluate(({chartId,setup})=>loadPumpChartSetup(chartId,setup.id),item);
      assert.deepEqual(await savedSnap(),expected);
      assert.equal(await page.locator(mode==='splitLay'?'#updatePumpChartSetupButtonSplit':'#updatePumpChartSetupButtonStandpipe').isVisible(),false);
    }
    for(const mode of ['splitLay','standpipeOps','wyeOps']) {
      if(process.env.ONLY_MODE && process.env.ONLY_MODE!==mode) continue;
      const prefix={splitLay:'split',standpipeOps:'standpipe',wyeOps:'wye'}[mode];
      const section=mode==='splitLay'?split:mode==='standpipeOps'?standpipe:lines;
      await configure(mode,section);
      const expectedUs=await savedSnap();const savedUs=mode==='wyeOps'?null:await save(mode+' US',mode);
      await prefs('metric');if(savedUs)await reload(savedUs,expectedUs,mode);
      const other=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(state[state.mode]).filter(([k])=>k.startsWith('attack2')))));
      await page.fill(`#${prefix}Attack1Length`,'60');
      await page.click(`#${prefix}Attack1Length + button`);
      near(await page.evaluate(()=>Number(state[state.mode].attack1Length)),U.metresToFeet(75));
      assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(state[state.mode]).filter(([k])=>k.startsWith('attack2'))))),other,'line 1 edit reparsed line 2');
      await page.fill(`#${prefix}SupplyLength`,'90');
      if(mode==='splitLay'){
        await page.fill('#splitSupply2Length','45');await page.fill('#applianceLoss','-0.5');
        near(await page.evaluate(()=>Number(state.applianceLoss)),U.barToPsi(-.5));
        await page.selectOption('#splitAttack2NozzleType','fixedFog');await page.fill('#splitAttack2Flow','700');await page.fill('#splitAttack2RatedFlow','700');await page.fill('#splitAttack2RatedPressure','3.5');
      }else if(mode==='standpipeOps'){
        await page.fill('#standpipeAttack1Floor','9');assert.equal(await page.inputValue('#standpipeAttack1Floor'),'9');
        await page.fill('#standpipeLoss','3.5');near(await page.evaluate(()=>Number(state.standpipeOps.standpipeLoss)),U.barToPsi(3.5));
        await page.click('#standpipeRemoveOutletButton');await page.click('#standpipeAddOutletButton');
        near(await page.evaluate(()=>Number(state.standpipeOps.attack2Length)),U.metresToFeet(75));
        assert.equal(await page.inputValue('#standpipeAttack2Floor'),'9');
      }else{
        await page.selectOption('#wyeAttack1Pressure','custom');await page.fill('#wyeAttack1CustomPressure','7.0');near(await page.evaluate(()=>Number(state.wyeOps.attack1CustomPressure)),U.barToPsi(7));
        await page.selectOption('#wyeAttack2Tip','custom');await page.fill('#wyeAttack2CustomTip','22.225');near(await page.evaluate(()=>Number(state.wyeOps.attack2CustomTip)),.875);
        await page.click('#wyeAttack2ClosesButton');assert.equal(await page.evaluate(()=>wyeClosedLine),2);await prefs('metric','kpa',true);;await page.click('#wyeBackToCurrentButton');await prefs('metric','bar');
      }
      const pressureId = mode==='splitLay' ? 'splitAttack2RatedPressure' : mode==='standpipeOps' ? 'standpipeLoss' : 'wyeAttack1CustomPressure';
      const prior = await page.inputValue(`#${pressureId}`);
      await page.fill(`#${pressureId}`,'3.55');
      assert.equal(await page.evaluate(()=>multiLineResult),null,'invalid metric pressure retained a result');
      await metricUi(mode);
      await page.fill(`#${pressureId}`,prior);
      await page.locator('#modeHelper').click();await metricUi(mode);assert.ok(await page.evaluate(()=>multiLineResult));
      const expected=await savedSnap();
      if(mode!=='wyeOps'){
        const saved=await save(mode+' metric',mode);
        assert.deepEqual(saved.setup.result.canonicalMultiLine,{version:1,...expected.result});
        assert.doesNotMatch(JSON.stringify(saved.setup.result),/bar|kPa|L\/min|kgf/);
        await prefs('metric','kpa');await reload(saved,expected,mode);await prefs('us');await reload(saved,expected,mode);
      }else await prefs('us');
      for(let i=0;i<2;i++){await prefs('metric','bar',true);await prefs('us');}
      console.log(`PASS ${mode}: independent metric edits, increments, transitions, save scope and no rounding drift`);
    }
    assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
