const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../www/js/hydraulics-core");

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test("canonical hydraulic helpers preserve Reverse Flow conventions", () => {
  close(H.frictionLoss(15.5, 185, 200), 15.5 * 1.85 ** 2 * 2);
  close(H.requiredPDP({ nozzlePressure: 50, frictionLossPSI: 42, applianceLoss: 10, elevationPressure: 21.7 }), 123.7);
  close(H.smoothboreFlow(.875, 50), 29.7 * .875 ** 2 * Math.sqrt(50));
  close(H.smoothboreReaction(.875, 50), 1.57 * .875 ** 2 * 50);
  close(H.fogReaction(185, 50), .0505 * 185 * Math.sqrt(50));
  close(H.elevationPressure(50), 21.7);
  assert.equal(H.standpipeElevationPressure(6), 25);
  assert.equal(H.tankTimeSeconds(750, 185), 243);
  close(H.waterVelocity(250, 2.5), .408 * 250 / 2.5 ** 2);
  close(H.hoseCoefficient(31, 200, 100), 7.75);
  const supply = H.estimatedSupply({ staticPressure: 80, residualPressure: 50, currentFlow: 1000, targetResidual: 20 });
  close(supply.projectedFlow, 1000 * ((80 - 20) / (80 - 50)) ** .54);
  close(supply.remainingFlow, supply.projectedFlow - 1000);
});

test("canonical helpers reject invalid and nonsensical inputs", () => {
  assert.throws(() => H.frictionLoss(0, 100, 100), /greater than 0/);
  assert.throws(() => H.tankTimeSeconds(500, 0), /greater than 0/);
  assert.throws(() => H.estimatedSupply({ staticPressure: 50, residualPressure: 50, currentFlow: 1000 }), /must exceed/);
  assert.throws(() => H.waterVelocity(100, -1), /greater than 0/);
});
