(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowHydraulics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${label} must be a finite number.`);
    return number;
  }

  function nonNegative(value, label) {
    const number = finite(value, label);
    if (number < 0) throw new RangeError(`${label} must be 0 or greater.`);
    return number;
  }

  function positive(value, label) {
    const number = finite(value, label);
    if (number <= 0) throw new RangeError(`${label} must be greater than 0.`);
    return number;
  }

  function frictionLoss(coefficient, flowGPM, lengthFeet) {
    const c = positive(coefficient, "Coefficient");
    const flow = nonNegative(flowGPM, "Flow");
    const length = nonNegative(lengthFeet, "Length");
    return c * Math.pow(flow / 100, 2) * (length / 100);
  }

  function requiredPDP({ nozzlePressure, frictionLossPSI = 0, applianceLoss = 0, elevationPressure = 0 }) {
    return nonNegative(nozzlePressure, "Nozzle pressure") + nonNegative(frictionLossPSI, "Friction loss") + nonNegative(applianceLoss, "Appliance loss") + finite(elevationPressure, "Elevation pressure");
  }

  function smoothboreFlow(diameterInches, nozzlePressure) {
    return 29.7 * Math.pow(positive(diameterInches, "Tip diameter"), 2) * Math.sqrt(nonNegative(nozzlePressure, "Nozzle pressure"));
  }

  function smoothboreReaction(diameterInches, nozzlePressure) {
    return 1.57 * Math.pow(positive(diameterInches, "Tip diameter"), 2) * nonNegative(nozzlePressure, "Nozzle pressure");
  }

  function fogReaction(flowGPM, nozzlePressure) {
    return 0.0505 * nonNegative(flowGPM, "Flow") * Math.sqrt(nonNegative(nozzlePressure, "Nozzle pressure"));
  }

  function elevationPressure(heightFeet) {
    return finite(heightFeet, "Elevation") * 0.434;
  }

  function standpipeElevationPressure(floor, psiPerFloor = 5) {
    const floorNumber = finite(floor, "Floor");
    return Math.max(0, floorNumber - 1) * positive(psiPerFloor, "PSI per floor");
  }

  function tankTimeSeconds(tankGallons, flowGPM) {
    return Math.round(positive(tankGallons, "Tank gallons") / positive(flowGPM, "Flow") * 60);
  }

  function waterVelocity(flowGPM, diameterInches) {
    return 0.408 * nonNegative(flowGPM, "Flow") / Math.pow(positive(diameterInches, "Diameter"), 2);
  }

  function hoseCoefficient(frictionLossPSI, flowGPM, lengthFeet = 100) {
    const flow = positive(flowGPM, "Flow");
    const length = positive(lengthFeet, "Length");
    return nonNegative(frictionLossPSI, "Friction loss") / (Math.pow(flow / 100, 2) * (length / 100));
  }

  function estimatedSupply({ staticPressure, residualPressure, currentFlow, targetResidual = 20 }) {
    const staticPSI = positive(staticPressure, "Static pressure");
    const residualPSI = nonNegative(residualPressure, "Residual pressure");
    const flow = positive(currentFlow, "Current flow");
    const targetPSI = nonNegative(targetResidual, "Target residual");
    if (staticPSI <= residualPSI) throw new RangeError("Static pressure must exceed residual pressure.");
    if (staticPSI <= targetPSI) throw new RangeError("Static pressure must exceed target residual.");
    const projectedFlow = flow * Math.pow((staticPSI - targetPSI) / (staticPSI - residualPSI), 0.54);
    return { projectedFlow, remainingFlow: projectedFlow - flow };
  }

  return { elevationPressure, estimatedSupply, fogReaction, frictionLoss, hoseCoefficient, requiredPDP, smoothboreFlow, smoothboreReaction, standpipeElevationPressure, tankTimeSeconds, waterVelocity };
});
