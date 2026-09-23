const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const U=require('../www/js/units'),B=require('../www/js/required-pdp-units'),H=require('../www/js/hydraulics-core'),S=require('../www/js/settings-session');
const source=fs.readFileSync(require.resolve('../www/js/app'),'utf8');
const bar=U.normalizePreferences({unitSystem:'metric'}),kpa={...bar,metricPressureUnit:'kpa'};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function extract(name){const start=source.indexOf(`function ${name}(`),body=source.indexOf(') {',start)+2;let depth=0;for(let i=body;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);}throw Error(name);}
for(const mode of ['splitLay','standpipeOps','wyeOps'])test(`${mode}: nested metric field boundaries exclude all counts/categories`,()=>{
 const fields=B.fieldsForMode(mode);
 assert.ok(Object.keys(fields).length>=10);
 for(const [id,spec] of Object.entries(fields)){
  assert.doesNotMatch(id,/Floor|Lines|Count|Enabled|Hose|Model/);
  const raw=spec.quantity==='diameter'?'22.225':spec.quantity==='pressure'?'3.5':'60';
  const parsed=B.parseEdit(raw,id,bar,mode);assert.equal(parsed.valid,true);near(Number(parsed.canonical),U.toCanonical(Number(raw),spec.quantity,bar));
  const canonical=parsed.canonical;for(let i=0;i<50;i++){B.number(canonical,spec.quantity,bar);B.number(canonical,spec.quantity,kpa);}assert.equal(parsed.canonical,canonical);
 }
 assert.equal(fields.standpipeAttack1Floor,undefined);
});
test('Wye custom physical diameter converts mathematically independently of nominal categories',()=>{
 near(Number(B.parseEdit('22.225','wyeAttack1CustomTip',bar,'wyeOps').canonical),.875);
 assert.equal(B.number(.875,'diameter',bar),'22.225');assert.equal(U.factoryHoseLabel({id:'1.75'},bar),'45 mm');
 assert.equal(B.number(1.75,'diameter',bar),'44.45');
});
function context(){const c=vm.createContext({state:{standpipeOps:{}},ReverseFlowHydraulics:H,HOSE_OPTIONS:[{id:'1.88',coefficient:8},{id:'3',coefficient:.8}],
 numberOrNull:v=>v==null||v===''?null:Number(v),normalizeNozzleType:v=>v,isFixedFogType:t=>t==='fixedFog',isAutomaticFogType:t=>t==='automaticFog',
 getActiveHoseCoefficient:id=>id==='3'?.8:8,getLineNozzleType:(s,i)=>s[`attack${i}NozzleType`],
 renderWarnings:()=>{},setResult:()=>{},setStandpipeResults:r=>{c.result=r;},formatNumber:(n,d)=>Number(n).toFixed(d),
 getWyeSupplyHoseOptions:()=>c.HOSE_OPTIONS,getWyeAttackHoseOptions:()=>c.HOSE_OPTIONS});
 for(const name of ['getStandpipeElevationPressure','calculateStandpipeFogReaction','calculateStandpipeAttackLine','calculateActualStandpipeLine','calculateStandpipeOps','getSplitApplianceLoss','getWyeApplianceLoss','getWyeHoseCoefficientValue','calculateWyeFrictionLoss','calculateWyeSmoothboreFlow','calculateWyeFogFlow','calculateWyeSmoothboreReaction','calculateWyeFogReaction','getSelectedWyeTipDiameter','getSelectedWyeTipLabel','getWyePressureValue','findWyeHoseById','readWyeLine','calculateWyeOperation','calculateActualWyeLine','getWyeScenarioWarnings','calculateWyeClosureLine','solveWyeRemainingNozzlePressure','getWyeFlowAtPressure','solveWyeRemainingAutomaticFog'])vm.runInContext(extract(name),c);return c;}
for(const flow of [249.999,250,250.001])test(`Standpipe exact ${flow} GPM outlet and ${flow*2} GPM total boundary`,()=>{
 const c=context();c.state.standpipeOps={supplyLength:'100',supplyHoseSize:'3',standpipeLoss:'25',attack2Enabled:true};
 for(const i of [1,2])Object.assign(c.state.standpipeOps,{[`attack${i}Floor`]:'8',[`attack${i}Length`]:'100',[`attack${i}HoseSize`]:'1.88',[`attack${i}NozzleType`]:'automaticFog',[`attack${i}NozzlePressure`]:'50',[`attack${i}Flow`]:String(flow)});
 c.calculateStandpipeOps([]);near(c.result.totalFlow,flow*2);assert.equal(c.result.line1.floor,8);assert.equal(c.result.line1.elevationLoss,35);
 assert.equal(c.result.line1.warnings.some(w=>w.includes('250 GPM')),flow>250);assert.equal(c.result.systemWarnings.some(w=>w.includes('500 GPM')),flow>250);
 near(U.barToPsi(U.psiToBar(c.result.requiredPdp)),c.result.requiredPdp);
});
for(const flow of [349.999,350,350.001])test(`Split and Wye retain distinct appliance-loss boundary at ${flow} GPM`,()=>{
 const c=context();assert.equal(c.getSplitApplianceLoss('gatedWye',flow),flow>=350?10:0);assert.equal(c.getWyeApplianceLoss(flow),flow>350?10:0);
});
const el=value=>({value:String(value)});
function wyeControls(length=100){const line=i=>({lineNumber:i,hose:el('1.88'),length:el(i===1?100:length),nozzleType:el('automaticFog'),pressure:el(50),flow:el(100),ratedFlow:el(''),ratedPressure:el(''),customPressure:el('')});return {supplyHose:el('3'),supplyLength:el(300),attack1:line(1),attack2:line(2)};}
for(const length of [106.249,106.25,106.251])test(`Wye balance remains canonical at ${length} ft; closure retains ceil-PSI PDP`,()=>{
 const c=context(),r=c.calculateWyeOperation(wyeControls(length));assert.equal(r.ok,true);
 assert.equal(r.drivingLine==='Balanced',length<106.25);assert.equal(r.fixedPdp,Math.ceil(r.requiredPdp));
 const closure=c.calculateWyeClosureLine(r,r.attack1);assert.equal(closure.ok,true);assert.equal(closure.nozzlePressure,r.attack1.nozzlePressure);assert.ok(closure.flow>r.attack1.flow);
 const total=closure.nozzlePressure+c.calculateWyeFrictionLoss(r.supplyHose,r.supplyLength,closure.flow)+c.calculateWyeFrictionLoss(r.attack1.hose,r.attack1.length,closure.flow)+closure.applianceLoss;
 near(total,r.fixedPdp);
 for(const pref of [bar,kpa]){B.format(r.fixedPdp,'pressure',pref);B.format(closure.flow,'flow',pref);}assert.equal(r.fixedPdp,Math.ceil(r.requiredPdp));
});
test('Wye adapter reads untouched canonical values and physical tip metadata, not rounded Metric controls',()=>{
 const c=vm.createContext({window:{ReverseFlowOperationalUnits:B},state:{wyeOps:{supplyLength:'196.8503937007874',attack1Length:'123.456',attack1CustomPressure:'50.76320820557321',attack1CustomTip:'.875'}},SMOOTHBORE_TIPS:[{id:'7/8',diameter:.875,label:'7/8"'}]});vm.runInContext(extract('canonicalWyeControls'),c);
 const result=c.canonicalWyeControls({supplyLength:{id:'wyeSupplyLength',value:'60'},attack1:{length:{id:'wyeAttack1Length',value:'38'},customPressure:{id:'wyeAttack1CustomPressure',value:'3.5'},customTip:{id:'wyeAttack1CustomTip',value:'22.225'},tip:{id:'wyeAttack1Tip',value:'7/8',selectedOptions:[{textContent:'22.225 mm'}]}},attack2:{}});
 assert.equal(result.attack1.length.value,'123.456');assert.equal(result.attack1.customTip.value,'.875');assert.equal(result.attack1.tip.selectedOptions[0].textContent,'7/8"');
});
test('multi-line snapshot capture never reads Metric DOM',()=>{
 const packet={primaryResult:'150 PSI',canonicalMultiLine:{version:1,totalPdp:149.75,totalAttackFlow:400},warnings:[]};
 const c=vm.createContext({isSplitLayMode:()=>true,isStandpipeOpsMode:()=>false,multiLineSnapshot:packet,buildLegacyPresetSummary:()=> 'US summary',els:new Proxy({}, {get(){throw Error('DOM read');}})});vm.runInContext(extract('captureCurrentResultSnapshot'),c);
 assert.equal(c.captureCurrentResultSnapshot({}).canonicalMultiLine.totalPdp,149.75);
});
test('Settings closure presentation is one-use session data separate from saved hydraulics',()=>{
 const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)};
 const state={mode:'wyeOps',splitLay:{},standpipeOps:{},wyeOps:{attack1Length:'200'}};const before=JSON.stringify(state);
 S.capture(storage,state,null,{wyeClosedLine:2});const result=S.take(storage,new Set(['wyeOps']));assert.equal(result.presentation.wyeClosedLine,2);assert.equal(JSON.stringify(state),before);assert.equal(S.take(storage,new Set(['wyeOps'])),null);
});
