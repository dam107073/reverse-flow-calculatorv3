const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const U = require('../www/js/units');
const B = require('../www/js/required-pdp-units');
const H = require('../www/js/hydraulics-core');
const source = fs.readFileSync(require.resolve('../www/js/app'), 'utf8');
const bar = U.normalizePreferences({unitSystem:'metric'});
const kpa = {...bar,metricPressureUnit:'kpa'};
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function extract(name) {
  const start=source.indexOf(`function ${name}(`), body=source.indexOf(') {',start)+2;
  let depth=0;
  for(let i=body;i<source.length;i++) {
    if(source[i]==='{') depth++;
    if(source[i]==='}' && --depth===0) return source.slice(start,i+1);
  }
  throw Error(name);
}
function context(mode, extra={}) {
  const c=vm.createContext({
    state:{mode,pdp:'150',relayResidualPressure:'30',...extra},operationalResult:null,operationalSnapshot:null,
    ReverseFlowHydraulics:H,
    isReverseMode:()=>mode==='reverse', isRelayMode:()=>mode==='relay',isApparatusMountedMode:()=>mode==='apparatusMounted',
    isSplitLayMode:()=>false,isStandpipeOpsMode:()=>false,isPhase2bMode:()=>true,isRequiredPdpMode:()=>false,
    isReverseSmoothbore:()=>false,isMasterStream:()=>false,isFixedFogType:t=>t==='fixedFog',usesSmoothboreHydraulics:()=>false,
    numberOrNull:v=>v===''||v==null?null:Number(v),
    getNozzleDisplay:()=> 'Automatic Fog • 50 psi',getSetupDisplay:()=> '200\' of 1.88"',
    calculateNozzleReaction:(q,p)=>`${Math.round(H.fogReaction(q,p))} lb`,
    canonicalReaction:(q,p)=>H.fogReaction(q,p),
    roundToNearestFive:q=>Math.round(q/5)*5,
    getActiveHenTurboCurve:()=>null,
    getApparatusRatedFlow:()=>1000,
    formatPsiValue:v=>`${Number(v)} PSI`,
    setResult:()=>{},renderWarnings:()=>{},buildLegacyPresetSummary:()=> 'U.S. summary',
    els:new Proxy({}, {get(){throw Error('Persistence read rendered DOM');}})
  });
  for(const name of ['getApparatusElevationPressure','validateCommonInputs','setOperationalResult','calculateRelayPdp','calculateApparatusMounted','calculateReverseFlow','captureCurrentResultSnapshot']) vm.runInContext(extract(name),c);
  return c;
}
const input = {pdp:150,hoseLength:200,nozzlePressure:50,nozzleType:'automaticFog',ratedFlow:185,ratedPressure:50,applianceLoss:0,masterStreamLoss:0,coefficient:8,selectedHose:{maxReferenceFlow:500,chartName:'1.88"'},warnings:[]};
for(const mode of ['reverse','apparatusMounted','relay']) {
  test(`${mode}: explicit metric edits use shared quantity parser without display drift`,()=>{
    const fields=B.fieldsForMode(mode);
    for(const [id,spec] of Object.entries(fields)) {
      const value=spec.quantity==='pressure'?'3.5':'60';
      const parsed=B.parseEdit(value,id,bar,mode);
      assert.equal(parsed.valid,true);near(Number(parsed.canonical),U.toCanonical(Number(value),spec.quantity,bar));
      for(let i=0;i<50;i++) {B.number(parsed.canonical,spec.quantity,bar);B.number(parsed.canonical,spec.quantity,kpa);}
      near(Number(parsed.canonical),U.toCanonical(Number(value),spec.quantity,bar));
      if(spec.quantity==='pressure') assert.equal(B.parseEdit('3.55',id,bar,mode).valid,false);
      assert.equal(B.parseEdit('-1',id,bar,mode).valid,!!spec.signed);
    }
  });
}
test('Reverse Flow preserves inverse canonical flow and nearest-five output before saving',()=>{
  const c=context('reverse');c.calculateReverseFlow({...input,warnings:[]});
  assert.equal(c.operationalResult.flowGpm,250);assert.equal(c.operationalResult.roundedFlowGpm,250);
  assert.equal(c.operationalResult.frictionLossPsi,100);
  const saved=c.captureCurrentResultSnapshot({});
  assert.equal(saved.primaryResult,'250 GPM');assert.equal(saved.pdpSummary,'150 PSI');
  assert.equal(saved.canonicalOperational.flowGpm,250);
  near(U.litresPerMinuteToGpm(U.gpmToLitresPerMinute(saved.canonicalOperational.flowGpm)),250);
});
test('Apparatus metres become feet before the existing 0.434 elevation calculation',()=>{
  const elevation=Number(B.parseEdit('15','apparatusElevation',bar,'apparatusMounted').canonical);
  const pressure=Number(B.parseEdit('7.0','customNozzlePressure',bar,'apparatusMounted').canonical);
  const c=context('apparatusMounted',{apparatusElevation:String(elevation)});
  c.calculateApparatusMounted({nozzlePressure:pressure,nozzleType:'automaticFog',masterStreamLoss:25,warnings:[]});
  near(c.operationalResult.elevationLossPsi,elevation*.434);
  near(c.operationalResult.requiredPdpPsi,pressure+elevation*.434+25);
  assert.equal(c.captureCurrentResultSnapshot({}).canonicalOperational.elevationFeet,elevation);
});
test('Apparatus keeps the existing prohibition on negative elevation',()=>{
  const c=context('apparatusMounted',{apparatusElevation:'-1'}),warnings=[];
  c.calculateApparatusMounted({nozzlePressure:80,nozzleType:'automaticFog',masterStreamLoss:25,warnings});
  assert.equal(c.operationalResult,null);assert.match(warnings[0],/0 feet or greater/);
});
for(const [length,threshold] of [[270,null],[270.001,300],[370,300],[370.001,400]]) {
  test(`Relay canonical warning boundary at ${length+30} PSI remains exact`,()=>{
    const c=context('relay'),warnings=[];
    c.calculateRelayPdp({...input,targetGpm:1000,hoseLength:length,coefficient:1,selectedHose:{maxReferenceFlow:2000},warnings});
    near(c.operationalResult.requiredPdpPsi,length+30);
    if(threshold) {
      assert.match(warnings[0],new RegExp(`${threshold} psi`));
      for(const p of [bar,kpa]) assert.match(B.metricWarning(warnings[0],{id:'5',chartName:'5"'},p),new RegExp(B.format(threshold,'pressure',p).replace('.','\\.')));
    } else assert.equal(warnings.length,0);
    assert.equal(c.captureCurrentResultSnapshot({}).canonicalOperational.residualPressurePsi,30);
  });
}
test('metric warnings retain canonical threshold meaning and nominal dual hose category',()=>{
  assert.equal(U.factoryHoseLabel({id:'dual3'},bar),'Dual 76 mm');
  const w=B.metricWarning('Estimated supply appliance loss applied: 10 psi at flows >350 GPM.',{id:'3',chartName:'3"'},bar);
  assert.equal(w,'Estimated supply appliance loss applied: 0.7 bar at flows >1325 L/min.');
  near(B.incrementFeet(U.metresToFeet(60),bar),U.metresToFeet(75));
  assert.equal(B.fieldsForMode('standpipeOps').pdp,undefined);
});
