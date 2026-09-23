(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowUnits = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STORAGE_KEY = "reverse-flow-unit-preferences-v1";
  const DEFAULTS = Object.freeze({
    version: 1, unitSystem: "us", metricPressureUnit: "bar", metricReactionUnit: "n"
  });

  function normalizePreferences(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        (value.version !== undefined && value.version !== 1) ||
        !["us", "metric"].includes(value.unitSystem)) return { ...DEFAULTS };
    return {
      version: 1,
      unitSystem: value.unitSystem,
      metricPressureUnit: value.metricPressureUnit === "kpa" ? "kpa" : "bar",
      metricReactionUnit: value.metricReactionUnit === "kgf" ? "kgf" : "n"
    };
  }

  // Reads never repair/write storage. Saves touch only this additive preference key.
  function createPreferenceStore(storage) {
    return {
      get() {
        try {
          const value = JSON.parse(storage.getItem(STORAGE_KEY));
          return value?.version === 1 ? normalizePreferences(value) : { ...DEFAULTS };
        } catch { return { ...DEFAULTS }; }
      },
      save(value) {
        const preference = normalizePreferences(value);
        storage.setItem(STORAGE_KEY, JSON.stringify(preference));
        return preference;
      }
    };
  }

  // U.S. gallon, international foot/inch, and standard gravity (9.80665 m/s²).
  // Factors convert FROM canonical units. No rounding occurs in conversion.
  const FACTORS = Object.freeze({
    psiToBar: 0.06894757293168361,
    psiToKpa: 6.894757293168361,
    gpmToLitresPerMinute: 3.785411784,
    feetToMetres: 0.3048,
    inchesToMillimetres: 25.4,
    gallonsToLitres: 3.785411784,
    lbfToNewtons: 4.4482216152605,
    lbfToKgf: 0.45359237,
    feetPerSecondToMetresPerSecond: 0.3048
  });
  function finiteNumber(value) {
    // Intentionally reject IDs, labels, empty strings, and formatted display text.
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError("Conversion requires a finite numeric physical value.");
    }
    return value;
  }
  const conversions = {};
  for (const [forward, reverse] of [
    ["psiToBar", "barToPsi"], ["psiToKpa", "kpaToPsi"],
    ["gpmToLitresPerMinute", "litresPerMinuteToGpm"],
    ["feetToMetres", "metresToFeet"], ["inchesToMillimetres", "millimetresToInches"],
    ["gallonsToLitres", "litresToGallons"], ["lbfToNewtons", "newtonsToLbf"],
    ["lbfToKgf", "kgfToLbf"], ["feetPerSecondToMetresPerSecond", "metresPerSecondToFeetPerSecond"]
  ]) {
    conversions[forward] = value => finiteNumber(value) * FACTORS[forward];
    conversions[reverse] = value => finiteNumber(value) / FACTORS[forward];
  }

  function displayUnit(quantity, preference) {
    const p = normalizePreferences(preference);
    const units = p.unitSystem === "us"
      ? { pressure: "PSI", flow: "GPM", length: "ft", diameter: "in", volume: "U.S. gal", force: "lbf", velocity: "ft/sec" }
      : { pressure: p.metricPressureUnit === "kpa" ? "kPa" : "bar", flow: "L/min", length: "m", diameter: "mm", volume: "L", force: p.metricReactionUnit === "kgf" ? "kgf" : "N", velocity: "m/s" };
    if (!Object.prototype.hasOwnProperty.call(units, quantity)) throw new RangeError("Unknown physical quantity.");
    return units[quantity];
  }
  function factor(quantity, preference) {
    const p = normalizePreferences(preference);
    displayUnit(quantity, p);
    if (p.unitSystem === "us") return 1;
    return {
      pressure: p.metricPressureUnit === "kpa" ? FACTORS.psiToKpa : FACTORS.psiToBar,
      flow: FACTORS.gpmToLitresPerMinute, length: FACTORS.feetToMetres,
      diameter: FACTORS.inchesToMillimetres, volume: FACTORS.gallonsToLitres,
      force: p.metricReactionUnit === "kgf" ? FACTORS.lbfToKgf : FACTORS.lbfToNewtons,
      velocity: FACTORS.feetPerSecondToMetresPerSecond
    }[quantity];
  }
  function fromCanonical(value, quantity, preference) {
    return finiteNumber(value) * factor(quantity, preference);
  }
  // For actual user edits only. Preference changes must render from canonical data;
  // never parse formatMetric() output back into the canonical state.
  function toCanonical(value, quantity, preference) {
    return finiteNumber(value) / factor(quantity, preference);
  }
  function formatNumber(value, digits) {
    finiteNumber(value);
    if (!Number.isInteger(digits) || digits < 0 || digits > 12) throw new RangeError("Specify 0–12 display decimal places.");
    return new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: digits }).format(Object.is(value, -0) ? 0 : value);
  }
  // Consumers must choose precision explicitly until their UI is converted/reviewed.
  // There is deliberately no replacement for existing U.S. operational formatting.
  function formatMetric(value, quantity, preference, { digits } = {}) {
    const p = normalizePreferences(preference);
    if (p.unitSystem !== "metric") throw new RangeError("Use the existing U.S. formatter for U.S. presentation.");
    return `${formatNumber(fromCanonical(value, quantity, p), digits)} ${displayUnit(quantity, p)}`;
  }

  const FACTORY_HOSE_LABELS = Object.freeze({
    "1": "25 mm", "1.5": "38 mm", "1.75": "45 mm", "1.88": "48 mm",
    "2": "51 mm", "2.25": "57 mm", "2.5": "64 mm", "3": "76 mm",
    dual3: "Dual 76 mm", "4": "102 mm", "5": "127 mm"
  });
  // A label-only API: never exposes a nominal diameter as a hydraulic number.
  function factoryHoseLabel(hose, preference) {
    if (!hose || !Object.prototype.hasOwnProperty.call(FACTORY_HOSE_LABELS, hose.id)) {
      throw new RangeError("Unknown factory hose category; use physicalDiameterLabel for a measured diameter.");
    }
    if (normalizePreferences(preference).unitSystem === "us") return hose.label;
    return FACTORY_HOSE_LABELS[hose.id];
  }
  // Separate from nominal categories, even when the measurement equals a factory ID.
  function physicalDiameterLabel(inches, preference, { digits } = {}) {
    const value = fromCanonical(inches, "diameter", preference);
    // Suppress binary floating-point tails in labels; the conversion stays unrounded.
    const text = formatNumber(value, digits === undefined ? 12 : digits);
    return `${text} ${displayUnit("diameter", preference)}`;
  }

  return Object.freeze({ STORAGE_KEY, DEFAULTS, FACTORS, normalizePreferences, createPreferenceStore,
    ...conversions, displayUnit, fromCanonical, toCanonical, formatMetric, formatNumber,
    factoryHoseLabel, physicalDiameterLabel });
});
