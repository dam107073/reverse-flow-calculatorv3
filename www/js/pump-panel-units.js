(function (root, factory) {
  const U = typeof module === "object" && module.exports ? require("./units") : root.ReverseFlowUnits;
  const api = factory(U);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowPumpPanelUnits = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (U) {
  "use strict";
  const finite = value => typeof value === "number" && Number.isFinite(value);
  // Structured input fields may be numeric strings. Never accept formatted text.
  const inputNumber = value => (typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number.isFinite(Number(value)) ? Number(value) : null;
  const hoseValid = h => h && finite(h.lengthFeet) && h.lengthFeet >= 0 && (() => {
    try { U.factoryHoseLabel({id:h.hoseId}, {unitSystem:"metric"}); return true; } catch { return false; }
  })();
  const roundLoss = value => finite(value) ? Number(value.toFixed(1)) : null;

  // Additive snapshot data only. This adapter neither calculates hydraulics nor
  // follows sourceSetupId. Missing/unsupported semantics leave compatibility text.
  function capture(setup, snapshot, structure, row, tips = []) {
    const mode = setup.mode, result = setup.result || {}, inputs = setup.inputs || {};
    const r = mode === "requiredPdp" ? result.canonicalRequiredPdp
      : ["reverse", "apparatusMounted", "relay"].includes(mode) ? result.canonicalOperational
      : ["splitLay", "standpipeOps"].includes(mode) ? result.canonicalMultiLine : null;
    if (!r || r.version !== 1 || (mode !== "requiredPdp" && r.mode !== mode)) return null;
    const packet = {version:1};
    let losses, np = r.nozzlePressurePsi;
    if (mode === "requiredPdp" || mode === "relay") losses = [{role:"hose", psi:roundLoss(r.frictionLossPsi)}];
    if (mode === "reverse") losses = inputs.reverseSupplyEnabled
      ? [{role:"supply",psi:roundLoss(r.supplyFrictionLossPsi)}, {role:"attack",psi:roundLoss(r.attackFrictionLossPsi)}]
      : [{role:"hose",psi:roundLoss(r.frictionLossPsi)}];
    if (mode === "splitLay" || mode === "standpipeOps") {
      const split = mode === "splitLay", line = split ? r.actualAttack1 : r.line1;
      losses = [{role:"supply",psi:roundLoss(split ? r.supply1TotalFl : r.supplyTotalFl)},
        {role:"attack",psi:roundLoss(split ? line?.actualTotalFl : line?.totalFl)}];
      np = split ? line?.actualNozzlePressure : line?.nozzlePressure;
      if (finite(np)) np = Math.round(np); // Same frozen NP precision as existing card.
    }
    // Equality is a compatibility check, never extraction of physical quantities.
    // Apparatus PDP-minus-NP is deliberately NOT included as hose friction loss.
    if (losses?.every(l => finite(l.psi)) && structure?.confidence === "confident") {
      const text = losses.map(l => `${l.role === "supply" ? "S " : l.role === "attack" ? "A " : ""}${l.psi.toFixed(1)}`).join(" • ");
      if (text === snapshot.frictionLoss) packet.losses = losses;
    }
    if (structure?.confidence === "confident" && mode !== "apparatusMounted") {
      const hoses = [...structure.supplySections, ...structure.attackSections].map(h => ({hoseId:h.hoseSize, lengthFeet:inputNumber(h.hoseLength)}));
      // Relay's generic row may carry an unrelated NP input. Never replace it
      // with residual pressure or assert that it is a nozzle measurement.
      const noPressure = row.nozzlePressure === "";
      const pressureProven = mode !== "relay" && finite(np) && inputNumber(row.nozzlePressure) === np;
      if (hoses.length && hoses.every(hoseValid) && (noPressure || pressureProven)) {
        packet.summary = {kind:"hose", hoses, ...(pressureProven ? {pressure:{role:"nozzle",psi:np}} : {})};
      }
    }
    if (mode === "apparatusMounted" && finite(np) && snapshot.hoseSummary === result.setupDisplay) {
      const type = inputs.masterStreamType;
      if (type === "smoothbore") {
        const tip = tips.find(t => t.id === inputs.smoothboreTip);
        if (tip && finite(tip.diameter) && tip.diameter > 0) packet.summary = {kind:"nozzle",type,diameterInches:tip.diameter,pressure:{role:"nozzle",psi:np}};
      } else if (type === "automaticFog") {
        packet.summary = {kind:"nozzle",type,pressure:{role:"nozzle",psi:np}};
      } else if (type === "fixedFog") {
        const flow = inputNumber(inputs.ratedFlow), pressure = inputNumber(inputs.ratedPressure);
        if (flow > 0 && pressure > 0) packet.summary = {kind:"nozzle",type,ratedFlowGpm:flow,ratedPressurePsi:pressure,pressure:{role:"nozzle",psi:np}};
      }
    }
    return packet.losses || packet.summary ? packet : null;
  }

  function number(value, quantity, preference) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    if (preference.unitSystem !== "metric") return Number.isInteger(n) ? String(n) : n.toFixed(1);
    const digits = quantity === "pressure" ? preference.metricPressureUnit === "kpa" ? 0 : 1 : quantity === "length" ? 2 : 0;
    return U.formatNumber(U.fromCanonical(n, quantity, preference), digits);
  }
  const format = (value, quantity, preference) => `${number(value, quantity, preference)} ${U.displayUnit(quantity, preference)}`;
  function details(line, preference) {
    const output = {frictionLoss:line.frictionLoss, hoseSummary:line.hoseSummary, legacyLoss:false, legacySummary:false};
    if (preference.unitSystem !== "metric") return output;
    output.legacyLoss = output.legacySummary = true;
    const packet = line.displayCanonical;
    if (!packet || packet.version !== 1) return output;
    if (Array.isArray(packet.losses) && packet.losses.length && packet.losses.every(l => l && ["hose","supply","attack"].includes(l.role) && finite(l.psi))) {
      output.frictionLoss = packet.losses.map(l => `${l.role === "supply" ? "S " : l.role === "attack" ? "A " : ""}${format(l.psi,"pressure",preference)}`).join(" • ");
      output.legacyLoss = false;
    }
    const s = packet.summary;
    const pressureValid = s?.pressure?.role === "nozzle" && finite(s.pressure.psi);
    if (s?.kind === "hose" && Array.isArray(s.hoses) && s.hoses.length && s.hoses.every(hoseValid) && (!s.pressure || pressureValid)) {
      output.hoseSummary = s.hoses.map(h => `${format(h.lengthFeet,"length",preference)} • ${U.factoryHoseLabel({id:h.hoseId},preference)}`).join(" → ") + (s.pressure ? ` • NP ${format(s.pressure.psi,"pressure",preference)}` : "");
      output.legacySummary = false;
    } else if (s?.kind === "nozzle" && pressureValid) {
      let nozzle;
      if (s.type === "smoothbore" && finite(s.diameterInches) && s.diameterInches > 0) nozzle = `${U.physicalDiameterLabel(s.diameterInches,preference,{digits:4})} SB`;
      if (s.type === "automaticFog") nozzle = "Automatic Fog";
      if (s.type === "fixedFog" && finite(s.ratedFlowGpm) && finite(s.ratedPressurePsi)) {
        output.hoseSummary = `Fixed Fog • ${format(s.ratedFlowGpm,"flow",preference)} @ ${format(s.ratedPressurePsi,"pressure",preference)} • NP ${format(s.pressure.psi,"pressure",preference)}`;
        output.legacySummary = false;
      } else if (nozzle) { output.hoseSummary = `${nozzle} @ ${format(s.pressure.psi,"pressure",preference)}`; output.legacySummary = false; }
    }
    return output;
  }
  return Object.freeze({capture,number,format,details});
});
