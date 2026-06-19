(function () {
  const calculatorPage = document.getElementById("fieldCalculatorPage");
  const overviewContent = document.getElementById("toolsOverviewContent");
  const calculatorTitle = document.getElementById("fieldCalculatorTitle");
  const calculatorDescription = document.getElementById("fieldCalculatorDescription");
  const calculatorBody = document.getElementById("fieldCalculatorBody");

  if (!calculatorPage || !overviewContent || !calculatorTitle || !calculatorDescription || !calculatorBody) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const calculatorId = params.get("calculator");

  const calculators = {
    "smoothbore-flow": {
      title: "Smoothbore Flow",
      description: "Calculate flow from a smoothbore tip and pressure.",
      render: renderSmoothboreFlow
    },
    "nozzle-reaction": {
      title: "Nozzle Reaction",
      description: "Calculate nozzle reaction for smoothbore or fog nozzles.",
      render: renderNozzleReaction
    },
    "tank-time": {
      title: "Tank Time",
      description: "Estimate onboard water duration at a known flow.",
      render: renderTankTime
    },
    coefficient: {
      title: "Coefficient Calculator",
      description: "Calculate hose friction loss coefficient from a 100' field test.",
      render: renderCoefficientCalculator
    }
  };

  const selectedCalculator = calculators[calculatorId];

  if (!selectedCalculator) {
    calculatorPage.hidden = true;
    overviewContent.hidden = false;
    return;
  }

  overviewContent.hidden = true;
  calculatorPage.hidden = false;
  calculatorTitle.textContent = selectedCalculator.title;
  calculatorDescription.textContent = selectedCalculator.description;
  selectedCalculator.render();

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatNumber(value, digits = 1) {
    if (!Number.isFinite(value)) return "-";
    return value.toLocaleString(undefined, {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits
    });
  }

  function formatWhole(value) {
    if (!Number.isFinite(value)) return "-";
    return Math.round(value).toLocaleString();
  }

  function getSmoothboreTipOptions() {
    return Array.isArray(window.SMOOTHBORE_TIPS)
      ? window.SMOOTHBORE_TIPS
      : typeof SMOOTHBORE_TIPS !== "undefined"
        ? SMOOTHBORE_TIPS
        : [];
  }

  function getHoseOptions() {
    const baseHoseOptions = typeof HOSE_OPTIONS !== "undefined" ? HOSE_OPTIONS : [];
    const relayHoseOptions = typeof RELAY_HOSE_OPTIONS !== "undefined" ? RELAY_HOSE_OPTIONS : [];
    const optionsById = new Map();

    [...baseHoseOptions, ...relayHoseOptions].forEach(hose => {
      if (hose?.id && !optionsById.has(hose.id)) {
        optionsById.set(hose.id, hose);
      }
    });

    return [...optionsById.values()];
  }

  function createSmoothboreTipSelect(id) {
    const tipOptions = getSmoothboreTipOptions()
      .map(tip => `<option value="${escapeHtml(tip.id)}" data-diameter="${escapeHtml(tip.diameter)}">${escapeHtml(tip.label)}</option>`)
      .join("");

    return `
      <select id="${escapeHtml(id)}">
        ${tipOptions}
        <option value="custom">Custom</option>
      </select>
    `;
  }

  function createResultRows(rows) {
    return `
      <div class="field-calculator-results">
        ${rows.map(([label, value]) => `
          <div class="field-calculator-result-row">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join("")}
      </div>
    `;
  }

  function getSelectedTipDiameter(select, customInput) {
    if (select.value === "custom") {
      return numberOrNull(customInput.value);
    }

    const option = select.selectedOptions[0];
    return numberOrNull(option?.dataset.diameter);
  }

  function getSelectedTipLabel(select, customInput) {
    if (select.value === "custom") {
      const customDiameter = numberOrNull(customInput.value);
      return customDiameter ? `${formatNumber(customDiameter, 3)}"` : "Custom";
    }

    return select.selectedOptions[0]?.textContent || "Selected tip";
  }

  function syncCustomTipField(select, field) {
    field.hidden = select.value !== "custom";
  }

  function renderSmoothboreFlow() {
    calculatorBody.innerHTML = `
      <div class="field-calculator-form">
        <div class="field">
          <label for="smoothboreFlowTip">Tip Size</label>
          ${createSmoothboreTipSelect("smoothboreFlowTip")}
        </div>

        <div id="smoothboreFlowCustomTipField" class="field" hidden>
          <label for="smoothboreFlowCustomTip">Custom Diameter</label>
          <input id="smoothboreFlowCustomTip" type="text" inputmode="decimal" placeholder="Diameter in inches" />
        </div>

        <div class="field">
          <label for="smoothboreFlowPressure">Pressure (NP or Pitot)</label>
          <input id="smoothboreFlowPressure" type="text" inputmode="decimal" placeholder="PSI" />
        </div>
      </div>

      <p class="helper field-calculator-note">Also serves pitot calculations.</p>
      <div id="smoothboreFlowResults" hidden></div>
    `;

    const tip = document.getElementById("smoothboreFlowTip");
    const customTip = document.getElementById("smoothboreFlowCustomTip");
    const customTipField = document.getElementById("smoothboreFlowCustomTipField");
    const pressure = document.getElementById("smoothboreFlowPressure");
    const results = document.getElementById("smoothboreFlowResults");

    const update = () => {
      syncCustomTipField(tip, customTipField);
      const diameter = getSelectedTipDiameter(tip, customTip);
      const psi = numberOrNull(pressure.value);
      const isValid = diameter > 0 && psi > 0;

      results.hidden = !isValid;
      if (!isValid) return;

      const gpm = 29.7 * diameter * diameter * Math.sqrt(psi);
      results.innerHTML = createResultRows([
        ["Flow", `${formatWhole(gpm)} GPM`],
        ["Tip Size", getSelectedTipLabel(tip, customTip)],
        ["Pressure Used", `${formatNumber(psi, 0)} PSI`]
      ]);
    };

    [tip, customTip, pressure].forEach(input => input.addEventListener("input", update));
    tip.addEventListener("change", update);
    update();
  }

  function renderNozzleReaction() {
    calculatorBody.innerHTML = `
      <div class="field-calculator-form">
        <div class="field">
          <label for="nozzleReactionType">Nozzle Type</label>
          <select id="nozzleReactionType">
            <option value="smoothbore">Smoothbore</option>
            <option value="fog">Fog</option>
          </select>
        </div>

        <div id="nozzleReactionTipField" class="field">
          <label for="nozzleReactionTip">Tip Size</label>
          ${createSmoothboreTipSelect("nozzleReactionTip")}
        </div>

        <div id="nozzleReactionCustomTipField" class="field" hidden>
          <label for="nozzleReactionCustomTip">Custom Diameter</label>
          <input id="nozzleReactionCustomTip" type="text" inputmode="decimal" placeholder="Diameter in inches" />
        </div>

        <div id="nozzleReactionFlowField" class="field" hidden>
          <label for="nozzleReactionFlow">Flow</label>
          <input id="nozzleReactionFlow" type="text" inputmode="decimal" placeholder="GPM" />
        </div>

        <div class="field">
          <label for="nozzleReactionPressure">Nozzle Pressure</label>
          <input id="nozzleReactionPressure" type="text" inputmode="decimal" placeholder="PSI" />
        </div>
      </div>

      <div id="nozzleReactionResults" hidden></div>
    `;

    const type = document.getElementById("nozzleReactionType");
    const tip = document.getElementById("nozzleReactionTip");
    const customTip = document.getElementById("nozzleReactionCustomTip");
    const tipField = document.getElementById("nozzleReactionTipField");
    const customTipField = document.getElementById("nozzleReactionCustomTipField");
    const flow = document.getElementById("nozzleReactionFlow");
    const flowField = document.getElementById("nozzleReactionFlowField");
    const pressure = document.getElementById("nozzleReactionPressure");
    const results = document.getElementById("nozzleReactionResults");

    const update = () => {
      const isSmoothbore = type.value === "smoothbore";
      tipField.hidden = !isSmoothbore;
      flowField.hidden = isSmoothbore;
      syncCustomTipField(tip, customTipField);
      customTipField.hidden = !isSmoothbore || tip.value !== "custom";

      const psi = numberOrNull(pressure.value);
      let reaction = null;
      const rows = [["Nozzle Type", isSmoothbore ? "Smoothbore" : "Fog"]];

      if (isSmoothbore) {
        const diameter = getSelectedTipDiameter(tip, customTip);
        if (diameter > 0 && psi > 0) {
          reaction = 1.57 * diameter * diameter * psi;
          rows.push(["Tip Size", getSelectedTipLabel(tip, customTip)]);
          rows.push(["Nozzle Pressure", `${formatNumber(psi, 0)} PSI`]);
        }
      } else {
        const gpm = numberOrNull(flow.value);
        if (gpm > 0 && psi > 0) {
          reaction = 0.0505 * gpm * Math.sqrt(psi);
          rows.push(["Flow", `${formatNumber(gpm, 0)} GPM`]);
          rows.push(["Nozzle Pressure", `${formatNumber(psi, 0)} PSI`]);
        }
      }

      results.hidden = reaction === null;
      if (reaction === null) return;

      results.innerHTML = createResultRows([
        ["Nozzle Reaction", `${formatWhole(reaction)} lb`],
        ...rows
      ]);
    };

    [type, tip, customTip, flow, pressure].forEach(input => {
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });
    update();
  }

  function renderTankTime() {
    calculatorBody.innerHTML = `
      <div class="field-calculator-form">
        <div class="field">
          <label for="tankTimeSize">Tank Size</label>
          <select id="tankTimeSize">
            <option value="500">500 gal</option>
            <option value="750">750 gal</option>
            <option value="1000">1000 gal</option>
            <option value="1250">1250 gal</option>
            <option value="1500">1500 gal</option>
            <option value="1800">1800 gal</option>
            <option value="2000">2000 gal</option>
            <option value="3000">3000 gal</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div id="tankTimeCustomSizeField" class="field" hidden>
          <label for="tankTimeCustomSize">Custom Tank Size</label>
          <input id="tankTimeCustomSize" type="text" inputmode="decimal" placeholder="Gallons" />
        </div>

        <div class="field">
          <label for="tankTimeFlow">Flow</label>
          <input id="tankTimeFlow" type="text" inputmode="decimal" placeholder="GPM" />
        </div>
      </div>

      <div id="tankTimeResults" hidden></div>
    `;

    const tankSize = document.getElementById("tankTimeSize");
    const customSize = document.getElementById("tankTimeCustomSize");
    const customSizeField = document.getElementById("tankTimeCustomSizeField");
    const flow = document.getElementById("tankTimeFlow");
    const results = document.getElementById("tankTimeResults");

    const update = () => {
      customSizeField.hidden = tankSize.value !== "custom";
      const gallons = tankSize.value === "custom" ? numberOrNull(customSize.value) : numberOrNull(tankSize.value);
      const gpm = numberOrNull(flow.value);
      const isValid = gallons > 0 && gpm > 0;

      results.hidden = !isValid;
      if (!isValid) return;

      const minutes = gallons / gpm;
      const totalSeconds = Math.round(minutes * 60);
      const wholeMinutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      results.innerHTML = createResultRows([
        ["Available Water Time", `${wholeMinutes} min ${seconds} sec`],
        ["Tank Size", `${formatNumber(gallons, 0)} gal`],
        ["Flow", `${formatNumber(gpm, 0)} GPM`]
      ]);
    };

    [tankSize, customSize, flow].forEach(input => {
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });
    update();
  }

  function renderCoefficientCalculator() {
    const hoseOptions = getHoseOptions()
      .map(hose => `<option value="${escapeHtml(hose.id)}">${escapeHtml(hose.label)}</option>`)
      .join("");

    calculatorBody.innerHTML = `
      <p class="helper field-calculator-note">Test setup: Gauge &rarr; 50' hose &rarr; 50' hose &rarr; Gauge</p>

      <div class="field-calculator-form">
        <div class="field">
          <label for="coefficientHoseSize">Hose Size</label>
          <select id="coefficientHoseSize">${hoseOptions}</select>
        </div>

        <div class="field">
          <label for="coefficientFlow">Flow</label>
          <input id="coefficientFlow" type="text" inputmode="decimal" placeholder="GPM" />
        </div>

        <div class="field">
          <label for="coefficientGaugeOne">Gauge 1 Pressure</label>
          <input id="coefficientGaugeOne" type="text" inputmode="decimal" placeholder="PSI" />
        </div>

        <div class="field">
          <label for="coefficientGaugeTwo">Gauge 2 Pressure</label>
          <input id="coefficientGaugeTwo" type="text" inputmode="decimal" placeholder="PSI" />
        </div>
      </div>

      <div id="coefficientResults" hidden></div>
    `;

    const hoseSize = document.getElementById("coefficientHoseSize");
    const flow = document.getElementById("coefficientFlow");
    const gaugeOne = document.getElementById("coefficientGaugeOne");
    const gaugeTwo = document.getElementById("coefficientGaugeTwo");
    const results = document.getElementById("coefficientResults");

    const update = () => {
      const gpm = numberOrNull(flow.value);
      const pressureOne = numberOrNull(gaugeOne.value);
      const pressureTwo = numberOrNull(gaugeTwo.value);
      const isValid = gpm > 0 && pressureOne > 0 && pressureTwo > 0 && pressureOne > pressureTwo;

      results.hidden = !isValid;
      if (!isValid) return;

      const frictionLoss = pressureOne - pressureTwo;
      const q = gpm / 100;
      const coefficient = frictionLoss / (q * q);

      results.innerHTML = createResultRows([
        ["Measured Friction Loss (100')", `${formatNumber(frictionLoss, 1)} PSI`],
        ["Calculated Coefficient", formatNumber(coefficient, 2)],
        ["Hose Size", hoseSize.selectedOptions[0]?.textContent || "Selected hose"],
        ["Flow", `${formatNumber(gpm, 0)} GPM`]
      ]);
    };

    [hoseSize, flow, gaugeOne, gaugeTwo].forEach(input => {
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });
    update();
  }
})();
