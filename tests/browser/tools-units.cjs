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
    const scenarios = [
      ['smoothbore-flow', {smoothboreFlowTip:'7/8',smoothboreFlowPressure:'50'}],
      ['smoothbore-flow', {smoothboreFlowTip:'1-1/8',smoothboreFlowPressure:'80'}],
      ['smoothbore-flow', {smoothboreFlowTip:'custom',smoothboreFlowCustomTip:'0.9375',smoothboreFlowPressure:'65'}],
      ['nozzle-reaction', {nozzleReactionTip:'1-1/8',nozzleReactionPressure:'50'}],
      ['nozzle-reaction', {nozzleReactionTip:'custom',nozzleReactionCustomTip:'0.9',nozzleReactionPressure:'75'}],
      ['nozzle-reaction', {nozzleReactionType:'automaticFog',nozzleReactionFlow:'185',nozzleReactionPressure:'50'}],
      ['nozzle-reaction', {nozzleReactionType:'fixedFog',nozzleReactionFlow:'200',nozzleReactionRatedFlow:'185',nozzleReactionRatedPressure:'50'}],
      ...['1.75','2.5','3','custom'].map(id=>['water-velocity',{waterVelocityHoseId:id,...(id==='custom'?{waterVelocityCustomId:'1.75'}:{}),waterVelocityFlow:'185'}]),
      ['water-velocity',{waterVelocityHoseId:'1.75',waterVelocityFlow:'0'}]
    ];
    const fixturePath=path.resolve(__dirname,'../fixtures/tools-us-baseline.json');
    const golden=process.env.US_BASELINE_ROOT?[]:JSON.parse(fs.readFileSync(fixturePath));
    const U=require('../../www/js/units'), B=require('../../www/js/required-pdp-units'), H=require('../../www/js/hydraulics-core');
    const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
    const snap=()=>page.evaluate(()=>ReverseFlowActiveTool.snapshot());
    const prefs=async(unitSystem,metricPressureUnit='bar',metricReactionUnit='n')=>{
      await page.evaluate(p=>{localStorage.setItem('reverse-flow-unit-preferences-v1',JSON.stringify({version:1,...p}));window.dispatchEvent(new StorageEvent('storage'));},{unitSystem,metricPressureUnit,metricReactionUnit});
    };
    async function inspect(tool) {
      const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('#fieldCalculatorBody input,#fieldCalculatorBody select')].filter(e=>e.getBoundingClientRect().width).map(e=>({id:e.id,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
      assert.ok(overflow.scroll<=overflow.width,JSON.stringify(overflow));
      for(const c of overflow.controls)assert.ok(c.left>=0&&c.right<=390,JSON.stringify(c));
      const operational=await page.locator('#fieldCalculatorBody').evaluate(e=>{const c=e.cloneNode(true);c.querySelectorAll('.formula').forEach(e=>e.remove());return c.textContent;});
      assert.doesNotMatch(operational,/PSI|GPM|ft\/sec|\blb\b|inches/);
    }
    for(const [i,[tool,fields]] of scenarios.entries()) {
      await page.goto(base+'/tools.html?calculator='+tool);await ready();
      for(const [id,value] of Object.entries(fields)) {
        if(await page.locator('#'+id).evaluate(e=>e.tagName==='SELECT')) await page.selectOption('#'+id,value);
        else await page.fill('#'+id,value);
      }
      const output=await page.locator('#fieldCalculatorBody [id$="Results"]').innerText();
      if(process.env.US_BASELINE_ROOT)golden.push(output);else assert.equal(output,golden[i]);
      console.log('PASS US '+tool+' '+i);
      if(!process.env.US_BASELINE_ROOT) {
        const before=await snap();
        for(let repeat=0;repeat<2;repeat++)for(const [system,pressure,reaction] of [['metric','bar','n'],['metric','kpa','n'],['metric','kpa','kgf'],['metric','bar','kgf'],['us','bar','n']]) {
          await prefs(system,pressure,reaction);
          assert.deepEqual(await snap(),before,'preference drift');
          if(system==='metric') {
            await inspect(tool);
            const result=await page.locator('#fieldCalculatorBody [id$="Results"]').innerText();
            const p={unitSystem:system,metricPressureUnit:pressure,metricReactionUnit:reaction};
            const r=before.result;
            if(r.reactionLbf!==undefined)assert.ok(result.includes(B.format(r.reactionLbf,'force',p)));
            if(r.velocityFeetPerSecond!==undefined)assert.ok(result.includes(B.format(r.velocityFeetPerSecond,'velocity',p)));
            if(tool==='smoothbore-flow')assert.ok(result.includes(B.format(r.flowGpm,'flow',p)));
            if(tool==='water-velocity'&&['1.75','2.5'].includes(fields.waterVelocityHoseId)) {
              const id=fields.waterVelocityHoseId,nominal=id==='1.75'?45:64;
              assert.equal(await page.locator('#waterVelocityHoseId option:checked').innerText(),nominal+' mm');
              assert.equal(r.diameterInches,Number(id));
              if(r.flowGpm>0)assert.notEqual(r.velocityFeetPerSecond,H.waterVelocity(r.flowGpm,U.toCanonical(nominal,'diameter',p)));
            }
          }
        }
        assert.equal(await page.locator('#fieldCalculatorBody [id$="Results"]').innerText(),golden[i]);
      }
    }
    if(process.env.US_BASELINE_ROOT)fs.writeFileSync(fixturePath,JSON.stringify(golden,null,2)+'\n');
    if(!process.env.US_BASELINE_ROOT) {
      for(const tool of ['smoothbore-flow','nozzle-reaction','water-velocity']) {
        await prefs('metric','bar','n');await page.goto(base+'/tools.html?calculator='+tool);await ready();
        if(tool==='smoothbore-flow') {
          await page.selectOption('#smoothboreFlowTip','custom');await page.fill('#smoothboreFlowCustomTip','28.575');await page.fill('#smoothboreFlowPressure','3.5');
          const r=(await snap()).result;near(r.diameterInches,1.125);near(r.pressurePsi,U.toCanonical(3.5,'pressure',{unitSystem:'metric',metricPressureUnit:'bar'}));near(r.flowGpm,H.smoothboreFlow(r.diameterInches,r.pressurePsi));
        } else if(tool==='nozzle-reaction') {
          await page.selectOption('#nozzleReactionType','automaticFog');await page.fill('#nozzleReactionFlow','700');await page.fill('#nozzleReactionPressure','3.5');
          const r=(await snap()).result;near(r.reactionLbf,H.fogReaction(U.toCanonical(700,'flow',{unitSystem:'metric'}),r.pressurePsi));
        } else {
          await page.selectOption('#waterVelocityHoseId','1.75');await page.fill('#waterVelocityFlow','700');
          let r=(await snap()).result;assert.equal(r.diameterInches,1.75);near(r.velocityFeetPerSecond,H.waterVelocity(U.toCanonical(700,'flow',{unitSystem:'metric'}),1.75));
          await page.selectOption('#waterVelocityHoseId','custom');await page.fill('#waterVelocityCustomId','44.45');r=(await snap()).result;near(r.diameterInches,1.75);
        }
        const before=await snap();const persistedBefore=await persisted();
        await inspect(tool);await page.screenshot({path:'/tmp/reverse-flow-3a-'+tool+'.png',fullPage:true});
        // Exercise genuine Settings navigation, including return link and Browser Back.
        await page.click('a[href="settings.html"]');await ready();await page.locator('#unitPreferences > summary').click();
        await page.check('input[name="metricPressureUnit"][value="kpa"]');await page.check('input[name="metricReactionUnit"][value="kgf"]');
        if(process.env.DISABLE_BFCACHE)await page.goBack();else await page.click('a[href^="tools.html"]');await ready();assert.deepEqual(await snap(),before);
        assert.deepEqual(await persisted(),persistedBefore);await inspect(tool);
        await page.screenshot({path:'/tmp/reverse-flow-3a-'+tool+'-kpa-kgf.png',fullPage:true});
        await page.click('a[href="settings.html"]');await ready();await page.locator('#unitPreferences > summary').click();await page.check('input[name="unitSystem"][value="us"]');await page.goBack();await ready();await page.waitForFunction(()=>Object.entries(ReverseFlowActiveTool.snapshot().values).every(([id,value])=>value===null||document.getElementById(id).value===String(value)));
        assert.deepEqual(await snap(),before);assert.deepEqual(await persisted(),persistedBefore);
        for(const [id,value]of Object.entries(before.values))if(value!==null)assert.equal(await page.inputValue('#'+id),String(value));
        await prefs('metric','bar','n');
        const invalid=tool==='smoothbore-flow'?'smoothboreFlowPressure':tool==='nozzle-reaction'?'nozzleReactionPressure':'waterVelocityFlow';
        await page.fill('#'+invalid,tool==='water-velocity'?'700.5':'3.55');assert.equal((await snap()).result,null);await inspect(tool);
        // A fresh launch must not consume stale tool input state.
        await page.goto(base+'/tools.html?calculator='+tool);await ready();assert.equal((await snap()).result,null);
        console.log('PASS metric edits, Settings, Browser Back, invalid inputs, fresh launch and 390px '+tool);
      }
      // Direct kPa edits and fixed-fog rated values remain canonical.
      await prefs('metric','kpa','kgf');await page.goto(base+'/tools.html?calculator=nozzle-reaction');await ready();
      await page.selectOption('#nozzleReactionType','fixedFog');await page.fill('#nozzleReactionRatedFlow','700');await page.fill('#nozzleReactionRatedPressure','345');await page.fill('#nozzleReactionFlow','800');
      const fixed=await snap();near(fixed.result.pressurePsi,U.toCanonical(345,'pressure',{unitSystem:'metric',metricPressureUnit:'kpa'})*(800/700)**2);
      await prefs('metric','bar','n');assert.deepEqual(await snap(),fixed);await inspect('nozzle-reaction');
      console.log('PASS metric fixed-fog rating');
    }
    assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
