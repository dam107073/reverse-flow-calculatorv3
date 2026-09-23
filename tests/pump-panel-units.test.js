const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../www/js/units');
const P = require('../www/js/pump-panel-units');
const fixture = require('./fixtures/pump-panel-us-baseline.json');
const us = U.DEFAULTS, bar = {...us,unitSystem:'metric'}, kpa = {...bar,metricPressureUnit:'kpa'};
function source(index) {
  const setup = structuredClone(fixture.setups[index]), line = structuredClone(fixture.lines[index]);
  const i = setup.inputs, nested = i[setup.mode];
  const section = (hoseSize,hoseLength) => ({hoseSize,hoseLength});
  const structure = {confidence:setup.mode === 'apparatusMounted' ? 'ambiguous' : 'confident',supplySections:[],attackSections:[]};
  if (['splitLay','standpipeOps'].includes(setup.mode)) {
    structure.supplySections = [section(nested.supplyHoseSize,nested.supplyLength)];
    structure.attackSections = [section(nested.attack1HoseSize,nested.attack1Length),section(nested.attack2HoseSize,nested.attack2Length)];
  } else {
    structure.attackSections = [section(i.hoseSize,i.hoseLength)];
    if (i.reverseSupplyEnabled) structure.supplySections = [section(i.reverseSupplyHoseSize,i.reverseSupplyLength)];
  }
  const row = {nozzlePressure: setup.mode === 'relay' ? '55' : '50'};
  const tips = [{id:'1-1/8',diameter:1.125}];
  return {setup,line,structure,row,tips};
}
function capture(s) {return P.capture(s.setup,s.line,s.structure,s.row,s.tips);}
for (let index = 0; index < fixture.lines.length; index++) test(`capture ${index}: ${fixture.lines[index].sourceMode}, exact U.S. and detached packet`, () => {
  const s = source(index), packet = capture(s);
  assert.equal(packet.version,1);
  const line = {...s.line,displayCanonical:packet};
  assert.deepEqual(P.details(line,us),{frictionLoss:s.line.frictionLoss,hoseSummary:s.line.hoseSummary,legacyLoss:false,legacySummary:false});
  const bytes = JSON.stringify(line), before = P.details(line,bar);
  s.setup.inputs.hoseLength='9999';s.setup.result={};s.structure.attackSections[0].hoseLength='9999';
  for (let n=0;n<20;n++) for (const p of [bar,kpa,us]) {P.details(line,p);assert.equal(JSON.stringify(line),bytes);}
  assert.deepEqual(P.details(line,bar),before);
  if (index===3) {assert.equal(packet.losses,undefined);assert.equal(before.legacyLoss,true);assert.match(before.hoseSummary,/28\.575 mm SB/);}
  else assert.equal(before.legacyLoss,false);
  if(index===4) {assert.equal(packet.summary,undefined);assert.equal(before.hoseSummary,s.line.hoseSummary);assert.equal(before.legacySummary,true);}
  else assert.equal(before.legacySummary,false);
});
test('legacy text remains byte exact, including ambiguous numbers and nominal-looking strings',()=>{
  const line={gpm:'185.25',pdp:'98.75',frictionLoss:'S 12 / A 42? 1,000 PSI',hoseSummary:'45 mm? 200\' • NP 7 bar'};
  const bytes=JSON.stringify(line);
  for(const p of [bar,kpa]) {const d=P.details(line,p);assert.equal(d.frictionLoss,line.frictionLoss);assert.equal(d.hoseSummary,line.hoseSummary);assert.equal(d.legacyLoss,true);assert.equal(d.legacySummary,true);}
  assert.equal(JSON.stringify(line),bytes);
});
test('factory category identity and physical diameter remain separate',()=>{
  const s=source(0),packet=capture(s);assert.deepEqual(packet.summary.hoses,[{hoseId:'1.75',lengthFeet:200}]);
  assert.match(P.details({...s.line,displayCanonical:packet},bar).hoseSummary,/60\.96 m • 45 mm/);
  const physical={displayCanonical:{version:1,summary:{kind:'nozzle',type:'smoothbore',diameterInches:1.75,pressure:{role:'nozzle',psi:50}}}};
  assert.match(P.details(physical,bar).hoseSummary,/44\.45 mm/);
});
test('no legacy-result, Wye, unknown-version, formatted-input, or residual-as-NP inference',()=>{
  const s=source(0);s.setup.result={totalFl:'106.1 psi'};assert.equal(capture(s),null);
  s.setup.mode='wyeOps';assert.equal(capture(s),null);
  const bad=source(0);bad.setup.result.canonicalRequiredPdp.version=2;assert.equal(capture(bad),null);
  const formatted=source(0);formatted.structure.attackSections[0].hoseLength='200 ft';assert.equal(capture(formatted).summary,undefined);
  const unknown=source(0);unknown.structure.attackSections[0].hoseSize='45 mm';assert.equal(capture(unknown).summary,undefined);
  const mismatch=source(2);mismatch.row.nozzlePressure='100';assert.equal(capture(mismatch).summary,undefined);
  const relay=source(4);relay.row.nozzlePressure='20';assert.equal(capture(relay).summary,undefined);
});
test('asymmetric multiline packet preserves ordered physical hoses and first-line FL/NP semantics',()=>{
  for(const index of [5,6]) {
    const s=source(index), p=capture(s), r=s.setup.result.canonicalMultiLine;
    assert.deepEqual(p.summary.hoses.map(h=>h.hoseId),['3','1.75','2.5']);
    assert.deepEqual(p.summary.hoses.map(h=>h.lengthFeet),[index===5?500:100,200,150]);
    assert.equal(p.losses[1].psi,Number((index===5?r.actualAttack1.actualTotalFl:r.line1.totalFl).toFixed(1)));
    assert.equal(p.summary.pressure.role,'nozzle');
  }
});
test('aggregate conversion rounds only after canonical summation; tied maximum remains canonical',()=>{
  const flows=[1.2,1.2], pdps=[98.25,98.25,98.24];
  assert.equal(P.number(flows.reduce((a,b)=>a+b,0),'flow',bar),'9');
  assert.equal(flows.reduce((a,b)=>a+Number(P.number(b,'flow',bar)),0),10);
  assert.equal(P.format(Math.max(...pdps),'pressure',bar),'6.8 bar');
  assert.equal(P.format(Math.max(...pdps),'pressure',kpa),'677 kPa');
});
test('malformed optional packets fail closed per display component without invalidating line',()=>{
  const line=fixture.lines[0];
  for(const packet of [null,{version:2},{version:1,losses:[{role:'residual',psi:50}]},{version:1,summary:{kind:'hose',hoses:[{hoseId:'bogus',lengthFeet:200}]}}]) {
    const d=P.details({...line,displayCanonical:packet},bar);assert.equal(d.legacyLoss,true);assert.equal(d.legacySummary,true);
  }
});
test('apparatus rated fog converts structured rating while retaining non-friction fallback',()=>{
  const s=source(3);
  Object.assign(s.setup.inputs,{masterStreamType:'fixedFog',ratedFlow:'1000',ratedPressure:'50'});
  const packet=capture(s), detail=P.details({...s.line,displayCanonical:packet},kpa);
  assert.equal(packet.summary.ratedFlowGpm,1000);
  assert.equal(packet.summary.ratedPressurePsi,50);
  assert.equal(detail.hoseSummary,'Fixed Fog • 3785 L/min @ 345 kPa • NP 345 kPa');
  assert.equal(detail.frictionLoss,s.line.frictionLoss);
  assert.equal(detail.legacyLoss,true);
  assert.equal(packet.losses,undefined);
});
test('raw or formatted result mismatch never silently replaces frozen compatibility losses',()=>{
  const s=source(0);
  s.line.frictionLoss='7.3 bar';assert.equal(capture(s).losses,undefined);
  s.line.frictionLoss='106';assert.equal(capture(s).losses,undefined);
  s.line.frictionLoss='106.1';assert.equal(capture(s).losses[0].psi,106.1);
  assert.notEqual(capture(s).losses[0].psi,s.setup.result.canonicalRequiredPdp.frictionLossPsi);
});
