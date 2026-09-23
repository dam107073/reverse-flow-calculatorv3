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
    const fixture=path.resolve(__dirname,'../fixtures/friction-tools-us-baseline.json');
    const golden=process.env.US_BASELINE_ROOT?{}:JSON.parse(fs.readFileSync(fixture));
    const set=async(id,value)=>{if(await page.locator('#'+id).evaluate(e=>e.tagName==='SELECT'))await page.selectOption('#'+id,String(value));else await page.fill('#'+id,String(value));};
    const check=(id,value)=>{if(process.env.US_BASELINE_ROOT)golden[id]=value;else assert.deepEqual(value,golden[id]);};
    for(const [i,gpm,p1,p2]of [[0,150,100,65],[1,200,150,88],[2,185,120,45]]){
      await page.goto(base+'/tools.html?calculator=coefficient');await ready();
      for(const [id,value]of Object.entries({coefficientHoseSize:'1.75',coefficientFlow:gpm,coefficientGaugeOne:p1,coefficientGaugeTwo:p2}))await set(id,value);
      check('coefficient'+i,await page.locator('#coefficientResults').innerText());
    }
    for(const [i,hose,flow,c]of [[0,'1.75',150,null],[1,'2.5',500,null],[2,'5',1000,null],[3,'1.75',185,12.375],[4,'dual3',500,null]]){
      await page.goto(base+'/tools.html?calculator=friction-loss-per-100');await ready();await set('frictionLossPerHundredHoseSize',hose);await set('frictionLossPerHundredFlow',flow);if(c!==null)await set('frictionLossPerHundredCoefficient',c);await page.click('#calculateFrictionLossPerHundredButton');
      check('reference'+i,await page.locator('#frictionLossPerHundredResults').innerText());
    }
    await page.goto(base+'/tools.html?calculator=friction-loss-chart');await ready();
    async function chart(override=false,p){return page.evaluate(async({override,p,baseline})=>{
      if(override)saveHoseCoefficient('1.75',12.375);
      // The pre-edit chart has a missing metadata-wrapper symbol. Supply only
      // that existing text wrapper in the isolated baseline harness.
      if(baseline && typeof wrapCanvasMetadataLine==='undefined')window.wrapCanvasMetadataLine=wrapCanvasText;
      const hoses=getFrictionLossChartHoses(['1.75','2.5','5'],p);
      const calls=[];const original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){calls.push(String(text));return original.call(this,text,...args);};
      try{const canvas=await renderFrictionLossChartCanvas(hoses,p);return {hoses,calls:calls.filter(s=>!s.includes('Generated ')),width:canvas.width,height:canvas.height};}
      finally{CanvasRenderingContext2D.prototype.fillText=original;}
    },{override,p,baseline:Boolean(process.env.US_BASELINE_ROOT)});}
    check('chart',await chart());check('chartCustom',await chart(true));
    await page.evaluate(()=>localStorage.removeItem(HOSE_COEFFS_KEY));
    if(process.env.US_BASELINE_ROOT)fs.writeFileSync(fixture,JSON.stringify(golden,null,2)+'\n');
    if(!process.env.US_BASELINE_ROOT){
      const U=require('../../www/js/units'),H=require('../../www/js/hydraulics-core'),T=require('../../www/js/tools-units');
      const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
      const snap=()=>page.evaluate(()=>ReverseFlowActiveTool.snapshot());
      const prefs=async(unitSystem,metricPressureUnit='bar')=>page.evaluate(p=>{localStorage.setItem('reverse-flow-unit-preferences-v1',JSON.stringify({version:1,metricReactionUnit:'n',...p}));dispatchEvent(new StorageEvent('storage'));},{unitSystem,metricPressureUnit});
      async function inspect(){
        const actual=await page.locator('#fieldCalculatorBody').evaluate(b=>{const c=b.cloneNode(true);c.querySelectorAll('.formula').forEach(e=>e.remove());return {text:c.textContent,overflow:document.documentElement.scrollWidth>390,bad:[...b.querySelectorAll('input,select,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left<0||r.right>390);}).map(e=>e.id)};});
        assert.equal(actual.overflow,false);assert.deepEqual(actual.bad,[]);assert.doesNotMatch(actual.text,/PSI|GPM|100['′]|100 ft|100 m/);
      }
      async function settings(back=false){
        const bytes=await persisted();await page.click('a[href="settings.html"]');await ready();await page.click('#unitPreferences > summary');await page.check('input[name="unitSystem"][value="metric"]');await page.check('input[name="metricPressureUnit"][value="kpa"]');
        if(back)await page.goBack();else await page.click('a[href^="tools.html"]');await ready();
        await page.waitForFunction(()=>window.ReverseFlowActiveTool);assert.deepEqual(await persisted(),bytes);await inspect();
      }
      for(const length of [30,46,60]){
        await prefs('metric');await page.goto(base+'/tools.html?calculator=coefficient');await ready();assert.equal(await page.inputValue('#coefficientTestLength'),'30');
        for(const [id,value]of Object.entries({coefficientHoseSize:'1.75',coefficientFlow:760,coefficientGaugeOne:7,coefficientGaugeTwo:3.5,coefficientTestLength:length}))await set(id,value);
        const before=await snap(),r=before.result;near(r.lengthFeet,U.metresToFeet(length));near(r.coefficient,H.hoseCoefficient(U.barToPsi(3.5),U.litresPerMinuteToGpm(760),U.metresToFeet(length)));
        for(let repeat=0;repeat<3;repeat++)for(const [system,pressure]of [['metric','kpa'],['us','bar'],['metric','bar']]){await prefs(system,pressure);assert.deepEqual(await snap(),before);if(system==='metric')await inspect();}
        await page.screenshot({path:'/tmp/reverse-flow-3c-coefficient.png',fullPage:true});
        await settings(Boolean(process.env.DISABLE_BFCACHE));assert.deepEqual(await snap(),before);await prefs('us');await settings(true);assert.deepEqual(await snap(),before);
        // Enter exactly the same physical test in U.S. units, not rounded metric display values.
        await prefs('us');await page.goto(base+'/tools.html?calculator=coefficient');await ready();assert.equal(await page.inputValue('#coefficientTestLength'),'100');
        for(const [id,value]of Object.entries({coefficientFlow:r.flowGpm,coefficientGaugeOne:r.gaugeOnePsi,coefficientGaugeTwo:r.gaugeTwoPsi,coefficientTestLength:r.lengthFeet}))await set(id,value);
        near((await snap()).result.coefficient,r.coefficient);
        for(const invalid of ['0','-1','abc','']){await set('coefficientTestLength',invalid);assert.equal((await snap()).result,null);}
      }
      await prefs('us');await page.goto(base+'/tools.html?calculator=coefficient');await ready();for(const feet of [150,200]){
        for(const [id,value]of Object.entries({coefficientTestLength:feet,coefficientFlow:200,coefficientGaugeOne:150,coefficientGaugeTwo:88}))await set(id,value);
        near((await snap()).result.coefficient,H.hoseCoefficient(62,200,feet));
      }
      await set('coefficientTestLength',200);await prefs('metric');assert.equal(await page.inputValue('#coefficientTestLength'),'60.96');
      await set('coefficientGaugeOne','3.55');assert.equal((await snap()).result,null);
      console.log('PASS actual length defaults, 30/46/60m metric origins, C invariance, validation and no drift');
      await prefs('us');await page.goto(base+'/tools.html?calculator=friction-loss-per-100');await ready();
      await set('frictionLossPerHundredHoseSize','1.75');await set('frictionLossPerHundredCoefficient','12.375');await set('frictionLossPerHundredFlow','185');await page.click('#calculateFrictionLossPerHundredButton');
      const ref=await snap();
      for(let repeat=0;repeat<3;repeat++)for(const [system,pressure]of [['metric','bar'],['metric','kpa'],['us','bar']]){
        await prefs(system,pressure);const now=await snap();assert.deepEqual(now.values,ref.values);assert.deepEqual(now.extra,ref.extra);
        const feet=system==='metric'?U.metresToFeet(30):100;near(now.result.lengthFeet,feet);near(now.result.frictionLossPsi,H.frictionLoss(12.375,185,feet));
        if(system==='metric'){assert.notEqual(now.result.frictionLossPsi,H.frictionLoss(12.375,185,100));assert.notEqual(now.result.frictionLossPsi,H.frictionLoss(12.375,185,U.metresToFeet(100)));await inspect();}
      }
      await settings(Boolean(process.env.DISABLE_BFCACHE));assert.deepEqual((await snap()).extra,ref.extra);await page.screenshot({path:'/tmp/reverse-flow-3c-reference.png',fullPage:true});await prefs('us');await settings(true);assert.deepEqual((await snap()).extra,ref.extra);
      // Draft edits preserve button-driven behavior and the last calculated configuration.
      const old=(await snap()).result;await set('frictionLossPerHundredFlow','900');assert.deepEqual((await snap()).result,old);await page.click('#calculateFrictionLossPerHundredButton');near((await snap()).result.flowGpm,U.litresPerMinuteToGpm(900));
      await set('frictionLossPerHundredHoseSize','2.5');assert.equal((await snap()).result,null);assert.notEqual(await page.inputValue('#frictionLossPerHundredCoefficient'),'12.375');
      console.log('PASS exact 30m reference, temporary C, manual Calculate and navigation');
      await page.goto(base+'/tools.html?calculator=friction-loss-chart');await ready();
      await page.evaluate(()=>{
        saveHoseCoefficient('1.75',12.375);
        saveDefaultHoseProfile('1.75',{id:'test-profile',manufacturer:'Test',model:'Metadata only',appHoseId:'1.75',coefficient:999});
        if(getActiveHoseCoefficient('1.75')!==12.375)throw Error('Profile metadata changed active C');
      });
      await page.locator('.friction-loss-hose-toggle input[value="1.88"]').uncheck();
      const ids=(await snap()).extra;
      for(const pressure of ['bar','kpa']){
        await prefs('metric',pressure);await inspect();assert.equal(await page.locator('[data-chart-coefficient="1.75"]').textContent(),'C 12.4');const p={unitSystem:'metric',metricPressureUnit:pressure};const data=(await snap()).result;
        assert.deepEqual(data.rows.map(r=>r.displayFlow),Array.from({length:21},(_,i)=>i*200));near(data.lengthFeet,U.metresToFeet(30));
        for(const row of data.rows)for(const [j,hose]of data.hoses.entries())near(row.lossesPsi[j],H.frictionLoss(hose.coefficient,U.litresPerMinuteToGpm(row.displayFlow),U.metresToFeet(30)));
        const canvas=await chart(false,p);assert.ok(canvas.calls.includes('(L/min)'));assert.ok(canvas.calls.includes('45 mm'));assert.ok(canvas.calls.some(s=>s.includes('FL / 30 m')));assert.ok(!canvas.calls.some(s=>/GPM|100 Feet/.test(s)));
        const png=await page.evaluate(async p=>{const result=await createFrictionLossChartPngFile(['1.75','2.5','5'],p);return {name:result.file?.name,type:result.file?.type,bytes:result.file?Array.from(new Uint8Array(await result.file.arrayBuffer())):[],reason:result.reason};},p);
        assert.equal(png.type,'image/png');assert.ok(png.bytes.length>1000,png.reason);fs.writeFileSync('/tmp/reverse-flow-3c-chart-'+pressure+'.png',Buffer.from(png.bytes));
        // Exercise actual chart export, with browser share destinations replaced by local spies.
        const shared=await page.evaluate(async p=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.lastChartShare=data;}});await window.exportFrictionLossChart(['1.75','5'],p);return {name:lastChartShare.files?.[0]?.name,text:buildFrictionLossChartShareText(['1.75','5'],p)};},p);
        assert.equal(shared.name,'reverse-flow-friction-loss-chart.png');assert.match(shared.text,/FL \/ 30 m/);assert.match(shared.text,/45 mm/);assert.match(shared.text,/L\/min/);assert.match(shared.text,/4000/);assert.doesNotMatch(shared.text,/PSI|GPM/);
      }
      await page.screenshot({path:'/tmp/reverse-flow-3c-chart-tool.png',fullPage:true});
      const clipboard=await page.evaluate(async()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.chartClipboard=text;}}});await window.exportFrictionLossChart(['1.75'],{unitSystem:'metric',metricPressureUnit:'bar'});return window.chartClipboard;});assert.match(clipboard,/FL \/ 30 m/);assert.match(clipboard,/12.4/);
      await settings(Boolean(process.env.DISABLE_BFCACHE));assert.deepEqual((await snap()).extra,ids);await prefs('us');await settings(true);assert.deepEqual((await snap()).extra,ids);
      await prefs('us');assert.deepEqual((await snap()).result.rows.map(r=>r.displayFlow),Array.from({length:21},(_,i)=>i*50));
      await page.evaluate(()=>{localStorage.removeItem(HOSE_COEFFS_KEY);localStorage.removeItem(DEFAULT_HOSE_PROFILES_KEY);});
      await prefs('metric');await page.goto(base+'/tools.html');await ready();assert.equal(await page.locator('a[href="tools.html?calculator=friction-loss-per-100"] strong').textContent(),'Friction Loss / 30 m');
      console.log('PASS chart grid, overrides, canvas/PNG, file share/clipboard, selection state and mobile');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS coefficient, reference and deterministic canvas US baselines');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
