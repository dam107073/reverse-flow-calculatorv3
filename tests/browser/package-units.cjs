// Isolated loopback origin and storage; artifacts are QA outputs only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');const {execFileSync}=require('node:child_process');
const capture=process.env.CAPTURE_BASELINE==='1',root=path.resolve(__dirname,'../../www'),out=process.env.OUTPUT_DIR||'/tmp/reverse-flow-4c';fs.mkdirSync(out,{recursive:true});
const fixture=path.resolve(__dirname,'../fixtures/package-us-baseline.json');
(async()=>{const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+'/'))return res.writeHead(404).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1200,height:1100}});page.on('dialog',async d=>{console.log('dialog',d.message());await d.accept();});const base=`http://127.0.0.1:${server.address().port}`;await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base+'/index.html');await page.waitForFunction(()=>document.body.classList.contains('access-ready'));
const sources=require('../fixtures/pump-chart-us-baseline.json').setups;
const data=await page.evaluate(sources=>{
 window.packageSources=sources;const variants=[];
 for(const original of sources){let s=structuredClone(original);if(['splitLay','standpipeOps'].includes(s.mode)){
 Object.assign(state,s.inputs);const n=state[s.mode];n.dualSupply=false;n.attackLines='1';n.attack2Enabled=false;n.sectionCount='2';syncInputsFromState();syncSplitLayInputsFromState();syncStandpipeInputsFromState();syncModeUi();calculateAndRender();s=buildCurrentPumpChartSetup({id:s.id,name:s.name,notes:'',timestamp:'2026-09-23T12:00:00.000Z'});
 }variants.push(s);}
 window.packageSources=variants;
 const all=getPumpOperatorPackageData({name:'Engine 4C'},variants);all.generatedAt='2026-09-23T12:00:00.000Z';window.referenceData=all;
 const eligible=variants.map(getPumpOperatorSetupCandidate).map(s=>({id:s.id,...ReverseFlowPumpOperatorPackage.classifySetupStructure(s)}));
 const models=[];for(let count=1;count<=6;count++){const d={...all,setups:all.setups.slice(0,count),hoses:all.hoses.slice(0,4),tips:all.tips.slice(0,8)};models.push(ReverseFlowPumpOperatorPackage.createLayoutModel(d));}
 models.push(ReverseFlowPumpOperatorPackage.createLayoutModel({...all,setups:all.setups.slice(0,6).map((s,k)=>({...s,name:`Long setup name number ${k+1}`}))}));
 window.usModels=models;return {sources:variants,data:all,eligible,models,html:models.map(ReverseFlowPumpOperatorPackage.renderPackageHtml)};
},sources);
const golden={...data,artifacts:{}};
async function artifacts(model,key){return await page.evaluate(async({model,key})=>{const png=await createPumpOperatorPackagePngFiles(model);const pdf=await createPumpOperatorPackagePdfFile(model,png);return Promise.all([...png,pdf].map(async f=>({name:f.name,type:f.type,base64:await blobToBase64Payload(f)})));},{model,key});}
for(const index of [0,6]){const files=await artifacts(data.models[index],`us-${index}`);for(let k=0;k<files.length;k++){const f=files[k],p=path.join(out,`us-${index}-${k}.${k===2?'pdf':'png'}`);fs.writeFileSync(p,Buffer.from(f.base64,'base64'));if(k<2)golden.artifacts[`us-${index}-${k}`]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');else{execFileSync('pdftoppm',['-scale-to','1056','-png',p,path.join(out,`us-${index}-pdf`)]);for(let n=1;n<=2;n++)golden.artifacts[`us-${index}-pdf-${n}`]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,`us-${index}-pdf-${n}.png`))).digest('hex');}}}
if(capture)fs.writeFileSync(fixture,JSON.stringify(golden,null,2)+'\n');else assert.deepEqual(golden,JSON.parse(fs.readFileSync(fixture)));
if(!capture){
 for(const unit of ['bar','kpa'])for(const dense of [false,true,'boundary','legacy']){
 const model=await page.evaluate(({unit,dense})=>{
   const preference={unitSystem:'metric',metricPressureUnit:unit,metricReactionUnit:'n'};
   const selected=dense==='legacy'?packageSources.slice(-6):packageSources.slice(0,dense===true?6:3);
   const rows=dense==='legacy'?referenceData.setups.slice(-6).map((r,k)=>({...r,name:`Long setup name number ${k+1}`})):referenceData.setups.slice(0,dense===true?6:3);
   const base={...referenceData,setups:rows,hoses:dense===true?referenceData.hoses:referenceData.hoses.slice(0,dense==='boundary'?8:4),tips:dense===true?referenceData.tips:referenceData.tips.slice(0,dense==='boundary'?10:8)};
   const d=ReverseFlowPackageUnits.data(base,selected,preference,SMOOTHBORE_TIPS);
   const m=ReverseFlowPumpOperatorPackage.createLayoutModel(d);window.metricModel=m;
   return m;
 },{unit,dense});
 assert.equal(model.pageCount,2);assert.equal(model.metricReference.rows[20].flow,4000);
 const layout=await page.evaluate(model=>{
   const mounted=ReverseFlowPumpOperatorPackage.mountPackagePages(model,document);
   const issues=[];for(const page of mounted.pages){const box=page.querySelector('main').getBoundingClientRect();for(const e of page.querySelectorAll('td,th,h2,h3,p,li')){const r=e.getBoundingClientRect();if(r.bottom>box.bottom+1||e.scrollWidth>e.clientWidth+2)issues.push({text:e.textContent,scroll:e.scrollWidth,width:e.clientWidth,bottom:r.bottom-box.top});}}
   const text=mounted.wrapper.textContent;mounted.wrapper.remove();return {issues,text};
 },model);
 assert.deepEqual(layout.issues,[],'Metric clipped content');assert.match(layout.text,/Current equipment reference/);assert.match(layout.text,/Hose.*mm × m/);assert.doesNotMatch(layout.text,/Saved 500 GPM/);
 const files=await artifacts(model,unit);for(let k=0;k<files.length;k++){const file=path.join(out,`${unit}-${dense===true?'dense':dense||'normal'}-${k}.${k===2?'pdf':'png'}`);fs.writeFileSync(file,Buffer.from(files[k].base64,'base64'));if(k===2)execFileSync('pdftoppm',['-scale-to','1056','-png',file,path.join(out,`${unit}-${dense===true?'dense':dense||'normal'}-pdf`)]);}
 }
 console.log('All rendered Metric layouts passed');
 // Exercise real selection, submission, frozen asynchronous capture and files.
 await page.evaluate(()=>{
   state.mode='attackPumper';syncModeUi();
   const chart={id:'export-test',name:'Engine 4C',createdAt:'2026-09-23T12:00:00.000Z',updatedAt:'2026-09-23T12:00:00.000Z',setups:packageSources};
   savePumpCharts({version:2,charts:[chart]});
   operationalPreference=ReverseFlowPackageUnits.freezePreference({unitSystem:'metric',metricPressureUnit:'bar'});
   renderPumpOperatorPackageSelection(chart.id);els.pumpChartModal.hidden=false;
   window.exportOriginal=createPumpOperatorPackagePngFiles;
   window.exportGate=new Promise(resolve=>window.releaseExport=resolve);
   createPumpOperatorPackagePngFiles=async model=>{await exportGate;return exportOriginal(model);};
 });
 console.log('Selection prepared');
 const available=page.locator('input[name="pumpOperatorSetup"]:not(:disabled)');
 await available.first().check();
 await page.locator('#pumpOperatorPackageSelectionForm').evaluate(f=>f.requestSubmit());
 console.log('Generation submitted');
 const frozen=await page.evaluate(()=>JSON.stringify(activePumpOperatorPackage.model));
 const chartBytes=await page.evaluate(()=>localStorage.getItem(PUMP_CHARTS_KEY));
 await page.evaluate(()=>{localStorage.setItem(ReverseFlowUnits.STORAGE_KEY,JSON.stringify({...ReverseFlowUnits.DEFAULTS,unitSystem:'metric',metricPressureUnit:'kpa'}));dispatchEvent(new StorageEvent('storage',{key:ReverseFlowUnits.STORAGE_KEY}));releaseExport();});
 await page.waitForFunction(()=>activePumpOperatorPackage?.pdfFile,{timeout:60000});
 assert.equal(await page.evaluate(()=>JSON.stringify(activePumpOperatorPackage.model)),frozen);
 assert.equal(await page.evaluate(()=>localStorage.getItem(PUMP_CHARTS_KEY)),chartBytes);
 assert.equal(await page.evaluate(()=>activePumpOperatorPackage.model.preference.metricPressureUnit),'bar');
 console.log('Frozen generation finished');
 const hashes=()=>page.evaluate(async()=>Promise.all([...activePumpOperatorPackage.pngFiles,activePumpOperatorPackage.pdfFile].map(async f=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))).join(','))));
 const immutable=await hashes();console.log('Artifact hashes captured');
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});});
 const downloads=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.evaluate(()=>sharePumpOperatorPackage('png'));await page.waitForTimeout(200);assert.equal(downloads.length,2);
 await page.evaluate(()=>sharePumpOperatorPackage('pdf'));await page.waitForTimeout(200);assert.equal(downloads.length,3);
 await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelled','AbortError');}});});
 await page.evaluate(()=>sharePumpOperatorPackage('pdf'));assert.match(await page.locator('#pumpOperatorExportStatus').innerText(),/cancelled/);
 assert.deepEqual(await hashes(),immutable);
 await page.evaluate(()=>{createPumpOperatorPackagePngFiles=exportOriginal;exportPumpChart('export-test');});
 await page.locator('input[name="pumpOperatorSetup"]:not(:disabled)').first().check();
 await page.locator('#pumpOperatorPackageSelectionForm').evaluate(f=>f.requestSubmit());
 assert.equal(await page.evaluate(()=>activePumpOperatorPackage.model.preference.metricPressureUnit),'kpa');
 await page.waitForFunction(()=>activePumpOperatorPackage?.pdfFile,{timeout:60000});
 // Current reference visibility/override changes never rewrite the saved setup.
 const reference=await page.evaluate(()=>{
   const before=JSON.stringify(packageSources);saveHoseCoefficient('1.75',31);
   localStorage.setItem(VISIBLE_HOSE_SIZES_KEY,JSON.stringify(['1.75']));localStorage.setItem(VISIBLE_SMOOTHBORE_TIPS_KEY,JSON.stringify(['1-1/8']));
   const base=getPumpOperatorPackageData({name:'Current'},[packageSources[0]],operationalPreference);
   return {before,after:JSON.stringify(packageSources),hoses:base.hoses,tips:base.tips};
 });
 assert.equal(reference.before,reference.after);assert.equal(reference.hoses.length,1);assert.equal(reference.hoses[0].coefficient,31);assert.equal(reference.tips.length,1);
 console.log('Metric HTML/PNG/PDF, two-page containment, generation freeze, regeneration, artifact immutability, download/cancel and current reference overrides passed');
}
console.log(capture?'Captured pre-edit U.S. models/HTML/PNG/PDF baselines':'Exact U.S. models/HTML/PNG/PDF baselines passed');
}finally{await browser?.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
