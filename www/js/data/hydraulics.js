    // ========================================
    // HYDRAULIC DATA
    // ========================================
    const HOSE_OPTIONS = [
      { id: "1", label: '1"', coefficient: 100, maxReferenceFlow: 80, chartName: '1"' },
      { id: "1.5", label: '1.5"', coefficient: 24, maxReferenceFlow: 180, chartName: '1.5"' },
      { id: "1.75", label: '1.75"', coefficient: 15.5, maxReferenceFlow: 250, chartName: '1 3/4" / 1.75"' },
      { id: "1.88", label: '1.88"', coefficient: 8, maxReferenceFlow: 250, chartName: '1.88" FDNY' },
      { id: "2", label: '2"', coefficient: 4, maxReferenceFlow: 350, chartName: '2"' },
      { id: "2.25", label: '2.25"', coefficient: 3, maxReferenceFlow: 450, chartName: '2.25"' },
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
  "2": 4,
  "2.25": 3,
  "2.5": 2,
  "3": 0.8,
  "dual3": 0.2,
  "4": 0.2,
  "5": 0.08,
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

function resetSavedHoseCoefficients() {
  localStorage.removeItem(HOSE_COEFFS_KEY);
}

function getActiveHoseCoefficient(hoseId) {
  const savedCoefficients = loadSavedHoseCoefficients();

  return savedCoefficients[hoseId] ?? FACTORY_HOSE_COEFFS[hoseId];
}

function isModifiedHoseCoefficient(hoseId) {
  return getActiveHoseCoefficient(hoseId) !== FACTORY_HOSE_COEFFS[hoseId];
}

    function getNozzlePressures() {

  if (state.nozzleType === "masterstream") {
    return {
      fog: [50, 55, 75, 100, "custom"],
      smoothbore: [40, 50, 60, "custom"],
      masterstream: [50, 60, 70, 80, 90, 100, "custom"]
    };
  }

  return {
    fog: [50, 55, 75, 100, "custom"],

    smoothbore: isReverseMode()
      ? [40, 50, 60,]
      : [40, 50, 60, "custom"],
  };

}

    const SMOOTHBORE_TIPS = [
      { id: '3/4', label: '3/4"', diameter: 0.75 },
      { id: '7/8', label: '7/8"', diameter: 0.875 },
      { id: '15/16', label: '15/16"', diameter: 0.9375 },
      { id: '1', label: '1"', diameter: 1 },
      { id: '1-1/8', label: '1 1/8"', diameter: 1.125 },
      { id: '1-3/16', label: '1 3/16"', diameter: 1.1875 },
      { id: '1-1/4', label: '1 1/4"', diameter: 1.25 },
      { id: '1-3/8', label: '1 3/8"', diameter: 1.375 },
      { id: '1-1/2', label: '1 1/2"', diameter: 1.5 },
      { id: '1-3/4', label: '1 3/4"', diameter: 1.75 },
      { id: '2', label: '2"', diameter: 2 },
    ];
