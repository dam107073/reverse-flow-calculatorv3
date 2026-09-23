const test=require('node:test');
const assert=require('node:assert/strict');
const U=require('../www/js/units');
const P=require('../www/js/pump-chart-units');
const f=require('./fixtures/pump-chart-us-baseline.json');
const us=U.DEFAULTS,bar={...us,unitSystem:'metric'},kpa={...bar,metricPressureUnit:'kpa'};
const catalog={tips:[{id:'1-1/8',diameter:1.125}],blades:[]};
const present=(i,p=bar)=>P.present(f.setups[i],p,f.views[i].projection,catalog);
const row=(model,label)=>model.breakdownRows.find(([l])=>l===label)?.[1];
const fmt=(n,q='pressure',p=bar)=>U.formatMetric(n,q,p,{digits:q==='pressure'?(p.metricPressureUnit==='kpa'?0:1):q==='length'?2:0});
for(let i=0;i<f.setups.length;i++)test(`${f.setups[i].name}: pure, detached projection and exact U.S. delegation`,()=>{
  const data=JSON.stringify(f.setups[i]),projection=JSON.stringify(f.views[i].projection);
  assert.equal(present(i,us),null);
  for(let repeat=0;repeat<10;repeat++)for(const p of [bar,kpa])assert.deepEqual(present(i,p),present(i,p));
  assert.equal(JSON.stringify(f.setups[i]),data);assert.equal(JSON.stringify(f.views[i].projection),projection);
});
test('mode-aware primary results use numeric packets, never poisoned compatibility numbers',()=>{
  for(let i=0;i<7;i++) {
    const s=structuredClone(f.setups[i]);s.result.flowSummary='99999 bananas';s.result.pdpSummary='77777 bar';
    const m=P.present(s,bar,f.views[i].projection,catalog);
    assert.doesNotMatch(m.hydraulic.text,/99999|77777|bananas/);assert.equal(m.hydraulic.legacy,false);
  }
});
test('saved 100 ft stays exactly 30.48 m, numerically different from 30 m',()=>{
  const r=f.setups[0].result.canonicalRequiredPdp;
  const v=row(present(0),'FL / 30.48 m');
  assert.equal(v.text,fmt(r.frictionLossPer100FeetPsi));
  assert.equal(U.feetToMetres(100),30.48);
  const at30m=r.frictionLossPer100FeetPsi*U.metresToFeet(30)/100;
  assert.notEqual(U.psiToBar(at30m),U.psiToBar(r.frictionLossPer100FeetPsi));
  assert.notEqual(fmt(at30m),v.text);
});
test('overloaded Apparatus/Standpipe/Split fields retain their semantic quantities',()=>{
  const a=present(3),ar=f.setups[3].result.canonicalOperational;
  assert.equal(row(a,'Total FL').text,fmt(ar.nozzlePressurePsi));
  assert.equal(row(a,'Elevation Loss').text,fmt(ar.elevationLossPsi));
  assert.equal(row(a,'FL / 30.48 m'),undefined);
  const s=present(6);assert.match(row(s,'Supply Flow').text,/L\/min/);assert.equal(row(s,'FL / 30.48 m'),undefined);
  assert.match(row(present(5),'FL Breakdown').text,/S1.*L1.*L2/);
  assert.equal(row(present(1),'Nozzle Reaction').text,'Dual lines: NO');
});
test('factory labels and actual physical diameters are distinct',()=>{
  assert.match(present(0).configuration.text,/45 mm/);
  assert.match(present(1).configuration.text,/64 mm.*28\.575 mm/);
  const s=structuredClone(f.setups[1]);s.inputs.smoothboreTip='physical-1.75';
  assert.match(P.present(s,bar,f.views[1].projection,{tips:[{id:'physical-1.75',diameter:1.75}]}).configuration.text,/44\.45 mm/);
  assert.match(present(9).configuration.text,/Custom 45 mm.*Unknown tip 7/);assert.equal(present(9).configuration.legacy,true);
});
test('legacy/imported result text and warnings remain literal while input quantities convert',()=>{
  for(const index of [8,10]) {
    const s=f.setups[index], m=present(index);
    assert.equal(m.hydraulic.legacy,true);
    assert.match(m.configuration.text,/60\.96 m.*45 mm/);
    assert.equal(row(m,s.result.primaryResultLabel).text,s.result.primaryResult);
  }
  const s=structuredClone(f.setups[0]);s.result.canonicalRequiredPdp.version=999;
  assert.equal(P.present(s,bar,f.views[0].projection,catalog).hydraulic.legacy,true);
  s.mode='wyeOps';assert.equal(P.present(s,bar,f.views[0].projection,catalog).configuration.text,f.views[0].projection.configuration);
});
test('asymmetric multiline fields use each saved branch, floors stay counts',()=>{
  for(const index of [5,6]){
    const m=present(index), r=f.setups[index].result.canonicalMultiLine;
    const label=index===5?'Attack 2 Flow':'Standpipe Attack 2 Flow';
    const flow=index===5?r.actualAttack2.actualFlow:r.line2.flow;
    assert.equal(row(m,label).text,fmt(flow,'flow'));
    assert.match(m.configuration.text,/L1:.*60\.96 m.*45 mm/);assert.match(m.configuration.text,/L2:.*45\.72 m.*64 mm/);
  }
  assert.match(present(6).configuration.text,/Floor 5/);assert.match(present(6).configuration.text,/Floor 3/);
});
test('reaction uses canonical force and preference; invalid numeric packet fields fall back',()=>{
  const r=f.setups[0].result.canonicalRequiredPdp;
  assert.equal(row(present(0),'Nozzle Reaction').text,fmt(r.reactionLbf,'force'));
  const p={...bar,metricReactionUnit:'kgf'};
  assert.equal(row(present(0,p),'Nozzle Reaction').text,fmt(r.reactionLbf,'force',p));
  const s=structuredClone(f.setups[0]);s.result.canonicalRequiredPdp.reactionLbf='66 lbf';
  assert.deepEqual(row(P.present(s,bar,f.views[0].projection,catalog),'Nozzle Reaction'),{text:s.result.nozzleReaction,legacy:true});
});
test('missing multiline/composite packets preserve each historical value once',()=>{
  for(const i of [1,2,5,6]) {
    const s=structuredClone(f.setups[i]);delete s.result.canonicalRequiredPdp;delete s.result.canonicalOperational;delete s.result.canonicalMultiLine;
    const m=P.present(s,bar,f.views[i].projection,catalog);
    for(const label of ['Nozzle','Nozzle Reaction',...(i===2||i===5?['FL / 100 ft']:[])]) {
      const original=f.views[i].projection.breakdownRows.find(([l])=>l===label);
      if(!original)continue;
      const target=label==='FL / 100 ft'?'FL Breakdown':label;
      assert.equal(row(m,target).text,original[1]);
    }
  }
});
test('masterstream supply uses saved main hose, never unrelated reverse-supply defaults',()=>{
  const s=structuredClone(f.setups[1]);s.inputs.nozzleType='masterstream';s.inputs.masterStreamType='smoothbore';s.inputs.hoseLength='200';
  const legacy=structuredClone(f.views[1].projection);legacy.referenceSections=[{title:'Configuration',rows:[{label:'Supply',value:'200 ft 2.5'}]}];
  assert.equal(P.present(s,bar,legacy,catalog).referenceSections[0].rows[0].value.text,'60.96 m 64 mm');
  s.inputs.reverseSupplyEnabled=true;
  assert.deepEqual(P.present(s,bar,legacy,catalog).referenceSections[0].rows[0].value,{text:'200 ft 2.5',legacy:true});
});
