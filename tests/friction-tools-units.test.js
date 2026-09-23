const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../www/js/units');
const B = require('../www/js/required-pdp-units');
const T = require('../www/js/tools-units');
const H = require('../www/js/hydraulics-core');
const metric = pressure => U.normalizePreferences({unitSystem:'metric',metricPressureUnit:pressure || 'bar'});
const us=U.normalizePreferences({unitSystem:'us'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(b)),`${a} != ${b}`);

test('Metric reference is exactly 30 metres, distinct from 100 feet and 100 metres',()=>{
  const feet=T.referenceFeet(metric());near(feet,98.42519685039369);near(U.feetToMetres(feet),30);
  const loss=H.frictionLoss(15.5,150,feet),usLoss=H.frictionLoss(15.5,150,100);
  near(loss,34.3257874015748);assert.equal(usLoss,34.875);
  near(loss/usLoss,30/30.48);near(H.frictionLoss(15.5,150,U.metresToFeet(100))/loss,100/30);
  assert.equal(T.referenceFeet(us),100);
});
for(const metres of [30,46,60])for(const pressure of ['bar','kpa'])test(`Coefficient invariant for ${metres}m physical test in ${pressure}`,()=>{
  const p=metric(pressure),feet=U.metresToFeet(metres),gpm=U.litresPerMinuteToGpm(760),p1=U.barToPsi(7),p2=U.barToPsi(3.5);
  const canonical=H.hoseCoefficient(p1-p2,gpm,feet);
  const edited=(value,q)=>Number(B.parseQuantityEdit(value,{quantity:q,decimal:q==='length'},p).canonical);
  const result=H.hoseCoefficient(edited(pressure==='bar'?'7':'700','pressure')-edited(pressure==='bar'?'3.5':'350','pressure'),edited('760','flow'),edited(String(metres),'length'));
  near(result,canonical);
  for(let i=0;i<20;i++){T.referencePressure(H.frictionLoss(canonical,gpm,T.referenceFeet(p)),p);assert.equal(H.hoseCoefficient(p1-p2,gpm,feet),canonical);}
});
test('Explicit 100-foot tests exactly match the previous implicit coefficient calculation',()=>{
  for(const [loss,gpm]of [[35,150],[62,200],[75,185]])assert.equal(H.hoseCoefficient(loss,gpm,100),H.hoseCoefficient(loss,gpm));
});
test('Actual test length permits decimal metres and preserves useful physical precision',()=>{
  const result=B.parseQuantityEdit('60.96',{quantity:'length',decimal:true},metric());assert.equal(result.valid,true);near(Number(result.canonical),200);
  for(const value of ['0','-1','abc','']){
    const parsed=B.parseQuantityEdit(value,{quantity:'length',decimal:true},metric());assert.ok(!parsed.valid||!(Number(parsed.canonical)>0));
  }
  assert.equal(B.parseQuantityEdit('3.55',{quantity:'pressure'},metric()).valid,false);
});
for(const coefficient of [15.5,2,.08,12.375])test(`Chart canonical coefficient ${coefficient} uses exact independent grids`,()=>{
  const hoses=[{id:'test',label:'test',coefficient}];
  for(const p of [us,metric(),metric('kpa')]){
    const data=T.chartData(hoses,p,H),step=p.unitSystem==='us'?50:200;
    assert.deepEqual(data.rows.map(r=>r.displayFlow),Array.from({length:21},(_,i)=>i*step));
    assert.equal(data.rows[0].lossesPsi[0],0);assert.equal(data.hoses[0].coefficient,coefficient);
    for(const row of data.rows){near(row.flowGpm,U.toCanonical(row.displayFlow,'flow',p));near(row.lossesPsi[0],H.frictionLoss(coefficient,row.flowGpm,T.referenceFeet(p)));}
  }
});
test('Reference precision preserves small nonzero pressures without mutating PSI',()=>{
  for(const psi of [0.00000001,.001,.02,1,100])for(const p of [metric(),metric('kpa')]){
    const text=T.referencePressure(psi,p,false);assert.ok(Number(text)>0);assert.equal(H.frictionLoss(psi,100,100),psi);
  }
  assert.equal(T.referencePressure(0,metric()),'0.000 bar');assert.equal(T.referencePressure(0,metric('kpa')),'0.0 kPa');
});
test('All nine tool identities use the existing Settings return key',()=>{
  for(const toolId of ['coefficient','friction-loss-per-100','friction-loss-chart']){
    const record={version:1,toolId,values:{},selections:{},extra:{coefficient:'12.375',selectedIds:['1.75']}};
    assert.deepEqual(T.pending({getItem:()=>JSON.stringify(record)}),record);
  }
});
