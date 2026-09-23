(function (root, factory) {
  const U = typeof module === "object" && module.exports ? require("./units") : root.ReverseFlowUnits;
  const api = factory(U);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowPumpChartUnits = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (U) {
  "use strict";
  const MODES = ["requiredPdp", "reverse", "apparatusMounted", "relay", "splitLay", "standpipeOps"];
  const numeric = v => typeof v === "number" && Number.isFinite(v);
  const input = v => (numeric(v) || typeof v === "string" && /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim())) ? Number(v) : null;
  const value = (text, legacy = false) => ({text:String(text ?? ""), legacy});
  const old = text => value(text, Boolean(text));
  function join(parts, separator = " • ") {
    const kept = parts.filter(p => p && p.text !== "");
    return value(kept.map(p => p.text).join(separator), kept.some(p => p.legacy));
  }
  const prefix = (label, v) => value(`${label}${v.text}`, v.legacy);
  function packet(setup) {
    const result = setup.result || {}, mode = setup.mode;
    const r = mode === "requiredPdp" ? result.canonicalRequiredPdp
      : ["reverse","apparatusMounted","relay"].includes(mode) ? result.canonicalOperational
      : ["splitLay","standpipeOps"].includes(mode) ? result.canonicalMultiLine : null;
    return r?.version === 1 && (mode === "requiredPdp" || r.mode === mode) ? r : {};
  }

  // Pure screen projection. `legacy` is already-rendered compatibility output;
  // no storage, normalization, hydraulic formulas, global calculator state, or
  // parsing of legacy result strings is permitted here.
  function present(setup, preference, legacy, catalog = {}) {
    if (preference.unitSystem !== "metric") return null;
    const mode = setup.mode, i = setup.inputs || {}, result = setup.result || {}, r = packet(setup);
    const known = MODES.includes(mode), split = mode === "splitLay", standpipe = mode === "standpipeOps";
    const multi = split || standpipe, n = i[mode] || {};
    const fmt = (v, q = "pressure", fallback = "") => numeric(v)
      ? value(U.formatMetric(v,q,preference,{digits:q === "pressure" ? preference.metricPressureUnit === "kpa" ? 0 : 1 : q === "length" ? 2 : q === "diameter" ? 4 : 0})) : old(fallback);
    const field = (v,q,fallback) => fmt(input(v),q,fallback);
    const hose = id => {
      try { return value(U.factoryHoseLabel({id},preference)); } catch { return old(id); }
    };
    const lengthHose = (length,id) => join([length !== "" && length != null ? field(length,"length",String(length)) : null,hose(id)]," ");
    const tip = id => {
      const t = catalog.tips?.find(t => t.id === id);
      return t && numeric(t.diameter) ? value(U.physicalDiameterLabel(t.diameter,preference,{digits:4})) : old(id);
    };
    const nozzle = (data, stem = "") => {
      const get = key => data[stem ? stem + key[0].toUpperCase() + key.slice(1) : key];
      const type = get("nozzleType") === "masterstream" ? data.masterStreamType : get("nozzleType");
      if (type === "smoothbore") return join([value("Smoothbore"),tip(get("smoothboreTip"))]);
      if (type === "blade") return value(catalog.blades?.find(b => b.id === get("bladeModel"))?.label || "Blade");
      if (type === "fixedFog") return join([value("Fixed Fog"),join([field(get("ratedFlow"),"flow",get("ratedFlow")),field(get("ratedPressure"),"pressure",get("ratedPressure"))]," @ ")]);
      if (type === "automaticFog" || type === "fog") {
        if (stem && split) return value("Automatic Fog");
        const flow = stem ? get("flow") : mode === "apparatusMounted" ? (data.apparatusFogFlow === "custom" ? data.apparatusCustomFogFlow : data.apparatusFogFlow) : mode === "reverse" ? r.flowGpm : data.targetGpm;
        const pressure = get("nozzlePressure") === "custom" ? get("customNozzlePressure") : get("nozzlePressure");
        return join([value("Automatic Fog"),flow ? field(flow,"flow",flow) : null,!stem && pressure ? field(pressure,"pressure",pressure) : null]);
      }
      return old(type);
    };
    const np = r.nozzlePressurePsi;
    const pdp = mode === "reverse" ? r.pdpPsi : multi ? (split ? numeric(r.totalPdp) ? Math.round(r.totalPdp) : null : numeric(r.requiredPdp) ? Math.round(r.requiredPdp) : null) : r.roundedPdpPsi;
    const flow = mode === "reverse" ? r.roundedFlowGpm : multi ? (split ? r.totalAttackFlow : r.totalFlow) : r.flowGpm;
    const attack = index => split ? r[`actualAttack${index}`] : r[`line${index}`];
    const lineQuantity = (index, q) => {
      const l = attack(index);
      return l?.[q === "flow" ? split ? "actualFlow" : "flow" : q === "np" ? split ? "actualNozzlePressure" : "nozzlePressure" : q === "fl" ? split ? "actualTotalFl" : "totalFl" : q];
    };
    const lineConfig = index => join([
      standpipe ? value(`Floor ${n[`attack${index}Floor`] || ""}`) : null,
      lengthHose(n[`attack${index}Length`],n[`attack${index}HoseSize`]),nozzle(n,`attack${index}`)
    ]);
    const supply = second => lengthHose(n[second ? "supply2Length" : "supplyLength"],n[second ? "supply2HoseSize" : "supplyHoseSize"]);
    const secondAttack = split ? String(n.attackLines) === "2" : Boolean(n.attack2Enabled);
    let configuration = old(legacy.configuration);
    if (known) {
      if (multi) configuration = join([
        prefix(n.dualSupply ? "2 × " : standpipe ? "FDC: " : "Supply: ",supply(false)),
        split && String(n.sectionCount) === "3" ? prefix("Second Supply: ",supply(true)) : null,
        prefix("L1: ",lineConfig(1)), secondAttack ? prefix("L2: ",lineConfig(2)) : null,
        standpipe ? prefix("Standpipe Loss ",field(n.standpipeLoss,"pressure",n.standpipeLoss)) : null
      ],"\n");
      else if (mode === "apparatusMounted") configuration = numeric(np) ? prefix("Deck Gun ",nozzle({...i,nozzleType:i.masterStreamType})) : old(legacy.configuration);
      else configuration = join([
        Object.prototype.hasOwnProperty.call(result,"hoseLength") ? old(legacy.configuration) : lengthHose(i.hoseLength,i.hoseSize),
        mode === "relay" ? field(i.targetGpm,"flow",i.targetGpm) : nozzle(i)
      ]);
    }
    const flowText = fmt(flow,"flow",result.flowSummary || (split ? result.splitSupplyFlow : "") || result.calculatedFlow || "");
    const pdpText = fmt(pdp,"pressure",result.pdpSummary || result.primaryResult || (result.calculatedPdp ? `${result.calculatedPdp} PSI` : ""));
    const hydraulic = !known ? old(legacy.hydraulic) : mode === "relay"
      ? join([prefix("PDP ",pdpText),prefix("Residual ",fmt(r.residualPressurePsi ?? input(i.relayResidualPressure),"pressure",i.relayResidualPressure))],"\n")
      : join([flowText,pdpText.text ? prefix("PDP ",pdpText) : null]);

    const configuredNP = () => field(i.nozzlePressure === "custom" ? i.customNozzlePressure : i.nozzlePressure,"pressure",i.nozzlePressure);
    const effectiveNozzle = fallback => numeric(np) ? join([nozzle(mode === "apparatusMounted" ? {...i,nozzleType:i.masterStreamType} : i),prefix("NP ",fmt(np))]) : old(fallback);
    const reaction = fallback => {
      // Required PDP's old reaction slot can be a supply arrangement, not force.
      const type = i.nozzleType === "masterstream" ? i.masterStreamType : i.nozzleType;
      if (mode === "requiredPdp" && type === "smoothbore" && !numeric(r.flowPerLineGpm)) return old(fallback);
      if (mode === "requiredPdp" && type === "smoothbore") return i.dualLineSupply && i.nozzleType === "masterstream"
        ? join([value("Dual lines: YES"),prefix("Per line: ",fmt(r.flowPerLineGpm,"flow",fallback))],"\n") : value("Dual lines: NO");
      if (standpipe) return fmt(lineQuantity(r.drivingLine?.lineNumber,"reactionLbf"),"force",fallback);
      if (split) {
        const values = [1,...(secondAttack?[2]:[])].map(k=>lineQuantity(k,"reactionLbf"));
        return values.every(numeric) ? join(values.map(v=>fmt(v,"force"))," / ") : old(fallback);
      }
      return fmt(r.reactionLbf,"force",fallback);
    };
    const setupSummary = fallback => {
      if (mode === "apparatusMounted") return effectiveNozzle(fallback);
      if (mode === "relay") return prefix("Relay Distance: ",field(i.hoseLength,"length",fallback));
      if (standpipe) return r.drivingLine?.lineNumber ? value(`Attack Line ${r.drivingLine.lineNumber} drives PDP`) : old(fallback);
      if (split) return prefix(n.dualSupply ? "Dual Supply: " : "Supply: ",supply(false));
      if (Object.prototype.hasOwnProperty.call(result,"hoseLength")) return old(fallback);
      return join([lengthHose(i.hoseLength,i.hoseSize),i.useCustomCoefficient ? value(`Custom C ${i.customCoefficient}`) : null,i.henTurboEnabled ? value("HEN Turbo") : null]);
    };
    const inputValue = (label,fallback) => {
      switch(label) {
        case "Mode": case "Attack Lines": return value(fallback);
        case "Hose Length": return Object.prototype.hasOwnProperty.call(result,"hoseLength") ? old(fallback) : field(i.hoseLength,"length",fallback);
        case "Hose Size": return hose(i.hoseSize);
        case "Nozzle Type": return nozzle(i);
        case "Nozzle Pressure": return i.nozzleType === "fixedFog" ? fmt(np,"pressure",fallback) : configuredNP();
        case "Target Flow": return field(i.targetGpm,"flow",fallback);
        case "Receiving Residual": return field(i.relayResidualPressure,"pressure",fallback);
        case "Pump Discharge Pressure": return field(i.pdp,"pressure",fallback);
        case "Appliance / Elevation Loss": return field(i.applianceLoss,"pressure",fallback);
        case "Supply 1": case "FDC": return prefix(n.dualSupply ? "2 × " : "",supply(false));
        case "Attack 1": return lineConfig(1);
        case "Attack 2": return lineConfig(2);
        case "Standpipe Loss": return field(n.standpipeLoss,"pressure",fallback);
        default:return old(fallback);
      }
    };
    const referenceValue = (label,fallback) => {
      switch(label) {
        case "Line": case "Relay Lay": return inputValue("Hose Length",fallback).legacy ? old(fallback) : lengthHose(i.hoseLength,i.hoseSize);
        case "Nozzle": return nozzle(i);
        case "Stream": return numeric(np) ? nozzle({...i,nozzleType:i.masterStreamType}) : old(fallback);
        case "Flow": case "Total Flow": return fmt(flow,"flow",fallback);
        case "Target Flow": return field(i.targetGpm,"flow",fallback);
        case "Device Loss": return fmt(r.deviceLossPsi ?? input(i.masterStreamLoss),"pressure",fallback);
        case "Elevation": return field(i.apparatusElevation,"length",fallback);
        case "Nozzle Pressure": return mode === "relay" ? old(fallback) : fmt(np,"pressure",fallback);
        case "Nozzle Reaction": return reaction(fallback);
        case "Loss / Elevation": return field(i.applianceLoss,"pressure",fallback);
        case "Supply":
          if (multi) return prefix(n.dualSupply ? "2 × " : "",supply(false));
          if (i.nozzleType === "masterstream") return i.reverseSupplyEnabled ? old(fallback) : lengthHose(i.hoseLength,i.hoseSize);
          return lengthHose(i.reverseSupplyLength,i.reverseSupplyHoseSize);
        case "Second Supply": return supply(true);
        case "Appliance": return value(fallback);
        case "Attack 1": case "Attack 2": case "FDC": case "Standpipe Loss": return inputValue(label,fallback);
        case "Attack 1 Flow": return fmt(lineQuantity(1,"flow"),"flow",fallback);
        case "Attack 2 Flow": return fmt(lineQuantity(2,"flow"),"flow",fallback);
        case "Attack 1 NP": return fmt(lineQuantity(1,"np"),"pressure",fallback);
        case "Attack 2 NP": return fmt(lineQuantity(2,"np"),"pressure",fallback);
        case "Required PDP": return fmt(pdp,"pressure",fallback);
        case "Driving Line": return r.drivingLine?.lineNumber ? value(`Attack Line ${r.drivingLine.lineNumber}`) : old(fallback);
        case "Supply Loss": if (standpipe && n.dualSupply && ![r.supplyTotalFl,r.supplyFlowPerLine].every(numeric)) return old(fallback);
          return standpipe && n.dualSupply ? join([prefix("Per line: ",fmt(r.supplyTotalFl,"pressure",fallback)),fmt(r.supplyFlowPerLine,"flow",fallback)]," @ ") : fmt(r.supplyTotalFl,"pressure",fallback);
        default:return old(fallback);
      }
    };
    const breakdownValue = (label,fallback) => {
      if (label === (result.primaryResultLabel || "Primary Result")) return fmt(mode === "reverse" ? flow : pdp,mode === "reverse" ? "flow" : "pressure",fallback);
      if (label === "Calculated PDP") return fmt(pdp,"pressure",fallback);
      if (label === "Calculated Flow") return split ? value(fallback) : fmt(flow,"flow",fallback);
      if (label === "Total FL") {
        if (mode === "apparatusMounted") return fmt(np,"pressure",fallback);
        if (standpipe) return numeric(r.supplyTotalFl) ? prefix("Supply: ",fmt(r.supplyTotalFl)) : old(fallback);
        if (split) {
          const parts=[r.supply1TotalFl,r.supply2TotalFl,lineQuantity(1,"fl"),...(secondAttack?[lineQuantity(2,"fl")]:[])];
          return parts.every(numeric) ? fmt(parts.reduce((a,b)=>a+b,0)) : old(fallback);
        }
        return fmt(r.frictionLossPsi,"pressure",fallback);
      }
      if (label === "FL / 100 ft") {
        if (mode === "apparatusMounted") return fmt(r.elevationLossPsi,"pressure",fallback);
        if (standpipe) return numeric(r.supplyFlowPerLine) ? prefix(n.dualSupply ? "Per supply line: " : "Supply: ",fmt(r.supplyFlowPerLine,"flow")) : old(fallback);
        if (split && ![r.supply1TotalFl,lineQuantity(1,"fl"),...(String(n.sectionCount)==="3"?[r.supply2TotalFl]:[]),...(secondAttack?[lineQuantity(2,"fl")]:[])].every(numeric)) return old(fallback);
        if (split) return join([prefix("S1 ",fmt(r.supply1TotalFl,"pressure",fallback)),String(n.sectionCount)==="3"?prefix("S2 ",fmt(r.supply2TotalFl,"pressure",fallback)):null,prefix("L1 ",fmt(lineQuantity(1,"fl"),"pressure",fallback)),secondAttack?prefix("L2 ",fmt(lineQuantity(2,"fl"),"pressure",fallback)):null]);
        if (mode === "reverse" && i.reverseSupplyEnabled && ![r.attackFrictionLossPsi,r.supplyFrictionLossPsi].every(numeric)) return old(fallback);
        if (mode === "reverse" && i.reverseSupplyEnabled) return join([prefix("A ",fmt(r.attackFrictionLossPsi,"pressure",fallback)),prefix("S ",fmt(r.supplyFrictionLossPsi,"pressure",fallback))]);
        return fmt(r.frictionLossPer100FeetPsi,"pressure",fallback); // Exactly 100 ft, never a 30-m recalculation.
      }
      if (label === "Nozzle" && (standpipe ? !numeric(r.standpipeLoss) : multi && ![1,...(secondAttack?[2]:[])].every(k=>numeric(lineQuantity(k,"np"))))) return old(fallback);
      if (label === "Nozzle") return standpipe ? prefix("Standpipe Loss ",fmt(r.standpipeLoss,"pressure",fallback)) : multi ? join([1,...(secondAttack?[2]:[])].map(k=>join([prefix(`L${k}: `,nozzle(n,`attack${k}`)),prefix("NP ",fmt(lineQuantity(k,"np"),"pressure",fallback))])),"\n") : effectiveNozzle(fallback);
      if (label === "Nozzle Reaction") return reaction(fallback);
      if (label === "Setup") return setupSummary(fallback);
      if (label === "Turbo Loss") return numeric(r.turboLossPsi) && numeric(r.flowGpm) ? join([fmt(r.turboLossPsi),fmt(r.flowGpm,"flow")]," @ ") : old(fallback);
      if (label === "Supply Layout") return value(fallback);
      if (label === "Supply Flow") return fmt(r.totalAttackFlow,"flow",fallback);
      if (label === "Supply Loss") return fmt(r.supply1TotalFl,"pressure",fallback);
      if (/^Attack [12] (Flow|NP|FL)$/.test(label)) return fmt(lineQuantity(label[7],label.endsWith("Flow")?"flow":label.endsWith("NP")?"np":"fl"),label.endsWith("Flow")?"flow":"pressure",fallback);
      if (label === "Standpipe Total Flow") return fmt(r.totalFlow,"flow",fallback);
      if (label === "Standpipe Supply Loss") return referenceValue("Supply Loss",fallback);
      if (label === "Standpipe Loss") return fmt(r.standpipeLoss,"pressure",fallback);
      if (label === "Standpipe Driving Line") return referenceValue("Driving Line",fallback);
      if (/^Standpipe Attack [12] (Flow|NP|FL)$/.test(label)) return fmt(lineQuantity(label.match(/Attack ([12])/)[1],label.endsWith("Flow")?"flow":label.endsWith("NP")?"np":"fl"),label.endsWith("Flow")?"flow":"pressure",fallback);
      return old(fallback);
    };
    const breakdownLabel = label => label !== "FL / 100 ft" ? label : mode === "apparatusMounted" ? "Elevation Loss" : standpipe ? "Supply Flow" : split || mode === "reverse" && i.reverseSupplyEnabled ? "FL Breakdown" : "FL / 30.48 m";
    return {
      configuration, hydraulic,
      referenceSections:legacy.referenceSections.map(section=>({...section,rows:section.rows.map(row=>({label:row.label,value:known?referenceValue(row.label,row.value):old(row.value)}))})),
      inputRows:legacy.inputRows.map(([label,text])=>[label,known?inputValue(label,text):old(text)]),
      breakdownRows:legacy.breakdownRows.map(([label,text])=>[known?breakdownLabel(label):label,known?breakdownValue(label,text):old(text)])
    };
  }
  return Object.freeze({present});
});
