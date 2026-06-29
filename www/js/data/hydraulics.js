    // ========================================
    // HYDRAULIC DATA
    // ========================================
    const HOSE_OPTIONS = [
      { id: "1", label: '1"', coefficient: 100, maxReferenceFlow: 80, chartName: '1"' },
      { id: "1.5", label: '1.5"', coefficient: 24, maxReferenceFlow: 180, chartName: '1.5"' },
      { id: "1.75", label: '1.75"', coefficient: 15.5, maxReferenceFlow: 250, chartName: '1 3/4" / 1.75"' },
      { id: "1.88", label: '1.88"', coefficient: 8, maxReferenceFlow: 250, chartName: '1.88" FDNY' },
      { id: "2", label: '2"', coefficient: 6, maxReferenceFlow: 350, chartName: '2"' },
      { id: "2.25", label: '2.25"', coefficient: 3.5, maxReferenceFlow: 450, chartName: '2.25"' },
      { id: "2.5", label: '2.5"', coefficient: 2, maxReferenceFlow: 550, chartName: '2 1/2"' },
      { id: "3", label: '3"', coefficient: 0.8, maxReferenceFlow: 900, chartName: '3"' },
      { id: "4", label: '4"', coefficient: 0.2, maxReferenceFlow: 1200, chartName: '4"' },
      { id: "5", label: '5"', coefficient: 0.08, maxReferenceFlow: 2000, chartName: '5"' },
    ];

    const RELAY_HOSE_OPTIONS = [
      { id: "3", label: '3"', coefficient: 0.8, maxReferenceFlow: 900, chartName: '3"' },
      { id: "dual3", label: 'Dual 3"', coefficient: 0.2, maxReferenceFlow: 1500, chartName: 'Dual 3"' },
      { id: "4", label: '4"', coefficient: 0.2, maxReferenceFlow: 1200, chartName: '4"' },
      { id: "5", label: '5"', coefficient: 0.08, maxReferenceFlow: 2000, chartName: '5"' },
    ];

    const FACTORY_HOSE_COEFFS = {
  "1": 100,
  "1.5": 24,
  "1.75": 15.5,
  "1.88": 8,
  "2": 6,
  "2.25": 3.5,
  "2.5": 2,
  "3": 0.8,
  "dual3": 0.2,
  "4": 0.2,
  "5": 0.08,
};

const HEN_TURBO_OUT_OF_RANGE_WARNING =
  "Calculation unavailable. Calculated flow is outside of the published range for a turbo device. Change inputs or remove the turbo to continue.";

const HEN_TURBO_BELOW_RANGE_WARNING =
  "Calculation unavailable. Calculated flow is below the published range for a turbo device. Increase flow or remove the turbo to continue.";

const HEN_TURBO_ABOVE_RANGE_WARNING =
  "Calculation unavailable. Calculated flow is above the published range for a turbo device. Reduce flow or remove the turbo to continue.";

const HEN_TURBO_CURVES = {
  turbo15: {
    label: "HEN Turbo 1.5",
    compatibleHoseIds: ["1.5", "1.75", "1.88"],
    points: [
      { gpm: 150, loss: 22 },
      { gpm: 160, loss: 25 },
      { gpm: 170, loss: 28 },
      { gpm: 180, loss: 31 },
      { gpm: 190, loss: 35 }
    ]
  }
};

function loadSavedHoseCoefficients() {
  try {
    const saved = localStorage.getItem(HOSE_COEFFS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveHoseCoefficient(hoseId, coefficient) {
  const savedCoefficients = loadSavedHoseCoefficients();

  savedCoefficients[hoseId] = coefficient;

  localStorage.setItem(
    HOSE_COEFFS_KEY,
    JSON.stringify(savedCoefficients)
  );
}

function clearSavedHoseCoefficient(hoseId) {
  const savedCoefficients = loadSavedHoseCoefficients();

  delete savedCoefficients[hoseId];

  localStorage.setItem(
    HOSE_COEFFS_KEY,
    JSON.stringify(savedCoefficients)
  );
}

function resetSavedHoseCoefficients() {
  localStorage.removeItem(HOSE_COEFFS_KEY);
}

function loadDefaultHoseProfiles() {
  try {
    const saved = localStorage.getItem(DEFAULT_HOSE_PROFILES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function getDefaultHoseProfile(hoseId) {
  const profiles = loadDefaultHoseProfiles();

  return profiles[hoseId] || null;
}

function saveDefaultHoseProfile(hoseId, libraryHose) {
  const profiles = loadDefaultHoseProfiles();

  profiles[hoseId] = {
    id: libraryHose.id,
    profileName: libraryHose.profileName || libraryHose.name || "",
    manufacturer: libraryHose.manufacturer,
    model: libraryHose.model,
    sourceModel: libraryHose.sourceModel || libraryHose.model || "",
    size: libraryHose.appHoseId,
    publishedCoefficient: libraryHose.coefficient,
    coefficient: libraryHose.coefficient,
    use: libraryHose.use || "",
    custom: !!libraryHose.custom,
    sourceType: libraryHose.sourceType || ""
  };

  localStorage.setItem(
    DEFAULT_HOSE_PROFILES_KEY,
    JSON.stringify(profiles)
  );
}

function clearDefaultHoseProfile(hoseId) {
  const profiles = loadDefaultHoseProfiles();

  delete profiles[hoseId];

  localStorage.setItem(
    DEFAULT_HOSE_PROFILES_KEY,
    JSON.stringify(profiles)
  );
}

function getActiveHoseCoefficient(hoseId) {
  const savedCoefficients = loadSavedHoseCoefficients();

  return savedCoefficients[hoseId] ?? FACTORY_HOSE_COEFFS[hoseId];
}

function isModifiedHoseCoefficient(hoseId) {
  return getActiveHoseCoefficient(hoseId) !== FACTORY_HOSE_COEFFS[hoseId];
}

    function getNozzlePressures() {

  if (
    state.nozzleType === "masterstream" ||
    (
      typeof isApparatusMountedMode === "function" &&
      isApparatusMountedMode()
    )
  ) {
    return {
      automaticFog: [50, 60, 70, 80, 90, 100, "custom"],
      fixedFog: [50, 60, 70, 80, 90, 100, "custom"],
      smoothbore: [50, 60, 70, 80, 90, 100, "custom"],
      masterstream: [50, 60, 70, 80, 90, 100, "custom"]
    };
  }

  return {
    automaticFog: [50, 55, 75, 100, "custom"],
    fixedFog: [50, 55, 75, 100, "custom"],

    smoothbore: isReverseMode()
      ? [40, 50, 60,]
      : [40, 50, 60, "custom"],
    blade: getBladeNozzlePressures(),
  };

}

    const BLADE_MODELS = [
      { id: "blade20", label: "Blade 20", diameter: 0.2595, pressures: [50, 75, 100, 125, 150], defaultPressure: "100" },
      { id: "blade45", label: "Blade 45", diameter: 0.3893, pressures: [50, 75, 100, 125, 150], defaultPressure: "100" },
      { id: "blade95", label: "Blade 95", diameter: 0.6726, pressures: [30, 40, 50, 60, 70], defaultPressure: "50" },
      { id: "blade160", label: "Blade 160", diameter: 0.875, pressures: [40, 50, 60, "custom"], defaultPressure: "50" },
      { id: "blade185", label: "Blade 185", diameter: 0.9375, pressures: [40, 50, 60, "custom"], defaultPressure: "50" },
      { id: "blade265", label: "Blade 265", diameter: 1.125, pressures: [40, 50, 60, "custom"], defaultPressure: "50" },
    ];

    function getBladeNozzlePressures(modelId = state.bladeModel) {
      if (isReverseMode()) return [40, 50, 60,];

      const model =
        BLADE_MODELS.find(item => item.id === modelId) ||
        BLADE_MODELS[3];

      return model.pressures;
    }

    function getBladeDefaultNozzlePressure(modelId = state.bladeModel) {
      const model =
        BLADE_MODELS.find(item => item.id === modelId) ||
        BLADE_MODELS[3];

      return model.defaultPressure;
    }

    const SMOOTHBORE_TIPS = [
      { id: '3/4', label: '3/4"', diameter: 0.75 },
      { id: '7/8', label: '7/8"', diameter: 0.875 },
      { id: '15/16', label: '15/16"', diameter: 0.9375 },
      { id: '1', label: '1"', diameter: 1 },
      { id: '1-1/16', label: '1 1/16"', diameter: 1.0625 },
      { id: '1-1/8', label: '1 1/8"', diameter: 1.125 },
      { id: '1-3/16', label: '1 3/16"', diameter: 1.1875 },
      { id: '1-1/4', label: '1 1/4"', diameter: 1.25 },
      { id: '1-3/8', label: '1 3/8"', diameter: 1.375 },
      { id: '1-1/2', label: '1 1/2"', diameter: 1.5 },
      { id: '1-3/4', label: '1 3/4"', diameter: 1.75 },
      { id: '2', label: '2"', diameter: 2 },
      { id: '2-1/4', label: '2 1/4"', diameter: 2.25 },
      { id: '2-1/2', label: '2 1/2"', diameter: 2.5 },
      { id: '2-3/4', label: '2 3/4"', diameter: 2.75 },
      { id: '3', label: '3"', diameter: 3 },
          ];
