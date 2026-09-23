// Isolated loopback browser; never reads the user's application storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../www');
const fixture = path.resolve(__dirname, '../fixtures/pump-panel-us-baseline.json');
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
    const setups = await page.evaluate(() => {
      const cases = [
        ['requiredPdp', {nozzleType:'automaticFog',targetGpm:'185',nozzlePressure:'50',hoseSize:'1.75',hoseLength:'200'}],
        ['requiredPdp', {nozzleType:'smoothbore',smoothboreTip:'1.125',nozzlePressure:'50',hoseSize:'2.5',hoseLength:'150',useCustomCoefficient:true,customCoefficient:'1.875'}],
        ['reverse', {nozzleType:'automaticFog',pdp:'150',nozzlePressure:'50',hoseSize:'1.75',hoseLength:'200',reverseSupplyEnabled:true,reverseSupplyLength:'350',reverseSupplyHoseSize:'3'}],
        ['apparatusMounted', {masterStreamType:'smoothbore',smoothboreTip:'1.125',nozzlePressure:'50',apparatusElevation:'20',masterStreamLoss:'25'}],
        ['relay', {targetGpm:'500',hoseSize:'3',hoseLength:'500',relayResidualPressure:'20'}],
        ['splitLay', {splitLay:{supplyLength:'500',attack1Length:'200',attack1NozzleType:'automaticFog',attack1Flow:'185',attackLines:'2',attack2Length:'150',attack2HoseSize:'2.5',attack2NozzleType:'automaticFog',attack2Flow:'250'}}],
        ['standpipeOps', {standpipeOps:{supplyLength:'100',attack1Length:'200',attack1NozzleType:'automaticFog',attack1Flow:'185',attack1Floor:'5',attack2Enabled:true,attack2Length:'150',attack2HoseSize:'2.5',attack2NozzleType:'automaticFog',attack2Flow:'250',attack2Floor:'3'}}]
      ];
      return cases.map(([mode, overrides], index) => {
        const fresh = structuredClone(DEFAULT_STATE);
        const merged = {...fresh,...overrides,mode,splitLay:{...fresh.splitLay,...overrides.splitLay},standpipeOps:{...fresh.standpipeOps,...overrides.standpipeOps}};
        // Select actual catalog identity rather than relying on a rendered tip label.
        if (merged.smoothboreTip) merged.smoothboreTip = SMOOTHBORE_TIPS.find(t => t.diameter === 1.125).id;
        Object.assign(state, merged); populateHoseOptions(); populateSmoothboreTips(true); syncInputsFromState(); syncSplitLayInputsFromState(); syncStandpipeInputsFromState(); syncModeUi(); calculateAndRender();
        const setup = buildCurrentPumpChartSetup({id:`setup-${index}`,name:`Fixture ${index} ${mode}`,notes:'',accentColorID:'blue',timestamp:'2026-09-23T12:00:00.000Z'});
        if (!getAttackPumperSnapshot(setup)) throw Error(`No snapshot: ${mode} ${JSON.stringify(setup)}`);
        return setup;
      });
    });
    const snapshot = await page.evaluate(setups => setups.map((s,i) => ({...getAttackPumperSnapshot(s),id:`line-${i}`,capturedAt:'2026-09-23T12:00:00.000Z'})), setups);
    const compatibility = snapshot.map(({displayCanonical,...line}) => line);
    const render = async lines => {
      await page.evaluate(lines => {state.mode='attackPumper';saveAttackPumperIncident({version:1,lines});syncModeUi();renderAttackPumperIncident();}, lines);
      return {pressure:await page.locator('#attackPumperPressure').innerText(),flow:await page.locator('#attackPumperTotalFlow').innerText(),cards:await page.locator('#attackPumperLines').innerText()};
    };
    const golden = {setups,lines:compatibility,single:await render([snapshot[0]]),multiple:await render(snapshot)};
    const legacy = [{...compatibility[0],id:'fraction-a',gpm:'1.2',pdp:'98.25',frictionLoss:'S 12 • A 32',hoseSummary:'Unversioned 200\' • 1¾" • NP 50'}, {...compatibility[1],id:'fraction-b',gpm:'1.2',pdp:'98.25'}];
    golden.fractional = await render(legacy);
    if (capture) fs.writeFileSync(fixture,JSON.stringify(golden,null,2)+'\n');
    else {
      const expected = JSON.parse(fs.readFileSync(fixture));
      assert.deepEqual(golden, expected);
      const U = require('../../www/js/units'), P = require('../../www/js/pump-panel-units');
      const incidentBytes = () => page.evaluate(() => localStorage.getItem(ATTACK_PUMPER_INCIDENT_KEY));
      const read = async () => JSON.parse(await incidentBytes());
      const preferences = async (unitSystem,metricPressureUnit='bar') => page.evaluate(p => {
        localStorage.setItem(ReverseFlowUnits.STORAGE_KEY,JSON.stringify({version:1,metricReactionUnit:'n',...p}));
        dispatchEvent(new StorageEvent('storage',{key:ReverseFlowUnits.STORAGE_KEY}));
      },{unitSystem,metricPressureUnit});
      const inspect = async () => {
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>390),false,'document overflow');
        assert.deepEqual(await page.locator('#attackPumperWorkspace').evaluate(el => [...el.querySelectorAll('strong,button,p')].filter(e => {
          const r=e.getBoundingClientRect();return r.width&&(r.left<0||r.right>390||e.scrollWidth>e.clientWidth+1);
        }).map(e=>({class:e.className,text:e.textContent}))),[],'clipped panel values');
        assert.deepEqual(await page.locator('.attack-pumper-metric').evaluateAll(workspaces => workspaces.flatMap(w => [...w.querySelectorAll('.attack-pumper-header-metric strong')].filter(e => e.scrollWidth>e.parentElement.clientWidth+1).map(e=>e.textContent))),[],'clipped header aggregate');
        assert.deepEqual(await page.locator('.attack-pumper-metric .attack-pumper-line-flow strong').evaluateAll(values => values.filter(e=>e.getBoundingClientRect().height>parseFloat(getComputedStyle(e).lineHeight)*1.4).map(e=>e.textContent)),[],'wrapped Metric flow number');
      };
      await render([...legacy,...snapshot]);
      const bytes = await incidentBytes();
      for(let cycle=0;cycle<3;cycle++)for(const [system,pressure] of [['metric','bar'],['metric','kpa'],['us','bar']]) {
        await preferences(system,pressure);assert.equal(await incidentBytes(),bytes);
        const p={unitSystem:system,metricPressureUnit:pressure};
        const lines=[...legacy,...snapshot], total=lines.reduce((sum,l)=>sum+Number(l.gpm),0), max=Math.max(...lines.map(l=>Number(l.pdp)));
        assert.equal(await page.locator('#attackPumperPressure').innerText(),P.format(max,'pressure',p));
        assert.equal(await page.locator('#attackPumperTotalFlow').innerText(),P.format(total,'flow',p));
        const cards=page.locator('.attack-pumper-line');
        for(let i=0;i<lines.length;i++) {
          const d=P.details(lines[i],p),card=cards.nth(i);
          assert.equal(await card.locator('.attack-pumper-line-friction strong').innerText(),d.frictionLoss);
          assert.equal(await card.locator('.attack-pumper-hose-summary').innerText(),d.hoseSummary);
          assert.equal(await card.locator('.attack-pumper-legacy-note').count(),d.legacyLoss||d.legacySummary?1:0);
        }
        await inspect();
        if(cycle===0)await page.screenshot({path:`/tmp/reverse-flow-4a-${system==='us'?'us':pressure}.png`,fullPage:true});
      }
      // Reload never upgrades legacy lines or recaptures new lines.
      await page.reload();await ready();assert.equal(await incidentBytes(),bytes);
      for(const back of [false,true]) {
        await page.click('a[href="settings.html"]');await ready();await page.click('#unitPreferences > summary');
        await page.check('input[name="unitSystem"][value="metric"]');
        await page.check(`input[name="metricPressureUnit"][value="${back?'kpa':'bar'}"]`);
        if(back)await page.goBack();else await page.click('a[href="index.html"]');await ready();
        assert.equal(await incidentBytes(),bytes);assert.match(await page.locator('#attackPumperPressure').innerText(),back?/kPa$/:/bar$/);await inspect();
      }
      // Picker uses existing records; normalize once before recording bytes.
      await page.evaluate(setups=>{savePumpCharts({version:2,charts:[{id:'fixture-chart',name:'Fixture chart',createdAt:'2026-09-23T12:00:00.000Z',updatedAt:'2026-09-23T12:00:00.000Z',setups}]});loadPumpCharts();},setups);
      const chartBytes=await page.evaluate(()=>localStorage.getItem(PUMP_CHARTS_KEY));
      await page.click('#attackPumperAddLine');
      assert.match(await page.locator('#pumpChartList').innerText(),/L\/min.*Gate To.*kPa/);
      assert.match(await page.locator('#pumpChartList').innerText(),/45 mm/);
      assert.equal(await page.evaluate(()=>localStorage.getItem(PUMP_CHARTS_KEY)),chartBytes);
      await page.screenshot({path:'/tmp/reverse-flow-4a-picker.png',fullPage:true});
      await preferences('metric','bar');assert.match(await page.locator('#pumpChartList').innerText(),/Gate To.*bar/);
      assert.equal(await incidentBytes(),bytes);
      await page.locator('.attack-pumper-setup-choice').first().click();
      let lines=(await read()).lines;assert.equal(lines.length,10);assert.ok(lines.at(-1).displayCanonical);
      const firstId=lines[0].id;
      await page.locator('.attack-pumper-line').first().click();await page.locator('.attack-pumper-setup-choice').nth(1).click();
      lines=(await read()).lines;assert.equal(lines[0].id,firstId);assert.equal(lines[0].sourceSetupId,'setup-1');
      // Duplicate source is a new detached line; missing replacement target still appends.
      await page.evaluate(()=>openAttackPumperPumpChart('missing-line'));await page.locator('.attack-pumper-setup-choice').nth(1).click();
      lines=(await read()).lines;assert.equal(lines.length,11);assert.equal(lines.at(-1).sourceSetupId,'setup-1');assert.notEqual(lines.at(-1).id,firstId);
      const detached=await incidentBytes();
      await page.evaluate(()=>{const data=loadPumpCharts();data.charts[0].setups[0].inputs.hoseLength='9999';savePumpCharts(data);saveHoseCoefficient('1.75',1);savePumpCharts({version:2,charts:[]});renderAttackPumperIncident();});
      assert.equal(await incidentBytes(),detached);
      await preferences('us');await page.reload();await ready();assert.equal(await incidentBytes(),detached);
      // Keyboard and pointer deletion use their existing handlers.
      await page.waitForTimeout(350);await page.locator('.attack-pumper-line').first().press('Delete');await page.waitForFunction(()=>loadAttackPumperIncident().lines.length===10);
      assert.equal((await read()).lines.length,10);
      const card=page.locator('.attack-pumper-line').first();await card.scrollIntoViewIfNeeded();const rect=await card.boundingBox();
      await page.mouse.move(rect.x+rect.width-30,rect.y+30);await page.mouse.down();await page.mouse.move(rect.x+30,rect.y+30,{steps:10});await page.mouse.up();await page.waitForTimeout(250);
      assert.equal((await read()).lines.length,9);
      accept=false;const beforeEnd=await incidentBytes();await page.click('#attackPumperEndIncident');assert.equal(await incidentBytes(),beforeEnd);
      accept=true;await page.click('#attackPumperEndIncident');assert.deepEqual((await read()).lines,[]);
      // Metric-originated explicit calculator edits reach the same canonical save boundary.
      await preferences('metric','bar');
      await page.evaluate(()=>{state.mode='requiredPdp';state.nozzleType='automaticFog';state.hoseSize='1.75';state.hoseLength='200';state.nozzlePressure='50';state.targetGpm='185';syncInputsFromState();syncModeUi();calculateAndRender();});
      await page.fill('#pdp','700');
      const metricSetup=await page.evaluate(()=>buildCurrentPumpChartSetup({id:'metric-origin',name:'Metric origin',timestamp:'2026-09-23T12:00:00.000Z'}));
      assert.ok(Math.abs(Number(metricSetup.inputs.targetGpm)-U.litresPerMinuteToGpm(700))<1e-10);
      const metricLine=await page.evaluate(s=>getAttackPumperSnapshot(s),metricSetup);
      assert.ok(metricLine.displayCanonical);assert.equal(metricLine.gpm,Math.round(U.litresPerMinuteToGpm(700)));
      await render([metricLine]);const metricBytes=await incidentBytes();await preferences('us');assert.equal(await incidentBytes(),metricBytes);
      console.log('PASS mixed/legacy/canonical capture, bar/kPa, no drift, settings/back, picker, add/replace/delete/end, detached state, Metric-origin edit, 390px layout');
    }
    assert.deepEqual(errors, []);
    console.log(capture ? 'Captured pre-edit Pump Panel baselines for all six source modes.' : 'Pump Panel exact U.S. browser baselines passed.');
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => {console.error(e);process.exitCode=1;});
