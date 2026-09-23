(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./units'):root.ReverseFlowUnits,node?require('./hydraulics-core'):root.ReverseFlowHydraulics);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ReverseFlowPackageUnits=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(U,H){
  'use strict';
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const input=v=>(finite(v)||typeof v==='string'&&/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim()))?Number(v):null;
  const round=(v,d=0)=>finite(v)?Number(v.toFixed(d)):null;
  const freezePreference=p=>Object.freeze({...U.DEFAULTS,...p});
  const pressureUnit=p=>U.displayUnit('pressure',p);
  const format=(v,q,p)=>U.formatMetric(v,q,p,{digits:q==='pressure'?(p.metricPressureUnit==='kpa'?0:1):q==='length'?2:0});
  function packet(s){const r=s.result||{},m=s.mode;const p=m==='requiredPdp'?r.canonicalRequiredPdp:['reverse','apparatusMounted','relay'].includes(m)?r.canonicalOperational:['splitLay','standpipeOps'].includes(m)?r.canonicalMultiLine:null;return p?.version===1&&(m==='requiredPdp'||p.mode===m)?p:{};}
  function savedReference(psi,p){return {lengthFeet:100,label:'FL / 30.48 m',value:format(psi,'pressure',p)};}
  // No storage, screen adapters, compatibility-number parsing or historical recalculation.
  function row(s,compatibility,preference,tips=[]){
    if(preference.unitSystem!=='metric')return {...compatibility};
    const p=preference,i=s.inputs||{},r=s.result||{},c=packet(s),m=s.mode;
    const known=['requiredPdp','reverse','apparatusMounted','relay','splitLay','standpipeOps'].includes(m);
    const split=m==='splitLay',stand=m==='standpipeOps',multi=split||stand,n=i[m]||{},line=split?c.actualAttack1:c.line1;
    const result={...compatibility,legacyFields:[]};
    const legacy=(key,text)=>{result[key]=String(text??compatibility[key]??'');if(result[key]&&result[key]!=='—')result.legacyFields.push(key);};
    const quantity=(key,v,q,fallback)=>finite(v)?result[key]=format(v,q,p):legacy(key,fallback);
    if(!known){Object.keys(result).filter(k=>!['id','name','appliance','legacyFields'].includes(k)).forEach(k=>legacy(k));return result;}
    quantity('gpm',m==='reverse'?c.roundedFlowGpm:multi?round(split?c.totalAttackFlow:c.totalFlow):round(c.flowGpm),'flow',r.flowSummary||r.splitSupplyFlow||r.standpipeTotalFlow||r.calculatedFlow||compatibility.gpm);
    quantity('pdp',m==='reverse'?c.pdpPsi:multi?round(split?c.totalPdp:c.requiredPdp):c.roundedPdpPsi,'pressure',stand?(r.standpipePrimaryPdp||r.pdpSummary||r.calculatedPdp):r.pdpSummary||r.calculatedPdp||compatibility.pdp);
    const type=multi?n.attack1NozzleType:i.nozzleType==='masterstream'?i.masterStreamType:i.nozzleType;
    const configured=input(i.nozzlePressure==='custom'?i.customNozzlePressure:i.nozzlePressure);
    // Generic export NP historically comes from configuration. Fixed-fog NP is
    // only usable when the saved packet proves the operating pressure.
    const np=multi?round(split?line?.actualNozzlePressure:line?.nozzlePressure):m==='relay'?null:type==='fixedFog'?c.nozzlePressurePsi:configured;
    quantity('nozzlePressure',np,'pressure',multi?(split?r.splitAttack1NpResult:r.standpipeAttack1NpResult):compatibility.nozzlePressure);
    if(m==='apparatusMounted')quantity('elevation',round(c.elevationLossPsi,1),'pressure',r.apparatusElevationLoss);
    else if(stand)quantity('elevation',round(line?.elevationLoss),'pressure',r.standpipeAttack1ElevationResult);
    let losses=[];
    if(multi)losses=[['S',round(split?c.supply1TotalFl:c.supplyTotalFl,1)],['A',round(split?line?.actualTotalFl:line?.totalFl,1)]];
    else if(m==='reverse'&&i.reverseSupplyEnabled)losses=[['S',round(c.supplyFrictionLossPsi,1)],['A',round(c.attackFrictionLossPsi,1)]];
    else if(['requiredPdp','reverse','relay'].includes(m))losses=[['',round(c.frictionLossPsi,1)]];
    if(losses.length&&losses.every(([,v])=>finite(v)))result.frictionLoss=losses.map(([role,v])=>`${role?role+' ':''}${format(v,'pressure',p)}`).join('\n');
    else legacy('frictionLoss',multi?compatibility.frictionLoss:r.attackFrictionLoss||r.totalFl||compatibility.frictionLoss);
    const hoses=multi?[[n.supplyHoseSize,n.supplyLength],[n.attack1HoseSize,n.attack1Length]]:[...(i.reverseSupplyEnabled?[[i.reverseSupplyHoseSize,i.reverseSupplyLength]]:[]),[i.hoseSize,i.hoseLength]];
    const rendered=hoses.map(([id,length])=>{const feet=input(length);if(!finite(feet))return null;try{return `${U.factoryHoseLabel({id},p)} × ${format(feet,'length',p)}`;}catch{return null;}});
    if(rendered.length&&rendered.every(Boolean)&&!Object.prototype.hasOwnProperty.call(r,'hoseLength'))result.hose=rendered.join(' → ');else legacy('hose');
    const tipId=multi?n.attack1SmoothboreTip:i.smoothboreTip;
    const tip=tips.find(t=>t.id===tipId);
    if(type==='smoothbore'&&finite(tip?.diameter))result.nozzle=`SB ${U.physicalDiameterLabel(tip.diameter,p,{digits:4})}`;
    else if(['automaticFog','fog'].includes(type))result.nozzle='Auto Fog';
    else if(type==='fixedFog'){
      const flow=input(multi?n.attack1RatedFlow:i.ratedFlow),pressure=input(multi?n.attack1RatedPressure:i.ratedPressure);
      // Ratings appear in the existing multiline nozzle description only.
      result.nozzle=multi&&finite(flow)&&finite(pressure)?`Fixed Fog ${format(flow,'flow',p)} @ ${format(pressure,'pressure',p)}`:'Fixed Fog';
    }else legacy('nozzle');
    return result;
  }
  function references(hoses,tips,p){
    const lengthFeet=U.metresToFeet(30);
    return {
      lengthFeet,
      hoses:hoses.map(h=>({...h,label:(()=>{try{return U.factoryHoseLabel(h,p);}catch{return h.label;}})()})),
      rows:Array.from({length:21},(_,k)=>{const flow=k*200,gpm=U.litresPerMinuteToGpm(flow);return {flow,flowGpm:gpm,lossesPsi:hoses.map(h=>H.frictionLoss(Number(h.coefficient),gpm,lengthFeet))};}),
      smoothbore:[{title:'Handline',psi:50,min:.75,max:1.25},{title:'Masterstream',psi:80,min:1.25,max:3}].map(t=>({...t,rows:tips.filter(d=>d.diameter>=t.min&&d.diameter<=t.max).map(d=>({id:d.id,diameterInches:d.diameter,label:U.physicalDiameterLabel(d.diameter,p,{digits:4}),flowGpm:H.smoothboreFlow(d.diameter,t.psi)}))}))
    };
  }
  function referencePressure(psi,p){const v=U.fromCanonical(psi,'pressure',p),digits=p.metricPressureUnit==='kpa'?1:3,text=v.toFixed(digits);return v!==0&&Number(text)===0?v.toPrecision(3):text;}
  function data(base,setups,p,tips){const preference=freezePreference(p);if(preference.unitSystem!=='metric')return base;return {...base,preference,setups:setups.map((s,k)=>row(s,base.setups[k],preference,tips)),metricReference:references(base.hoses,base.tips,preference)};}
  return Object.freeze({row,data,references,referencePressure,savedReference,freezePreference,format,pressureUnit});
});
