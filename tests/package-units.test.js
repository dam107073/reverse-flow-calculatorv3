const test=require('node:test'),assert=require('node:assert/strict');
const U=require('../www/js/units'),H=require('../www/js/hydraulics-core'),P=require('../www/js/package-units'),Pkg=require('../www/js/pump-operator-package');
const f=require('./fixtures/package-us-baseline.json'),us=U.DEFAULTS,bar={...us,unitSystem:'metric'},kpa={...bar,metricPressureUnit:'kpa'};
const tips=f.data.tips, render=(index,p=bar)=>P.row(f.sources[index],f.data.setups[index],p,tips);
for(let index=0;index<f.sources.length;index++)test(`export adapter ${index} ${f.sources[index].mode}: pure and U.S. compatibility`,()=>{
 const original=JSON.stringify(f.sources[index]);assert.deepEqual(render(index,us),f.data.setups[index]);
 for(let k=0;k<5;k++)for(const p of [bar,kpa])assert.deepEqual(render(index,p),render(index,p));
 assert.equal(JSON.stringify(f.sources[index]),original);
});
test('all six mode mappings use canonical snapshots, explicit losses and elevation pressure',()=>{
 for(let index=0;index<7;index++){
 const s=structuredClone(f.sources[index]),compat=structuredClone(f.data.setups[index]);s.result.flowSummary='999999 mystery';s.result.pdpSummary='888888 mystery';
 const row=P.row(s,compat,bar,tips);assert.doesNotMatch(row.gpm+row.pdp,/mystery|999999|888888/);
 if(s.mode==='relay')assert.ok(row.legacyFields.includes('nozzlePressure'));
 if(s.mode==='apparatusMounted'){assert.ok(row.legacyFields.includes('frictionLoss'));assert.equal(row.elevation,P.format(8.7,'pressure',bar));}
 if(s.mode==='standpipeOps'){assert.match(row.elevation,/bar/);assert.doesNotMatch(row.elevation,/ m/);assert.match(row.frictionLoss,/S .*bar\nA .*bar/);}
 }
});
test('unknown IDs and historical text remain literal; no field-name hydraulic inference',()=>{
 const s=structuredClone(f.sources[0]);delete s.result.canonicalRequiredPdp;s.inputs.hoseSize='Strange 45 mm';s.inputs.smoothboreTip='Unknown 1';s.inputs.nozzleType='smoothbore';s.result.totalFl='Historic A 18 PSI / S 12 PSI';
 const compat={...f.data.setups[0],hose:'Strange 45 mm × 200 ft',nozzle:'Unknown 1'};const row=P.row(s,compat,bar,tips);
 assert.equal(row.hose,compat.hose);assert.equal(row.nozzle,compat.nozzle);assert.equal(row.frictionLoss,s.result.totalFl);assert.ok(row.legacyFields.includes('pdp'));
 s.result.canonicalRequiredPdp={version:999,roundedPdpPsi:888};assert.equal(P.row(s,compat,bar,tips).pdp,row.pdp);
});
test('historical 100-ft reference is 30.48 m; new grid is exactly 30 m with exact L/min entries',()=>{
 const ref=P.references([{id:'1.75',label:'1.75',coefficient:15.5}],[],bar);
 assert.equal(U.feetToMetres(P.savedReference(100,bar).lengthFeet),30.48);assert.equal(P.savedReference(100,bar).label,'FL / 30.48 m');
 assert.equal(ref.lengthFeet,U.metresToFeet(30));assert.equal(ref.rows.length,21);assert.deepEqual(ref.rows.map(r=>r.flow),Array.from({length:21},(_,k)=>k*200));
 for(const r of ref.rows){assert.equal(r.flowGpm,U.litresPerMinuteToGpm(r.flow));assert.equal(r.lossesPsi[0],H.frictionLoss(15.5,r.flowGpm,U.metresToFeet(30)));}
 const psi100=H.frictionLoss(15.5,ref.rows[1].flowGpm,100);assert.notEqual(psi100,ref.rows[1].lossesPsi[0]);assert.ok(Math.abs(ref.rows[1].lossesPsi[0]/psi100-30/30.48)<1e-12);
 assert.equal(ref.rows[0].lossesPsi[0],0);
});
test('physical tips, exact 50/80 PSI, factory categories and active C remain distinct',()=>{
 const hoses=[{id:'1.75',label:'1¾',coefficient:15.5}],tips=[{id:'x',diameter:1.125,label:'1⅛'},{id:'y',diameter:1.75,label:'1¾'}];
 const ref=P.references(hoses,tips,bar);assert.equal(ref.hoses[0].id,'1.75');assert.equal(ref.hoses[0].label,'45 mm');
 assert.equal(ref.smoothbore[0].rows[0].label,'28.575 mm');assert.equal(ref.smoothbore[1].rows[0].label,'44.45 mm');
 for(const table of ref.smoothbore)for(const r of table.rows)assert.equal(r.flowGpm,H.smoothboreFlow(r.diameterInches,table.psi));
 const changed=P.references([{...hoses[0],coefficient:31}],tips,kpa);assert.equal(changed.rows[1].lossesPsi[0],ref.rows[1].lossesPsi[0]*2);
 assert.notEqual(P.referencePressure(.001,bar),'0.000');
});
test('Metric worksheet, U.S. modules, warnings omitted; force preference has no output effect',()=>{
 const base={...f.data,setups:f.data.setups.slice(0,2),hoses:f.data.hoses.slice(0,4),tips:f.data.tips.slice(0,8)};
 const data=P.data(base,f.sources.slice(0,2),bar,tips),model=Pkg.createLayoutModel(data),html=Pkg.renderPackageHtml(model);
 assert.equal(model.pageCount,2);assert.match(html,/L\/min \/<br>Tip mm/);assert.match(html,/Elevation<br>\(bar\)/);assert.match(html,/<th>Appliance<\/th>/);
 assert.match(html,/Appliance Loss Guide · U.S. reference/);assert.match(html,/Common Formulas · U.S. reference/);assert.match(html,/Dry Standpipe Quick Reference · U.S. reference/);assert.doesNotMatch(html,/Additional Water Available · U.S./);
 assert.match(html,/150 psi/);assert.match(html,/500 GPM/);assert.doesNotMatch(html,/Saved 500 GPM \/ 250 PSI warning/);
 assert.equal(Pkg.renderPackageHtml(Pkg.createLayoutModel(P.data(base,f.sources.slice(0,2),{...bar,metricReactionUnit:'kgf'},tips))),html);
});
test('preference freeze and detached reference/row values retain complete rendered artifact',()=>{
 const preference={...bar},base=structuredClone(f.data),sources=structuredClone(f.sources);
 const model=Pkg.createLayoutModel(P.data(base,sources,preference,tips));const html=Pkg.renderPackageHtml(model);preference.unitSystem='us';preference.metricPressureUnit='kpa';sources[0].result.canonicalRequiredPdp.flowGpm=9000;base.hoses[0].coefficient=999;
 assert.equal(model.preference.unitSystem,'metric');assert.ok(Object.isFrozen(model.preference));assert.equal(Pkg.renderPackageHtml(model),html);
});
