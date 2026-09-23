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
    browser = await chromium.launch({ headless: true, ...(process.env.DISABLE_BFCACHE ? { args: ["--disable-features=BackForwardCache"] } : {}), ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
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
    const cases=[];
    for(const [size,flow,custom]of [['500','150'],['3000','500'],['custom','185','725.25']])cases.push({tool:'tank-time',fields:{tankTimeSize:size,...(custom?{tankTimeCustomSize:custom}:{}),tankTimeFlow:flow}});
    for(const [target,capacities,times]of [['500',['3000','3000'],['1','2','3','4']],['200',['1800','3250'],['1.5','2.25','3.5','4']],['1000',['1800','3250'],['1','4','2','5']]])cases.push({tool:'water-shuttle',fields:{waterShuttleTargetFlow:target},tenders:capacities.map((capacity,i)=>[capacity,...times.map(t=>String(Number(t)+i))])});
    for(const target of ['20','10','0','19.999','20.001','-0.001','0.001','49.999','50','50.001','79.999','80','80.001'])cases.push({tool:'estimated-remaining-supply',fields:{remainingSupplyStaticPressure:'80',remainingSupplyResidualPressure:'50',remainingSupplyCurrentFlow:'1000',remainingSupplyTargetResidual:['20','10','0'].includes(target)?target:'custom',...(!['20','10','0'].includes(target)?{remainingSupplyCustomTarget:target}:{})}});
    for(const drop of [4.999,5,5.001,0,-.001,.001])cases.push({tool:'estimated-remaining-supply',fields:{remainingSupplyStaticPressure:'80',remainingSupplyResidualPressure:String(80-drop),remainingSupplyCurrentFlow:'750'}});
    for(const pressure of ['-0.001','0','0.001']){
      cases.push({tool:'estimated-remaining-supply',fields:{remainingSupplyStaticPressure:pressure,remainingSupplyResidualPressure:'0',remainingSupplyCurrentFlow:'100',remainingSupplyTargetResidual:'0'}});
      cases.push({tool:'estimated-remaining-supply',fields:{remainingSupplyStaticPressure:'80',remainingSupplyResidualPressure:pressure,remainingSupplyCurrentFlow:'100',remainingSupplyTargetResidual:'0'}});
    }
    const fixture=path.resolve(__dirname,'../fixtures/supply-tools-us-baseline.json');
    const golden=process.env.US_BASELINE_ROOT?[]:JSON.parse(fs.readFileSync(fixture));
    const set=async(id,value)=>{if(await page.locator('#'+id).evaluate(e=>e.tagName==='SELECT'))await page.selectOption('#'+id,value);else await page.fill('#'+id,value);};
    const output=()=>page.locator('#fieldCalculatorBody').evaluate(body=>[...body.querySelectorAll('[id$="Results"],[id$="Validation"],[id$="Caution"],[id$="Warning"],[id$="Breakdown"]')].map(e=>({id:e.id,hidden:e.hidden,text:e.innerText})));
    const U=require('../../www/js/units'),H=require('../../www/js/hydraulics-core'),B=require('../../www/js/required-pdp-units');
    const snap=()=>page.evaluate(()=>ReverseFlowActiveTool.snapshot());
    const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
    const prefs=async(unitSystem,metricPressureUnit='bar')=>page.evaluate(p=>{localStorage.setItem('reverse-flow-unit-preferences-v1',JSON.stringify({version:1,metricReactionUnit:'n',...p}));dispatchEvent(new StorageEvent('storage'));},{unitSystem,metricPressureUnit});
    const hidden=()=>page.locator('#fieldCalculatorBody').evaluate(b=>[...b.querySelectorAll('[id$="Results"],[id$="Validation"],[id$="Caution"],[id$="Warning"]')].map(e=>e.hidden));
    async function inspect(){
      const ui=await page.locator('#fieldCalculatorBody').evaluate(b=>{const copy=b.cloneNode(true);copy.querySelectorAll('.formula').forEach(e=>e.remove());return {text:copy.textContent,placeholders:[...b.querySelectorAll('input')].map(e=>e.placeholder),bad:[...b.querySelectorAll('input,select,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left<0||r.right>390);}).map(e=>e.id),overflow:document.documentElement.scrollWidth>390};});
      assert.equal(ui.overflow,false);assert.deepEqual(ui.bad,[]);assert.doesNotMatch(ui.text,/\b(?:gal|gallons|GPM|psi)\b/i);assert.doesNotMatch(ui.placeholders.join(' '),/\b(?:gal|gallons|GPM|psi)\b/i);
    }
    for(const [i,c]of cases.entries()) {
      await page.goto(base+'/tools.html?calculator='+c.tool);await ready();
      for(const [id,value]of Object.entries(c.fields))await set(id,value);
      if(c.tenders)for(const [index,values]of c.tenders.entries()) {
        if(index)await page.click('#waterShuttleAddTender');
        for(const [j,key]of ['tankSize','dumpSceneTime','timeToHydrant','fillTime','timeToScene'].entries())await set('waterShuttleTender'+index+key,values[j]);
      }
      const actual=await output();
      if(process.env.US_BASELINE_ROOT)golden.push(actual);else assert.deepEqual(actual,golden[i]);
      console.log('PASS US '+i+' '+c.tool);
      if(!process.env.US_BASELINE_ROOT){
        const canonical=await snap(),visibility=await hidden();
        for(let repeat=0;repeat<3;repeat++)for(const [system,pressure]of [['metric','bar'],['metric','kpa'],['us','bar']]){
          await prefs(system,pressure);assert.deepEqual(await snap(),canonical);assert.deepEqual(await hidden(),visibility,'threshold drift');
          if(system==='metric'){
            await inspect();
            if(c.tool==='tank-time')for(const option of await page.locator('#tankTimeSize option[data-unit-quantity]').evaluateAll(options=>options.map(o=>({value:o.value,text:o.textContent}))))assert.equal(option.text,B.format(Number(option.value),'volume',{unitSystem:'metric'}));
            if(c.tool==='tank-time'&&c.fields.tankTimeSize!=='custom')assert.equal(await page.locator('#tankTimeSize option:checked').innerText(),B.format(Number(c.fields.tankTimeSize),'volume',{unitSystem:'metric'}));
            if(c.tenders)for(let j=0;j<c.tenders.length;j++)for(const [k,key]of ['dumpSceneTime','timeToHydrant','fillTime','timeToScene'].entries())assert.equal(await page.inputValue('#waterShuttleTender'+j+key),c.tenders[j][k+1]);
            if(c.tool==='estimated-remaining-supply')assert.equal(await page.locator('#remainingSupplyTargetResidual option[value="20"]').getAttribute('value'),'20');
          }
        }
        assert.deepEqual(await output(),golden[i]);
      }
    }
    if(process.env.US_BASELINE_ROOT)fs.writeFileSync(fixture,JSON.stringify(golden,null,2)+'\n');
    if(!process.env.US_BASELINE_ROOT){
      async function settingsReturn(before,back=false){
        const bytes=await persisted();await page.click('a[href="settings.html"]');await ready();await page.click('#unitPreferences > summary');await page.check('input[name="unitSystem"][value="metric"]');await page.check('input[name="metricPressureUnit"][value="kpa"]');
        if(back)await page.goBack();else await page.click('a[href^="tools.html"]');await ready();
        await page.waitForFunction(()=>document.querySelector('#fieldCalculatorBody input[placeholder="L/min"]'));
        assert.deepEqual(await snap(),before);assert.deepEqual(await persisted(),bytes);await inspect();
      }
      for(const tool of ['tank-time','water-shuttle','estimated-remaining-supply']){
        await prefs('metric');await page.goto(base+'/tools.html?calculator='+tool);await ready();
        if(tool==='tank-time'){
          await set('tankTimeSize','custom');await set('tankTimeCustomSize','2000');await set('tankTimeFlow','700');
          const r=(await snap()).result;near(r.gallons,U.litresToGallons(2000));near(r.flowGpm,U.litresPerMinuteToGpm(700));assert.equal(r.durationSeconds,Math.round(2000/700*60));
        }else if(tool==='water-shuttle'){
          await set('waterShuttleTargetFlow','1500');
          for(const [index,capacity]of ['7000','12345'].entries()){
            if(index)await page.click('#waterShuttleAddTender');
            await set('waterShuttleTender'+index+'tankSize',capacity);
            for(const [j,key]of ['dumpSceneTime','timeToHydrant','fillTime','timeToScene'].entries())await set('waterShuttleTender'+index+key,String(j+index+.5));
          }
          let state=await snap();near(Number(state.extra[0].tankSize),U.litresToGallons(7000));near(Number(state.extra[1].tankSize),U.litresToGallons(12345));
          const other=state.extra[1];await set('waterShuttleTender0tankSize','7500');assert.deepEqual((await snap()).extra[1],other);
          state=await snap();near(state.result.totalSustainedFlowGpm,U.litresToGallons(7500)/8+U.litresToGallons(12345)/12);
          await page.click('#waterShuttleAddTender');assert.equal((await snap()).extra[2].tankSize,'3000');assert.equal(await page.inputValue('#waterShuttleTender2tankSize'),'11356');await page.click('[data-remove-water-shuttle-tender="2"]');assert.deepEqual((await snap()).extra,state.extra);
        }else{
          await set('remainingSupplyStaticPressure','5.5');await set('remainingSupplyResidualPressure','3.5');await set('remainingSupplyCurrentFlow','3800');
          const r=(await snap()).result;near(r.staticPsi,U.barToPsi(5.5));near(r.residualPsi,U.barToPsi(3.5));assert.equal(r.targetPsi,20);near(r.projectedFlowGpm,H.estimatedSupply({staticPressure:r.staticPsi,residualPressure:r.residualPsi,currentFlow:r.flowGpm,targetResidual:20}).projectedFlow);
        }
        const canonical=await snap();await inspect();await page.screenshot({path:'/tmp/reverse-flow-3b-'+tool+'-bar.png',fullPage:true});
        await prefs('us');await settingsReturn(canonical,Boolean(process.env.DISABLE_BFCACHE));
        await page.screenshot({path:'/tmp/reverse-flow-3b-'+tool+'-kpa.png',fullPage:true});
        await prefs('us');await settingsReturn(canonical,true);
        await prefs('us');assert.deepEqual(await snap(),canonical);
        for(const [id,value]of Object.entries(canonical.values))if(value!==null)assert.equal(await page.inputValue('#'+id),String(value));
        await prefs('metric');
        if(tool==='water-shuttle'){
          await set('waterShuttleTender0tankSize','123456');await set('waterShuttleTargetFlow','99999');await inspect();
          assert.match(await page.locator('#waterShuttleResults').innerText(),/Deficit/);
          await page.screenshot({path:'/tmp/reverse-flow-3b-shuttle-long-deficit.png',fullPage:true});
        }
        const id=tool==='tank-time'?'tankTimeCustomSize':tool==='water-shuttle'?'waterShuttleTender0tankSize':'remainingSupplyStaticPressure';
        await set(id,tool==='estimated-remaining-supply'?'5.55':'2000.5');assert.equal((await snap()).result,null);await inspect();
        await page.goto(base+'/tools.html?calculator='+tool);await ready();assert.equal((await snap()).result,null);
        console.log('PASS metric edits, state, time, Settings/Back and mobile '+tool);
      }
      // Empty time fields retain existing zero contribution; temporal decimals are not unit edits.
      await prefs('metric');await page.goto(base+'/tools.html?calculator=water-shuttle');await ready();await set('waterShuttleTargetFlow','100');await set('waterShuttleTender0dumpSceneTime','2.25');
      assert.equal((await snap()).result.tenders[0].cycleMinutes,2.25);await set('waterShuttleTender0fillTime','-1');assert.equal((await snap()).result,null);await inspect();
      // Direct kPa edits and explicit custom target zero.
      await prefs('metric','kpa');await page.goto(base+'/tools.html?calculator=estimated-remaining-supply');await ready();
      for(const [id,value]of Object.entries({remainingSupplyStaticPressure:'550',remainingSupplyResidualPressure:'350',remainingSupplyCurrentFlow:'3800',remainingSupplyTargetResidual:'custom',remainingSupplyCustomTarget:'0'}))await set(id,value);
      const r=(await snap()).result;near(r.staticPsi,U.kpaToPsi(550));assert.equal(r.targetPsi,0);assert.equal(await page.locator('#remainingSupplyTargetWarning').isVisible(),true);
      await set('remainingSupplyCustomTarget','0.5');assert.equal((await snap()).result,null);await inspect();
    }
    assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
