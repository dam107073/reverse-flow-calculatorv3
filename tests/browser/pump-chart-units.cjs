// Isolated loopback browser; never reads the user's application storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../www');
const fixture = path.resolve(__dirname, '../fixtures/pump-chart-us-baseline.json');
const capture = process.env.CAPTURE_BASELINE === '1';
(async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) return res.writeHead(404).end();
    fs.readFile(file, (e, data) => {
      if (e) return res.writeHead(404).end();
      res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({headless:true, channel:process.env.PLAYWRIGHT_CHANNEL || "chrome", ...(process.env.DISABLE_BFCACHE ? {args:['--disable-features=BackForwardCache']} : {})});
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const base = `http://127.0.0.1:${server.address().port}`;
    await context.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let accept = true; page.on('dialog', d => accept ? d.accept() : d.dismiss());
    const ready = () => page.waitForFunction(() => typeof state !== 'undefined' && document.body.classList.contains('access-ready'));
    await page.goto(base + '/index.html'); await ready();
    const sources = require('../fixtures/pump-panel-us-baseline.json').setups;
    const setups = await page.evaluate(sources => {
      const fixed = structuredClone(sources[0]);
      Object.assign(state, fixed.inputs, {mode:'requiredPdp',nozzleType:'fixedFog',ratedFlow:'185',ratedPressure:'50',targetGpm:'200'});
      syncInputsFromState();syncModeUi();calculateAndRender();
      const fresh = buildCurrentPumpChartSetup({id:'fixed-fog',name:'Fixed Fog',notes:'Literal 100 PSI note',timestamp:'2026-09-23T12:00:00.000Z'});
      const legacy = structuredClone(sources[0]);legacy.id='legacy';legacy.name='Legacy';delete legacy.result.canonicalRequiredPdp;
      legacy.result.nozzleDisplay='Historical 1⅛ in at 50 PSI';legacy.warnings=['Saved 500 GPM / 250 PSI warning'];
      const unknown=structuredClone(legacy);unknown.id='unknown';unknown.name='Unknown equipment';unknown.inputs.hoseSize='Custom 45 mm';unknown.inputs.smoothboreTip='Unknown tip 7';unknown.inputs.nozzleType='smoothbore';
      localStorage.setItem(PRESETS_KEY,JSON.stringify([{id:'old-preset',name:'Imported',mode:'requiredPdp',hoseSize:'1.75',hoseLength:'200',targetGpm:'185',nozzleType:'automaticFog',nozzlePressure:'50',calculatedPdp:'156',calculatedFlow:'185 GPM'}]));
      const imported=migrateLegacyPumpChartPresets().charts[0].setups[0];imported.createdAt=imported.updatedAt='2026-09-23T12:00:00.000Z';
      const all=[...sources,fresh,legacy,unknown,imported];
      savePumpCharts({version:2,charts:[{id:'chart',name:'Baseline chart',department:'Engine',notes:'Literal 500 GPM notes',createdAt:'2026-09-23T12:00:00.000Z',updatedAt:'2026-09-23T12:00:00.000Z',setups:all}]});
      return all;
    },sources);
    const golden = {setups,views:await page.evaluate(setups=>setups.map(s=>{
      renderPumpChartSetupDetail('chart',s.id);
      const projection={configuration:getSetupConfigurationSummary(s),hydraulic:getSetupHydraulicSummary(s),referenceSections:getSetupReferenceSections(s),inputRows:getSetupInputRows(s),breakdownRows:getSetupBreakdownRows(s)};
      return {row:renderPumpChartSetupRow('chart',s),detail:els.pumpChartList.innerHTML,projection};
    }),setups)};
    if(capture)fs.writeFileSync(fixture,JSON.stringify(golden,null,2)+'\n');
    else {
      assert.deepEqual(golden,JSON.parse(fs.readFileSync(fixture)));
      const chartBytes=()=>page.evaluate(()=>localStorage.getItem(PUMP_CHARTS_KEY));
      const prefs=async(unitSystem,metricPressureUnit='bar',metricReactionUnit='n')=>page.evaluate(p=>{
        localStorage.setItem(ReverseFlowUnits.STORAGE_KEY,JSON.stringify({version:1,...p}));
        dispatchEvent(new StorageEvent('storage',{key:ReverseFlowUnits.STORAGE_KEY}));
      },{unitSystem,metricPressureUnit,metricReactionUnit});
      await page.evaluate(()=>{
        state.mode='attackPumper';syncModeUi();renderPumpChartDetail('chart');els.pumpChartModal.hidden=false;
        window.chartWriteCount=0;window.otherWrites=[];
        const original=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){if(key===PUMP_CHARTS_KEY)chartWriteCount++;else otherWrites.push(key);return original.call(this,key,value);};
      });
      const before=await chartBytes();
      // Existing lifecycle normalization writes, even when bytes are stable.
      await page.evaluate(()=>loadPumpCharts());assert.ok(await page.evaluate(()=>chartWriteCount)>0);assert.equal(await chartBytes(),before);
      await page.evaluate(()=>chartWriteCount=0);
      const inspect=async()=>{
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>390),false);
        assert.deepEqual(await page.locator('#pumpChartList').evaluate(el=>[...el.querySelectorAll('button,strong,p')].filter(e=>{
          const r=e.getBoundingClientRect();return r.width&&(r.left<0||r.right>390||e.scrollWidth>e.clientWidth+1);
        }).map(e=>({class:e.className,text:e.textContent}))),[],'clipped chart content');
      };
      for(let repeat=0;repeat<3;repeat++)for(const [system,pressure] of [['metric','bar'],['metric','kpa'],['us','bar']]) {
        await prefs(system,pressure);
        assert.equal(await chartBytes(),before);assert.equal(await page.evaluate(()=>chartWriteCount),0,'new presentation refresh wrote charts');
        await inspect();
        if(system==='metric'){
          const text=await page.locator('#pumpChartList').innerText();assert.match(text,/L\/min/);assert.match(text,/45 mm/);assert.match(text,/Saved details · U.S./);
          assert.match(text,pressure==='bar'?/bar/:/kPa/);
        }
        if(repeat===0)await page.screenshot({path:`/tmp/reverse-flow-4b-rows-${system==='us'?'us':pressure}.png`,fullPage:true});
      }
      assert.equal(await page.locator('[onclick*="viewPumpChartSetup"]').count(),0,'no new detail navigation');
      // Exercise existing unlinked renderer directly; no new UI entry is added.
      for(const setup of setups) {
        await page.evaluate(id=>{renderPumpChartSetupDetail('chart',id);document.querySelector('.pump-chart-advanced-details').open=true;chartWriteCount=0;},setup.id);
        for(const pressure of ['bar','kpa']) {
          await prefs('metric',pressure);
          assert.equal(await page.evaluate(()=>chartWriteCount),0);assert.equal(await chartBytes(),before);
          await inspect();
          for(const warning of setup.warnings)assert.ok((await page.locator('#pumpChartList').innerText()).includes(warning),'saved warning changed');
        }
        if(['setup-0','setup-5','setup-6','legacy'].includes(setup.id))await page.screenshot({path:`/tmp/reverse-flow-4b-detail-${setup.id}.png`,fullPage:true});
        if(setup.id==='legacy'){await page.getByText(setup.warnings[0],{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/reverse-flow-4b-warning.png'});}
        await prefs('us');assert.equal(await page.evaluate(()=>chartWriteCount),0);
      }
      // Cached presentation must not consult current hydraulic coefficients/source records.
      await page.evaluate(()=>{renderPumpChartSetupDetail('chart','setup-0');chartWriteCount=0;});
      await prefs('metric');const savedText=await page.locator('#pumpChartList').innerText();
      await page.evaluate(()=>saveHoseCoefficient('1.75',1));await prefs('metric','kpa');await prefs('metric');
      assert.equal(await page.locator('#pumpChartList').innerText(),savedText);assert.equal(await chartBytes(),before);
      // Load remains canonical and recalculates. Existing dirty-state lookups may normalize/write.
      await page.evaluate(()=>loadPumpChartSetup('chart','setup-0'));
      assert.equal(await page.evaluate(()=>state.hoseLength),'200');assert.equal(await page.evaluate(()=>state.targetGpm),'185');
      assert.equal(await page.locator('#updatePumpChartSetupButton').isVisible(),false);
      const loaded=await page.evaluate(()=>JSON.stringify(getCurrentComparablePumpChartInputs()));
      for(const p of [['us','bar'],['metric','bar'],['metric','kpa']]){
        await prefs(...p);assert.equal(await page.evaluate(()=>JSON.stringify(getCurrentComparablePumpChartInputs())),loaded);
        assert.equal(await page.locator('#updatePumpChartSetupButton').isVisible(),false);assert.equal(await chartBytes(),before);
      }
      for(const back of [false,true]) {
        await page.click('a[href="settings.html"]');await ready();await page.click('#unitPreferences > summary');
        await page.check('input[name="unitSystem"][value="metric"]');await page.check(`input[name="metricPressureUnit"][value="${back?'kpa':'bar'}"]`);
        if(back)await page.goBack();else await page.click('a[href="index.html"]');await ready();
        assert.equal(await chartBytes(),before);assert.equal(await page.evaluate(()=>JSON.stringify(getCurrentComparablePumpChartInputs())),loaded);
        assert.equal(await page.locator('#updatePumpChartSetupButton').isVisible(),false);
      }
      // Metric-originated edit; explicit update changes the record only on confirmation.
      await page.fill('#pdp','700');assert.equal(await page.locator('#updatePumpChartSetupButton').isVisible(),true);
      await page.click('#updatePumpChartSetupButton');
      const updated=await page.evaluate(()=>findPumpChartSetup('chart','setup-0').setup);
      assert.equal(updated.id,'setup-0');assert.equal(updated.createdAt,setups[0].createdAt);assert.notEqual(updated.updatedAt,setups[0].updatedAt);
      const U=require('../../www/js/units');assert.ok(Math.abs(Number(updated.inputs.targetGpm)-U.litresPerMinuteToGpm(700))<1e-10);
      assert.equal(await page.locator('#updatePumpChartSetupButton').isVisible(),false);
      const updatedBytes=await chartBytes();await prefs('us');await page.evaluate(()=>{renderPumpChartDetail('chart');els.pumpChartModal.hidden=false;});
      assert.ok((await page.locator('#pumpChartList').innerText()).includes(updated.result.flowSummary));assert.equal(await chartBytes(),updatedBytes);
      await page.evaluate(()=>loadPumpChartSetup('chart','setup-0'));assert.equal(await page.locator('#updatePumpChartSetupButton').isVisible(),false);
      assert.ok(Math.abs(await page.evaluate(()=>Number(state.targetGpm))-U.litresPerMinuteToGpm(700))<1e-10);
      console.log('PASS Metric rows/details, literal warnings/legacy, all modes, no drift/zero-write screen refresh, existing normalization, reload/dirty/update, Settings/Back, 390px');
    }
    assert.deepEqual(errors,[]);
    console.log(capture?'Captured pre-edit Pump Chart rows/detail baselines':'Exact U.S. Pump Chart rows/detail baselines passed');
  } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
