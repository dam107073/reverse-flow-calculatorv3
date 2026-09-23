const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../www/js/units');
const B = require('../www/js/required-pdp-units');
const T = require('../www/js/tools-units');
const H = require('../www/js/hydraulics-core');
const golden = require('./fixtures/tools-us-baseline.json');
const us = U.normalizePreferences({unitSystem:'us'});
const metric = (pressure='bar',reaction='n') => U.normalizePreferences({unitSystem:'metric',metricPressureUnit:pressure,metricReactionUnit:reaction});
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const parsed=(value,q,p=metric())=>Number(T.edit(value,q,p).canonical);

test('Smoothbore Flow: physical metric edits enter the unchanged canonical formula',()=>{
  const d=parsed('28.575','diameter'),psi=parsed('3.5','pressure');
  near(d,1.125);near(psi,U.barToPsi(3.5));
  const flow=H.smoothboreFlow(d,psi),velocity=H.waterVelocity(flow,d);
  near(flow,29.7*1.125**2*Math.sqrt(U.barToPsi(3.5)));
  assert.equal(B.format(flow,'flow',metric()),`${U.gpmToLitresPerMinute(flow).toFixed(0)} L/min`);
  assert.equal(B.format(velocity,'velocity',metric()),`${U.feetPerSecondToMetresPerSecond(velocity).toFixed(1)} m/s`);
});
for(const [text,inches]of [['28.575',1.125],['44.45',1.75],['23.8125',0.9375]])test(`Physical diameter ${text} mm is exact, not nominal`,()=>{
  near(parsed(text,'diameter'),inches);assert.equal(B.number(inches,'diameter',metric()),text);
});
for(const [id,label]of [['1.75','45 mm'],['2.5','64 mm']])test(`Water Velocity factory ${id}: label never becomes hydraulic diameter`,()=>{
  assert.equal(U.factoryHoseLabel({id,label:id+'"'},metric()),label);
  const gpm=parsed('700','flow'),velocity=H.waterVelocity(gpm,Number(id));
  near(velocity,0.408*gpm/Number(id)**2);
  assert.notEqual(velocity,H.waterVelocity(gpm,parsed(label.split(' ')[0],'diameter')));
  near(U.toCanonical(U.fromCanonical(velocity,'velocity',metric()),'velocity',metric()),velocity);
});
for(const [kind,lbf]of [['smoothbore',H.smoothboreReaction(1.125,50)],['fog',H.fogReaction(185,50)]])test(`Nozzle Reaction ${kind}: N and kgf are the same canonical force`,()=>{
  const n=U.fromCanonical(lbf,'force',metric()),kgf=U.fromCanonical(lbf,'force',metric('bar','kgf'));
  near(n,kgf*9.80665);near(U.toCanonical(n,'force',metric()),lbf);near(U.toCanonical(kgf,'force',metric('bar','kgf')),lbf);
  for(let i=0;i<30;i++)for(const p of [metric(),metric('kpa'),metric('kpa','kgf'),metric('bar','kgf'),us]){
    B.format(lbf,'force',p);assert.equal(lbf,kind==='fog'?H.fogReaction(185,50):H.smoothboreReaction(1.125,50));
  }
  assert.match(B.format(lbf,'force',metric('bar','kgf')),/ kgf$/);
});
test('Nozzle Reaction: metric rated fog keeps canonical pressure scaling',()=>{
  const flow=parsed('800','flow'),rated=parsed('700','flow'),pressure=parsed('345','pressure',metric('kpa'));
  const psi=pressure*(flow/rated)**2;
  near(psi,U.kpaToPsi(345)*(800/700)**2);
  near(H.fogReaction(flow,psi),0.0505*flow*Math.sqrt(psi));
});
test('Metric edit validation preserves decimals only for physical diameter and bar',()=>{
  assert.equal(T.edit('28.575','diameter',metric()).valid,true);
  assert.equal(T.edit('.5','pressure',metric()).valid,true);
  for(const [v,q,p]of [['3.55','pressure',metric()],['345.5','pressure',metric('kpa')],['700.5','flow',metric()],['-1','diameter',metric()],['NaN','flow',metric()]])assert.equal(T.edit(v,q,p).valid,false);
  assert.equal(T.edit('','flow',metric()).canonical,'');
  assert.equal(T.edit('185.25','flow',us).canonical,'185.25');
});
test('U.S. smoothbore and velocity baseline output rounding is exact',()=>{
  for(const [i,d,psi]of [[0,.875,50],[1,1.125,80],[2,.9375,65]]){
    const gpm=H.smoothboreFlow(d,psi),v=H.waterVelocity(gpm,d);
    assert.equal(golden[i],`Flow\n${Math.round(gpm).toLocaleString()} GPM\nStream Velocity\n${v.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})} ft/sec`);
  }
  for(const [i,d,gpm]of [[7,1.75,185],[8,2.5,185],[9,3,185],[10,1.75,185],[11,1.75,0]])assert.equal(golden[i],`Water Velocity\n${H.waterVelocity(gpm,d).toFixed(1)} ft/sec`);
});
test('Tool Settings return record is scoped, optional, and storage-safe',()=>{
  assert.equal(T.pending({getItem(){throw Error('blocked');}}),null);
  assert.equal(T.pending({getItem(){return JSON.stringify({version:1,toolId:'attack-pumper',values:{},selections:{}});}}),null);
  assert.equal(T.pending({getItem(){return 'broken';}}),null);
  const record={version:1,toolId:'water-velocity',values:{waterVelocityFlow:'185'},selections:{waterVelocityHoseId:'1.75'}};
  assert.deepEqual(T.pending({getItem(){return JSON.stringify(record);}}),record);
});
