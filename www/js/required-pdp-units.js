(function (root, factory) {
  const units = typeof module === "object" && module.exports ? require("./units") : root.ReverseFlowUnits;
  const api = factory(units);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.ReverseFlowOperationalUnits = api;
    // Preserve the approved Phase 2A API for callers/tests.
    root.ReverseFlowRequiredPdpUnits = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (U) {
  "use strict";
  const fields = Object.freeze({
    pdp: { key: "targetGpm", quantity: "flow" },
    hoseLength: { key: "hoseLength", quantity: "length" },
    customNozzlePressure: { key: "customNozzlePressure", quantity: "pressure" },
    ratedFlow: { key: "ratedFlow", quantity: "flow" },
    ratedPressure: { key: "ratedPressure", quantity: "pressure" },
    applianceLoss: { key: "applianceLoss", quantity: "pressure", signed: true },
    masterStreamLoss: { key: "masterStreamLoss", quantity: "pressure" }
  });
  function fieldsForMode(mode) {
    if (mode === "requiredPdp") return fields;
    if (mode === "reverse") return {
      ...fields, pdp: { key: "pdp", quantity: "pressure" },
      reverseSupplyLength: { key: "reverseSupplyLength", quantity: "length" }
    };
    if (mode === "relay") return Object.fromEntries(
      ["pdp", "hoseLength", "applianceLoss"].map(id => [id, fields[id]]));
    if (mode === "apparatusMounted") return {
      customNozzlePressure: fields.customNozzlePressure,
      ratedFlow: fields.ratedFlow, ratedPressure: fields.ratedPressure,
      masterStreamLoss: fields.masterStreamLoss,
      apparatusCustomFogFlow: { key: "apparatusCustomFogFlow", quantity: "flow" },
      apparatusElevation: { key: "apparatusElevation", quantity: "length" }
    };
    if (["splitLay", "standpipeOps", "wyeOps"].includes(mode)) {
      const prefix = { splitLay: "split", standpipeOps: "standpipe", wyeOps: "wye" }[mode];
      const specs = {};
      const add = (suffix, key, quantity, selection = false) => {
        specs[prefix + suffix] = { key, quantity, section: mode, selection };
      };
      add("SupplyLength", "supplyLength", "length");
      if (mode === "splitLay") {
        add("Supply2Length", "supply2Length", "length");
        specs.applianceLoss = fields.applianceLoss;
      }
      if (mode === "standpipeOps") add("Loss", "standpipeLoss", "pressure");
      for (const line of [1, 2]) {
        const suffix = `Attack${line}`, key = `attack${line}`;
        for (const [name, quantity] of [["Length", "length"], ["Flow", "flow"], ["RatedFlow", "flow"], ["RatedPressure", "pressure"]]) add(suffix + name, key + name, quantity);
        add(suffix + (mode === "wyeOps" ? "Pressure" : "NozzlePressure"), key + "NozzlePressure", "pressure", true);
        if (mode === "wyeOps") {
          add(suffix + "CustomPressure", key + "CustomPressure", "pressure");
          add(suffix + "CustomTip", key + "CustomTip", "diameter");
        }
      }
      return specs;
    }
    return {};
  }
  function digits(quantity, preference) {
    if (quantity === "diameter") return 12;
    if (quantity === "velocity") return 1;
    if (quantity === "pressure") return preference.metricPressureUnit === "kpa" ? 0 : 1;
    if (quantity === "force") return preference.metricReactionUnit === "kgf" ? 1 : 0;
    return 0;
  }
  function number(value, quantity, preference) {
    if (value === "" || value === null || value === undefined || !Number.isFinite(Number(value))) return "";
    const converted = U.fromCanonical(Number(value), quantity, preference);
    if (quantity === "diameter") return String(Number(converted.toFixed(12)));
    const text = converted.toFixed(digits(quantity, preference));
    return Number(text) === 0 ? Math.abs(Number(text)).toFixed(digits(quantity, preference)) : text;
  }
  function format(value, quantity, preference) {
    return `${number(value, quantity, preference) || "—"} ${U.displayUnit(quantity, preference)}`;
  }
  function parseEdit(text, field, preference, mode = "requiredPdp") {
    const spec = fieldsForMode(mode)[field];
    if (!spec) throw new RangeError("Unknown operational field.");
    return parseQuantityEdit(text, spec, preference);
  }
  function parseQuantityEdit(text, spec, preference) {
    const raw = String(text).trim();
    if (!raw) return { valid: true, canonical: "", text: raw };
    const sign = spec.signed ? "-?" : "";
    const pattern = (spec.quantity === "diameter" || spec.decimal) ? /^(?:\d+(?:\.\d*)?|\.\d+)$/ : new RegExp(`^${sign}(?:\\d+${digits(spec.quantity, preference) ? "(?:\\.\\d?)?" : ""}|${digits(spec.quantity, preference) ? "\\.\\d" : "(?!)"})$`);
    if (!pattern.test(raw) || !Number.isFinite(Number(raw))) return { valid: false, text: raw };
    return { valid: true, text: raw, canonical: String(U.toCanonical(Number(raw), spec.quantity, preference)) };
  }
  function incrementFeet(feet, preference, usIncrement = 50) {
    if (preference.unitSystem !== "metric") return Number(feet || 0) + usIncrement;
    const metres = { 25: 10, 50: 15, 100: 30 }[usIncrement];
    if (!metres) throw new RangeError("Unsupported length increment.");
    return Number(feet || 0) + U.metresToFeet(metres);
  }
  function legacySnapshot(result, labels) {
    // Compatible U.S. strings are produced from canonical numbers, never from DOM.
    const flow = `${Math.round(result.flowGpm)} GPM`;
    const pdp = String(result.roundedPdpPsi);
    return {
      primaryResult: `${pdp} PSI`, primaryResultLabel: "Required PDP",
      flowSummary: flow, pdpSummary: `${pdp} PSI`, calculatedPdp: pdp, calculatedFlow: flow,
      totalFl: `${result.frictionLossPsi.toFixed(1)} psi`,
      flPer100: `${result.frictionLossPer100FeetPsi.toFixed(1)} psi`,
      nozzleDisplay: labels.nozzle, setupDisplay: labels.setup, nozzleReaction: labels.reaction,
      turboLossDisplay: result.turboEnabled ? `${result.turboLossPsi.toFixed(1)} psi @ ${Math.round(result.flowGpm)} GPM` : "—",
      canonicalRequiredPdp: { version: 1, ...result }
    };
  }
  function metricNozzle(state, result, tip, blade, preference) {
    const np = result?.nozzlePressurePsi ?? (state.nozzlePressure === "custom" ? state.customNozzlePressure : state.nozzlePressure);
    const type = state.nozzleType === "masterstream" ? state.masterStreamType : state.nozzleType;
    if (type === "smoothbore") return `${tip ? U.physicalDiameterLabel(tip.diameter, preference) : "—"} SB @ ${format(np, "pressure", preference)}`;
    if (type === "blade") return `${blade.label} @ ${format(np, "pressure", preference)}`;
    if (type === "fixedFog") return `Fixed Fog • ${format(state.ratedFlow, "flow", preference)} @ ${format(state.ratedPressure, "pressure", preference)}${result ? ` • NP ${format(np, "pressure", preference)}` : ""}`;
    return `Automatic Fog • ${format(np, "pressure", preference)}`;
  }
  function metricSetup(state, hose, preference) {
    return `${format(state.hoseLength, "length", preference)} of ${U.factoryHoseLabel(hose, preference)}${state.useCustomCoefficient && state.customCoefficient ? ` • Custom C ${state.customCoefficient}` : ""}${state.henTurboEnabled ? " • HEN Turbo" : ""}`;
  }
  function metricWarning(text, hose, preference) {
    // Only operational messages from converted modes; stored warnings remain U.S.
    return text.replaceAll(hose.chartName, U.factoryHoseLabel(hose, preference))
      .replace(/(\d+(?:\.\d+)?)–(\d+(?:\.\d+)?) GPM/g, (_, a, b) => `${number(a, "flow", preference)}–${format(b, "flow", preference)}`)
      .replace(/(\d+(?:\.\d+)?) GPM/g, (_, value) => format(value, "flow", preference))
      .replace(/(\d+(?:\.\d+)?) psi\b/gi, (_, value) => format(value, "pressure", preference))
      .replace(/(\d+(?:\.\d+)?) feet\b/g, (_, value) => format(value, "length", preference));
  }
  return Object.freeze({ fields, fieldsForMode, digits, number, format, parseEdit, parseQuantityEdit, incrementFeet, legacySnapshot, metricNozzle, metricSetup, metricWarning });
});
