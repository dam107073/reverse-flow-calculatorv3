const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const U = require('../www/js/units');
const B = require('../www/js/required-pdp-units');
const T = require('../www/js/tools-units');
const H = require('../www/js/hydraulics-core');
const metric = pressure => U.normalizePreferences({unitSystem:'metric',metricPressureUnit:pressure || 'bar'});
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-12*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const edit = (value,quantity,p=metric()) => Number(T.edit(value,quantity,p).canonical);
// Exercise the actual local shuttle validation/calculation, including its established
// blank-time semantics. Browser tests additionally execute the complete renderer.
const source=fs.readFileSync(require.resolve('../www/js/tools-calculators'),'utf8');
const numberStart=source.indexOf('  function numberOrNull(');
const numberEnd=source.indexOf('\n  function ',numberStart+10);
const tenderStart=source.indexOf('    const getTenderValidation =');
const tenderEnd=source.indexOf('\n    const update =',tenderStart);
const tender=vm.runInNewContext(source.slice(numberStart,numberEnd)+'\n'+source.slice(tenderStart,tenderEnd)+'\ngetTenderValidation');

for(const gallons of [1,500,750,1000,1250,1500,1800,2000,3000,725.25])test(`U.S. gallon volume conversion and fixed physical capacity ${gallons}`,()=>{
  const litres=U.gallonsToLitres(gallons);near(litres,gallons*3.785411784);near(U.litresToGallons(litres),gallons);
  assert.equal(B.number(gallons,'volume',metric()),litres.toFixed(0));
  for(let i=0;i<30;i++){B.format(gallons,'volume',metric());assert.equal(gallons,U.toCanonical(gallons,'volume',{unitSystem:'us'}));}
  if(gallons===500)assert.equal(B.format(gallons,'volume',metric()),'1893 L');
});
test('Tank Time metric-origin capacity/flow yields canonical duration in unchanged seconds',()=>{
  const gallons=edit('2000','volume'),gpm=edit('700','flow');
  near(gallons,U.litresToGallons(2000));near(gpm,U.litresPerMinuteToGpm(700));
  assert.equal(H.tankTimeSeconds(gallons,gpm),171);
  assert.equal(H.tankTimeSeconds(500,150),200);assert.equal(H.tankTimeSeconds(3000,500),360);
});
test('Volume entry uses whole litres, retaining unrounded canonical gallons',()=>{
  assert.equal(T.edit('2000.5','volume',metric()).valid,false);
  assert.equal(T.edit('2000','volume',metric()).valid,true);
  assert.notEqual(edit('2000','volume'),Math.round(edit('2000','volume')));
  assert.equal(T.edit('725.25','volume',{unitSystem:'us'}).canonical,'725.25');
});
test('Shuttle asymmetric capacity edits preserve independent canonical volumes and time',()=>{
  const make=(litres,times)=>({tankSize:String(edit(litres,'volume')),dumpSceneTime:times[0],timeToHydrant:times[1],fillTime:times[2],timeToScene:times[3]});
  const a=make('7500',['0.5','1.5','2.5','3.5']),b=make('12345',['1.5','2.5','3.5','4.5']);
  const ar=tender(a),br=tender(b);
  assert.equal(ar.cycleTime,8);assert.equal(br.cycleTime,12);
  near(ar.sustainedFlow,U.litresToGallons(7500)/8);near(br.sustainedFlow,U.litresToGallons(12345)/12);
  const before=JSON.stringify(b);a.tankSize=String(edit('8000','volume'));assert.equal(JSON.stringify(b),before);
  const sum=ar.sustainedFlow+br.sustainedFlow;
  assert.ok(sum-edit('1500','flow')>0);assert.ok(sum-edit('3000','flow')<0);
});
test('Shuttle time validation retains minutes, decimal travel, blank contribution, zero-cycle and negative rules',()=>{
  const t={tankSize:'3000',dumpSceneTime:'',timeToHydrant:'2.25',fillTime:'',timeToScene:''};
  assert.equal(tender(t).cycleTime,2.25);assert.equal(tender(t).sustainedFlow,3000/2.25);
  assert.match(tender({...t,timeToHydrant:'0'}).error,/greater than 0 minutes/);
  assert.match(tender({...t,fillTime:'-0.1'}).error,/Fill Time/);
  assert.match(tender({...t,tankSize:'0'}).error,/Tank Size/);
});
for(const p of [metric(),metric('kpa')])test(`Remaining Supply ${p.metricPressureUnit} edits use canonical exponent and 20 PSI target`,()=>{
  const staticPressure=edit(p.metricPressureUnit==='bar'?'5.5':'550','pressure',p),residualPressure=edit(p.metricPressureUnit==='bar'?'3.5':'350','pressure',p),currentFlow=edit('3800','flow',p);
  const r=H.estimatedSupply({staticPressure,residualPressure,currentFlow,targetResidual:20});
  near(r.projectedFlow,currentFlow*((staticPressure-20)/(staticPressure-residualPressure))**.54);
  near(r.remainingFlow,r.projectedFlow-currentFlow);
  assert.equal(T.edit(p.metricPressureUnit==='bar'?'5.55':'550.5','pressure',p).valid,false);
});
test('Remaining Supply projection boundaries preserve strict pressure comparisons and remaining-flow sign',()=>{
  for(const targetResidual of [49.999,50,50.001]){
    const result=H.estimatedSupply({staticPressure:80,residualPressure:50,currentFlow:1000,targetResidual});
    assert.equal(Math.sign(result.remainingFlow),Math.sign(50-targetResidual));
  }
  for(const staticPressure of [-.001,0])assert.throws(()=>H.estimatedSupply({staticPressure,residualPressure:0,currentFlow:100,targetResidual:0}));
  assert.ok(H.estimatedSupply({staticPressure:.001,residualPressure:0,currentFlow:100,targetResidual:0}));
  assert.throws(()=>H.estimatedSupply({staticPressure:80,residualPressure:80,currentFlow:100,targetResidual:20}));
  assert.throws(()=>H.estimatedSupply({staticPressure:80,residualPressure:50,currentFlow:100,targetResidual:80}));
});
test('New Tool identities share the existing transient Settings record',()=>{
  for(const toolId of ['tank-time','water-shuttle','estimated-remaining-supply']){
    const record={version:1,toolId,values:{},selections:{},extra:[{tankSize:'3000',timeToHydrant:'2.25'}]};
    assert.deepEqual(T.pending({getItem:()=>JSON.stringify(record)}),record);
  }
});
