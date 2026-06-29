(function () {
  if (
    typeof guardToolsAccess === "function" &&
    !guardToolsAccess({
      safeUrl: "index.html",
      redirectDelayMs: 250,
      reason: "tools-calculator-init"
    })
  ) {
    return;
  }

  const calculatorPage = document.getElementById("fieldCalculatorPage");
  const overviewContent = document.getElementById("toolsOverviewContent");
  const toolsProContent = document.getElementById("toolsProContent");
  const calculatorPath = document.getElementById("fieldCalculatorPath");
  const calculatorTitle = document.getElementById("fieldCalculatorTitle");
  const calculatorDescription = document.getElementById("fieldCalculatorDescription");
  const calculatorBody = document.getElementById("fieldCalculatorBody");

  if (!calculatorPage || !overviewContent || !toolsProContent || !calculatorPath || !calculatorTitle || !calculatorDescription || !calculatorBody) {
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
    "water-velocity": {
      title: "Water Velocity",
      description: "Calculate water velocity from hose ID and flow.",
      render: renderWaterVelocity
    },
    coefficient: {
      title: "Coefficient Calculator",
      description: "Calculate hose friction loss coefficient from a 100' field test.",
      render: renderCoefficientCalculator
    },
    "wye-operations": {
      title: "Wye Operations",
      description: "Show fixed-PDP effects when one gated wye attack line closes.",
      render: renderWyeOperations
    },
    "friction-loss-chart": {
      title: "Friction Loss Chart",
      description: "Generate a friction loss reference chart from your current default hose coefficients.",
      path: "Tools / Reference Library / Friction Loss Chart",
      render: renderFrictionLossChart
    }
  };

  const selectedCalculator = calculators[calculatorId];

  if (!selectedCalculator) {
    document.body.classList.remove("tools-calculator-screen");
    calculatorPage.hidden = true;
    overviewContent.hidden = false;
    setupToolsSectionNavigation();
    return;
  }

  document.body.classList.add("tools-calculator-screen");
  overviewContent.hidden = true;
  calculatorPage.hidden = false;
  calculatorPath.textContent = selectedCalculator.path || `Tools / Field Calculators / ${selectedCalculator.title}`;
  calculatorTitle.textContent = selectedCalculator.title;
  calculatorDescription.textContent = selectedCalculator.description;
  selectedCalculator.render();

  function setupToolsSectionNavigation() {
    const sections = [...toolsProContent.querySelectorAll("details[data-tools-section]")];
    if (!sections.length || toolsProContent.dataset.toolsSectionNavigation === "ready") return;

    toolsProContent.dataset.toolsSectionNavigation = "ready";

    sections.forEach(section => {
      const body = section.querySelector(":scope > .collapsible-card-body");
      const summary = section.querySelector(":scope > summary");

      if (!body || !summary) return;

      const backButton = document.createElement("button");
      backButton.className = "reset-button reference-open-button tools-section-back";
      backButton.type = "button";
      const parentSection = section.parentElement?.closest("details[data-tools-section]");
      backButton.textContent = parentSection?.dataset.toolsTitle
        ? `Back to ${parentSection.dataset.toolsTitle}`
        : "Back to Tools";

      const path = document.createElement("p");
      path.className = "field-calculator-path tools-section-path";
      path.textContent = section.dataset.toolsPath || section.dataset.toolsTitle || "Tools";

      const header = document.createElement("div");
      header.className = "tools-section-page-header";
      header.append(backButton, path);
      body.prepend(header);

      summary.addEventListener("click", event => {
        event.preventDefault();
        enterToolsSection(section);
      });

      backButton.addEventListener("click", () => {
        if (parentSection) {
          enterToolsSection(parentSection);
          return;
        }

        exitToolsSection();
      });
    });
  }

  function enterToolsSection(section) {
    const sections = [...toolsProContent.querySelectorAll("details[data-tools-section]")];

    document.body.classList.add("tools-section-screen");
    sections.forEach(item => {
      item.classList.remove("active-tools-section", "active-tools-ancestor");
      item.open = false;
    });

    const ancestors = [];
    let parent = section.parentElement?.closest("details[data-tools-section]");

    while (parent) {
      ancestors.unshift(parent);
      parent = parent.parentElement?.closest("details[data-tools-section]");
    }

    ancestors.forEach(item => {
      item.classList.add("active-tools-ancestor");
      item.open = true;
    });

    section.classList.add("active-tools-section");
    section.open = true;
    section.scrollIntoView({ block: "start" });
  }

  function exitToolsSection() {
    const sections = [...toolsProContent.querySelectorAll("details[data-tools-section]")];

    document.body.classList.remove("tools-section-screen");
    sections.forEach(section => {
      section.classList.remove("active-tools-section", "active-tools-ancestor");
      section.open = false;
    });

    toolsProContent.scrollIntoView({ block: "start" });
  }

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

  function getWyeSupplyHoseOptions() {
    return getHoseOptions().filter(hose => ["2", "2.25", "2.5", "3", "4", "5"].includes(hose.id));
  }

  function getWyeAttackHoseOptions() {
    return getHoseOptions().filter(hose => ["1", "1.5", "1.75", "1.88", "2", "2.25", "2.5"].includes(hose.id));
  }

  function getHoseCoefficientValue(hose) {
    if (!hose) return null;
    if (typeof getActiveHoseCoefficient === "function") {
      return getActiveHoseCoefficient(hose.id);
    }
    return hose.coefficient;
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

  function createHoseSelect(id, options, fallbackId) {
    return `
      <select id="${escapeHtml(id)}">
        ${options.map(hose => `
          <option value="${escapeHtml(hose.id)}"${hose.id === fallbackId ? " selected" : ""}>${escapeHtml(hose.label)}</option>
        `).join("")}
      </select>
    `;
  }

  function getFrictionLossChartHoseOptions() {
    return getHoseOptions().filter(hose => getHoseCoefficientValue(hose) > 0);
  }

  function createPressureSelect(id, values, selectedValue) {
    return `
      <select id="${escapeHtml(id)}">
        ${values.map(value => `
          <option value="${escapeHtml(value)}"${String(value) === String(selectedValue) ? " selected" : ""}>${value === "custom" ? "Custom" : `${escapeHtml(value)} PSI`}</option>
        `).join("")}
      </select>
    `;
  }

  function createLengthInputWithButton(id) {
    return `
      <div class="input-with-button">
        <input id="${escapeHtml(id)}" type="text" inputmode="numeric" placeholder="Feet" />
        <button class="inline-add-button" type="button" data-wye-add-feet="${escapeHtml(id)}">+50</button>
      </div>
    `;
  }

  function addWyeFeet(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const currentValue = Number(input.value) || 0;
    input.value = currentValue + 50;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function createValueChange(previous, next, unit) {
    const delta = next - previous;
    const direction = delta > 0 ? "+" : "";
    return `${formatWhole(previous)} \u2192 ${formatWhole(next)} ${unit}${Math.abs(delta) >= 0.5 ? ` (${direction}${formatWhole(delta)})` : ""}`;
  }

  function createCompactResultCard(title, rows) {
    return `
      <article class="hose-library-card field-calculator-summary-card">
        <strong>${escapeHtml(title)}</strong>
        <div class="field-calculator-compact-results">
          ${rows.map(([label, value]) => `
            <div>
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  function calculateFrictionLoss(hose, length, flow) {
    const coefficient = getHoseCoefficientValue(hose);
    if (!(coefficient > 0) || !(length > 0) || !(flow >= 0)) return null;
    return coefficient * Math.pow(flow / 100, 2) * (length / 100);
  }

  function calculateSmoothboreFlow(diameter, pressure) {
    return 29.7 * diameter * diameter * Math.sqrt(pressure);
  }

  function calculateFogFlow(targetFlow, targetPressure, actualPressure) {
    return targetFlow * Math.sqrt(actualPressure / targetPressure);
  }

  function calculateSmoothboreReaction(diameter, pressure) {
    return 1.57 * diameter * diameter * pressure;
  }

  function calculateFogReaction(flow, pressure) {
    return 0.0505 * flow * Math.sqrt(pressure);
  }

  function normalizeNozzleType(value) {
    return value === "fog" ? "automaticFog" : value;
  }

  function isFixedFogType(value) {
    return normalizeNozzleType(value) === "fixedFog";
  }

  function isAutomaticFogType(value) {
    return normalizeNozzleType(value) === "automaticFog";
  }

  function fixedFogPressureForFlow(ratedFlow, ratedPressure, targetFlow) {
    if (!(ratedFlow > 0) || !(ratedPressure > 0) || !(targetFlow > 0)) return null;
    return ratedPressure * Math.pow(targetFlow / ratedFlow, 2);
  }

  function fixedFogFlowAtPressure(ratedFlow, ratedPressure, actualPressure) {
    if (!(ratedFlow > 0) || !(ratedPressure > 0) || !(actualPressure > 0)) return null;
    return ratedFlow * Math.sqrt(actualPressure / ratedPressure);
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
            <option value="automaticFog">Automatic Fog</option>
            <option value="fixedFog">Fixed Fog</option>
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

        <div id="nozzleReactionFixedFogRatingField" class="field" hidden>
          <label>Nozzle Rating</label>
          <div class="nozzle-rating-control">
            <div class="nozzle-rating-entry">
              <input id="nozzleReactionRatedFlow" type="text" inputmode="decimal" placeholder="GPM" />
            </div>
            <strong>@</strong>
            <div class="nozzle-rating-entry">
              <input id="nozzleReactionRatedPressure" type="text" inputmode="decimal" placeholder="PSI" />
            </div>
          </div>
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
    const fixedFogRatingField = document.getElementById("nozzleReactionFixedFogRatingField");
    const ratedFlow = document.getElementById("nozzleReactionRatedFlow");
    const ratedPressure = document.getElementById("nozzleReactionRatedPressure");
    const pressure = document.getElementById("nozzleReactionPressure");
    const results = document.getElementById("nozzleReactionResults");

    const update = () => {
      const isSmoothbore = type.value === "smoothbore";
      const isFixedFog = isFixedFogType(type.value);
      tipField.hidden = !isSmoothbore;
      flowField.hidden = isSmoothbore;
      fixedFogRatingField.hidden = !isFixedFog;
      pressure.closest(".field").hidden = isFixedFog;
      syncCustomTipField(tip, customTipField);
      customTipField.hidden = !isSmoothbore || tip.value !== "custom";

      let psi = numberOrNull(pressure.value);
      let reaction = null;
      const rows = [[
        "Nozzle Type",
        isSmoothbore
          ? "Smoothbore"
          : isFixedFog
            ? "Fixed Fog"
            : "Automatic Fog"
      ]];

      if (isSmoothbore) {
        const diameter = getSelectedTipDiameter(tip, customTip);
        if (diameter > 0 && psi > 0) {
          reaction = 1.57 * diameter * diameter * psi;
          rows.push(["Tip Size", getSelectedTipLabel(tip, customTip)]);
          rows.push(["Nozzle Pressure", `${formatNumber(psi, 0)} PSI`]);
        }
      } else {
        const gpm = numberOrNull(flow.value);
        if (isFixedFog) {
          psi = fixedFogPressureForFlow(
            numberOrNull(ratedFlow.value),
            numberOrNull(ratedPressure.value),
            gpm
          );
        }
        if (gpm > 0 && psi > 0) {
          reaction = 0.0505 * gpm * Math.sqrt(psi);
          rows.push(["Flow", `${formatNumber(gpm, 0)} GPM`]);
          rows.push(["Nozzle Pressure", `${formatNumber(psi, 0)} PSI`]);
          if (isFixedFog) {
            rows.push(["Nozzle Rating", `${formatNumber(numberOrNull(ratedFlow.value), 0)} GPM @ ${formatNumber(numberOrNull(ratedPressure.value), 0)} PSI`]);
          }
        }
      }

      results.hidden = reaction === null;
      if (reaction === null) return;

      results.innerHTML = createResultRows([
        ["Nozzle Reaction", `${formatWhole(reaction)} lb`],
        ...rows
      ]);
    };

    [type, tip, customTip, flow, pressure, ratedFlow, ratedPressure].forEach(input => {
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

  function renderWyeOperations() {
    const supplyHoses = getWyeSupplyHoseOptions();
    const attackHoses = getWyeAttackHoseOptions();

    calculatorBody.innerHTML = `
      <div class="split-lay-panel wye-operations-panel">
        <strong>Supply Setup</strong>
        <p class="helper">Pump to gated wye. Appliance loss is estimated automatically above 350 GPM.</p>

        <div class="split-lay-grid section-card supply-card supply-1-card">
          <div class="field full">
            <strong>Supply Section</strong>
            <p class="helper">Pump to gated wye.</p>
          </div>

          <div class="field">
            <label for="wyeSupplyLength">Supply Length</label>
            ${createLengthInputWithButton("wyeSupplyLength")}
          </div>

          <div class="field">
            <label for="wyeSupplyHose">Supply Hose</label>
            ${createHoseSelect("wyeSupplyHose", supplyHoses, "3")}
          </div>
        </div>

        <div class="field full">
          <strong>Attack Setup</strong>
          <p class="helper">Two attack lines supplied from one gated wye.</p>
        </div>

        <div id="wyeAttackSections" class="split-attack-sections">
          ${createWyeAttackFields(1, attackHoses)}
          ${createWyeAttackFields(2, attackHoses)}
        </div>
      </div>

      <div id="wyeValidationMessage" class="warnings field-calculator-warning" hidden></div>
      <div id="wyeOperationWarnings" class="warnings field-calculator-warning" hidden></div>
      <div id="wyeCurrentResults" hidden></div>
      <div id="wyeClosureResults" hidden></div>
    `;

    const controls = getWyeControls();

    const update = () => {
      syncWyeLineControls(controls.attack1);
      syncWyeLineControls(controls.attack2);

      const result = calculateWyeOperation(controls);

      controls.currentResults.hidden = !result.ok;
      controls.closureResults.hidden = true;
      controls.validation.hidden = result.ok;
      controls.operationWarnings.hidden = true;

      if (!result.ok) {
        controls.validation.innerHTML = `<div class="warning-item"><span>&#9888;&#65039;</span><span>${escapeHtml(result.message)}</span></div>`;
        return;
      }

      controls.validation.innerHTML = "";
      renderWyeOperationWarnings(result.warnings, controls.operationWarnings);
      controls.currentResults.innerHTML = createWyeCurrentResults(result);

      bindWyeClosureButtons(result, controls);
    };

    [
      controls.supplyHose,
      controls.supplyLength,
      ...getWyeLineInputs(controls.attack1),
      ...getWyeLineInputs(controls.attack2)
    ].forEach(input => {
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });

    document.querySelectorAll("[data-wye-add-feet]").forEach(button => {
      button.addEventListener("click", () => addWyeFeet(button.dataset.wyeAddFeet));
    });

    update();
  }

  function createWyeAttackFields(lineNumber, attackHoses) {
    return `
      <div class="split-lay-grid section-card attack-card attack-${lineNumber}-card">
        <div class="field full">
          <strong>Attack Line ${lineNumber}</strong>
        </div>

        <div class="field">
          <label for="wyeAttack${lineNumber}Length">Attack ${lineNumber} Length</label>
          ${createLengthInputWithButton(`wyeAttack${lineNumber}Length`)}
        </div>

        <div class="field">
          <label for="wyeAttack${lineNumber}Hose">Attack ${lineNumber} Hose</label>
          ${createHoseSelect(`wyeAttack${lineNumber}Hose`, attackHoses, "1.75")}
        </div>

        <div class="field">
          <label for="wyeAttack${lineNumber}NozzleType">Nozzle ${lineNumber} Style</label>
          <select id="wyeAttack${lineNumber}NozzleType">
            <option value="smoothbore">Smoothbore</option>
            <option value="automaticFog">Automatic Fog</option>
            <option value="fixedFog">Fixed Fog</option>
          </select>
        </div>

        <div class="field">
          <label for="wyeAttack${lineNumber}Pressure">Nozzle ${lineNumber} Pressure</label>
          ${createPressureSelect(`wyeAttack${lineNumber}Pressure`, [40, 50, 55, 60, 75, 100, "custom"], 50)}
        </div>

        <div id="wyeAttack${lineNumber}FlowField" class="field">
          <label for="wyeAttack${lineNumber}Flow">Target Flow ${lineNumber}</label>
          <input id="wyeAttack${lineNumber}Flow" type="text" inputmode="decimal" placeholder="GPM" />
        </div>

        <div id="wyeAttack${lineNumber}FixedFogRatingField" class="field" hidden>
          <label>Nozzle Rating ${lineNumber}</label>
          <div class="nozzle-rating-control">
            <div class="nozzle-rating-entry">
              <input id="wyeAttack${lineNumber}RatedFlow" type="text" inputmode="decimal" placeholder="GPM" />
            </div>
            <strong>@</strong>
            <div class="nozzle-rating-entry">
              <input id="wyeAttack${lineNumber}RatedPressure" type="text" inputmode="decimal" placeholder="PSI" />
            </div>
          </div>
        </div>

        <div id="wyeAttack${lineNumber}TipField" class="field" hidden>
          <label for="wyeAttack${lineNumber}Tip">Smoothbore Tip ${lineNumber}</label>
          ${createSmoothboreTipSelect(`wyeAttack${lineNumber}Tip`)}
        </div>

        <div id="wyeAttack${lineNumber}CustomTipField" class="field" hidden>
          <label for="wyeAttack${lineNumber}CustomTip">Custom Tip ${lineNumber}</label>
          <input id="wyeAttack${lineNumber}CustomTip" type="text" inputmode="decimal" placeholder="Diameter in inches" />
        </div>

        <div id="wyeAttack${lineNumber}CustomPressureField" class="field" hidden>
          <label for="wyeAttack${lineNumber}CustomPressure">Custom Pressure ${lineNumber}</label>
          <input id="wyeAttack${lineNumber}CustomPressure" type="text" inputmode="decimal" placeholder="PSI" />
        </div>
      </div>
    `;
  }

  function getWyeControls() {
    return {
      supplyHose: document.getElementById("wyeSupplyHose"),
      supplyLength: document.getElementById("wyeSupplyLength"),
      validation: document.getElementById("wyeValidationMessage"),
      operationWarnings: document.getElementById("wyeOperationWarnings"),
      currentResults: document.getElementById("wyeCurrentResults"),
      closureResults: document.getElementById("wyeClosureResults"),
      attack1: getWyeLineControls(1),
      attack2: getWyeLineControls(2)
    };
  }

  function getWyeLineControls(lineNumber) {
    return {
      lineNumber,
      hose: document.getElementById(`wyeAttack${lineNumber}Hose`),
      length: document.getElementById(`wyeAttack${lineNumber}Length`),
      nozzleType: document.getElementById(`wyeAttack${lineNumber}NozzleType`),
      flow: document.getElementById(`wyeAttack${lineNumber}Flow`),
      flowField: document.getElementById(`wyeAttack${lineNumber}FlowField`),
      tip: document.getElementById(`wyeAttack${lineNumber}Tip`),
      tipField: document.getElementById(`wyeAttack${lineNumber}TipField`),
      customTip: document.getElementById(`wyeAttack${lineNumber}CustomTip`),
      customTipField: document.getElementById(`wyeAttack${lineNumber}CustomTipField`),
      fixedFogRatingField: document.getElementById(`wyeAttack${lineNumber}FixedFogRatingField`),
      ratedFlow: document.getElementById(`wyeAttack${lineNumber}RatedFlow`),
      ratedPressure: document.getElementById(`wyeAttack${lineNumber}RatedPressure`),
      pressure: document.getElementById(`wyeAttack${lineNumber}Pressure`),
      customPressure: document.getElementById(`wyeAttack${lineNumber}CustomPressure`),
      customPressureField: document.getElementById(`wyeAttack${lineNumber}CustomPressureField`)
    };
  }

  function getWyeLineInputs(line) {
    return [
      line.hose,
      line.length,
      line.nozzleType,
      line.flow,
      line.ratedFlow,
      line.ratedPressure,
      line.tip,
      line.customTip,
      line.pressure,
      line.customPressure
    ];
  }

  function syncWyeLineControls(line) {
    const nozzleType = normalizeNozzleType(line.nozzleType.value);
    line.nozzleType.value = nozzleType;
    const isSmoothbore = nozzleType === "smoothbore";
    const isFixedFog = isFixedFogType(nozzleType);
    line.flowField.hidden = isSmoothbore;
    line.tipField.hidden = !isSmoothbore;
    line.customTipField.hidden = !isSmoothbore || line.tip.value !== "custom";
    line.fixedFogRatingField.hidden = !isFixedFog;
    line.pressure.closest(".field").hidden = isFixedFog;
    line.customPressureField.hidden = line.pressure.value !== "custom";
  }

  function calculateWyeOperation(controls) {
    const supplyHose = findHoseById(getWyeSupplyHoseOptions(), controls.supplyHose.value);
    const supplyLength = numberOrNull(controls.supplyLength.value);

    if (!supplyHose) return { ok: false, message: "Select a supply hose size." };
    if (!(supplyLength > 0)) return { ok: false, message: "Enter a valid supply hose length." };

    const attack1 = readWyeLine(controls.attack1);
    if (!attack1.ok) return attack1;

    const attack2 = readWyeLine(controls.attack2);
    if (!attack2.ok) return attack2;

    const attack1Loss = calculateFrictionLoss(attack1.hose, attack1.length, attack1.flow);
    const attack2Loss = calculateFrictionLoss(attack2.hose, attack2.length, attack2.flow);

    if (attack1Loss === null || attack2Loss === null) {
      return { ok: false, message: "Unable to calculate friction loss from the selected hose setup." };
    }

    const attack1Demand = attack1.nozzlePressure + attack1Loss;
    const attack2Demand = attack2.nozzlePressure + attack2Loss;
    const branchPressure = Math.max(attack1Demand, attack2Demand);
    const balancedLines = Math.abs(attack1Demand - attack2Demand) < 0.5;
    const drivingLine =
      balancedLines
        ? "Balanced"
        : attack1Demand > attack2Demand
          ? "Attack 1"
          : "Attack 2";
    const actualAttack1 = calculateActualWyeLine(
      { ...attack1, designFrictionLoss: attack1Loss, designDemand: attack1Demand },
      branchPressure
    );
    const actualAttack2 = calculateActualWyeLine(
      { ...attack2, designFrictionLoss: attack2Loss, designDemand: attack2Demand },
      branchPressure
    );
    const totalFlow = actualAttack1.flow + actualAttack2.flow;
    const applianceLoss = getWyeApplianceLoss(totalFlow);
    const warnings = getWyeScenarioWarnings({ ok: true, applianceLoss });
    const supplyLoss = calculateFrictionLoss(supplyHose, supplyLength, totalFlow);

    if (supplyLoss === null) {
      return { ok: false, message: "Unable to calculate supply friction loss from the selected hose setup." };
    }

    const requiredPdp = applianceLoss + supplyLoss + branchPressure;
    const fixedPdp = Math.ceil(requiredPdp);

    if (!(fixedPdp > applianceLoss)) {
      return { ok: false, message: "Configuration does not leave usable pressure for the attack lines." };
    }

    return {
      ok: true,
      supplyHose,
      supplyLength,
      applianceLoss,
      warnings,
      supplyLoss,
      totalFlow,
      requiredPdp,
      fixedPdp,
      branchPressure,
      drivingLine,
      attack1: {
        ...actualAttack1,
        pressurePath: balancedLines
          ? "balanced"
          : attack1Demand > attack2Demand
            ? "driver"
            : "recalculated"
      },
      attack2: {
        ...actualAttack2,
        pressurePath: balancedLines
          ? "balanced"
          : attack2Demand > attack1Demand
            ? "driver"
            : "recalculated"
      }
    };
  }

  function calculateActualWyeLine(line, branchPressure) {
    const coefficient = getHoseCoefficientValue(line.hose);
    const lengthHundreds = line.length / 100;

    let actualNozzlePressure = line.nozzlePressure;
    let actualFlow = line.flow;

    if (line.nozzleType === "smoothbore") {
      const tipConstant = 29.7 * line.diameter * line.diameter / 100;
      const frictionMultiplier =
        coefficient *
        tipConstant *
        tipConstant *
        lengthHundreds;

      actualNozzlePressure =
        branchPressure / (1 + frictionMultiplier);
      actualFlow =
        calculateSmoothboreFlow(line.diameter, actualNozzlePressure);
    } else if (isFixedFogType(line.nozzleType)) {
      const flowConstant =
        line.ratedFlow / Math.sqrt(line.ratedPressure);
      const frictionMultiplier =
        coefficient *
        Math.pow(flowConstant / 100, 2) *
        lengthHundreds;

      actualNozzlePressure =
        branchPressure / (1 + frictionMultiplier);
      actualFlow =
        fixedFogFlowAtPressure(
          line.ratedFlow,
          line.ratedPressure,
          actualNozzlePressure
        ) || 0;
    } else {
      actualNozzlePressure = line.nozzlePressure;

      const availableFrictionPressure =
        branchPressure - actualNozzlePressure;
      actualFlow =
        availableFrictionPressure > 0
          ? Math.sqrt(
              availableFrictionPressure /
              (coefficient * lengthHundreds)
            ) * 100
          : 0;
    }

    const actualFrictionLoss = calculateFrictionLoss(line.hose, line.length, actualFlow) ?? 0;
    const actualReaction = line.nozzleType === "smoothbore"
      ? calculateSmoothboreReaction(line.diameter, actualNozzlePressure)
      : calculateFogReaction(actualFlow, actualNozzlePressure);

    return {
      ...line,
      designFlow: line.flow,
      designNozzlePressure: line.nozzlePressure,
      flow: actualFlow,
      nozzlePressure: actualNozzlePressure,
      reaction: actualReaction,
      frictionLoss: actualFrictionLoss,
      demand: actualNozzlePressure + actualFrictionLoss,
      isRecalculated: Math.abs(actualNozzlePressure - line.nozzlePressure) > 1
    };
  }

  function readWyeLine(lineControls) {
    const lineLabel = `Attack ${lineControls.lineNumber}`;
    const hose = findHoseById(getWyeAttackHoseOptions(), lineControls.hose.value);
    const length = numberOrNull(lineControls.length.value);
    const nozzleType = normalizeNozzleType(lineControls.nozzleType.value);
    let nozzlePressure = getWyePressureValue(lineControls);

    if (!hose) return { ok: false, message: `Select a hose size for ${lineLabel}.` };
    if (!(length > 0)) return { ok: false, message: `Enter a valid hose length for ${lineLabel}.` };
    if (!isFixedFogType(nozzleType) && !(nozzlePressure > 0)) return { ok: false, message: `Enter a valid nozzle pressure for ${lineLabel}.` };

    if (nozzleType === "smoothbore") {
      const diameter = getSelectedTipDiameter(lineControls.tip, lineControls.customTip);
      const tipLabel = getSelectedTipLabel(lineControls.tip, lineControls.customTip);

      if (!(diameter > 0)) {
        return { ok: false, message: `Select or enter a valid smoothbore tip for ${lineLabel}.` };
      }

      const flow = calculateSmoothboreFlow(diameter, nozzlePressure);
      const reaction = calculateSmoothboreReaction(diameter, nozzlePressure);

      return {
        ok: true,
        lineNumber: lineControls.lineNumber,
        hose,
        length,
        nozzleType,
        nozzlePressure,
        targetPressure: nozzlePressure,
        flow,
        reaction,
        diameter,
        tipLabel
      };
    }

    const flow = numberOrNull(lineControls.flow.value);

    if (!(flow > 0)) return { ok: false, message: `Enter a valid flow for ${lineLabel}.` };

    const ratedFlow = numberOrNull(lineControls.ratedFlow.value);
    const ratedPressure = numberOrNull(lineControls.ratedPressure.value);

    if (isFixedFogType(nozzleType)) {
      nozzlePressure = fixedFogPressureForFlow(ratedFlow, ratedPressure, flow);

      if (!(nozzlePressure > 0)) {
        return { ok: false, message: `Enter a valid Fixed Fog nozzle rating for ${lineLabel}.` };
      }
    }

    return {
      ok: true,
      lineNumber: lineControls.lineNumber,
      hose,
      length,
      nozzleType,
      nozzlePressure,
      targetPressure: nozzlePressure,
      targetFlow: flow,
      ratedFlow,
      ratedPressure,
      flow,
      reaction: calculateFogReaction(flow, nozzlePressure)
    };
  }

  function getWyePressureValue(lineControls) {
    return lineControls.pressure.value === "custom"
      ? numberOrNull(lineControls.customPressure.value)
      : numberOrNull(lineControls.pressure.value);
  }

  function findHoseById(options, id) {
    return options.find(hose => hose.id === id);
  }

  function renderWyeOperationWarnings(warnings, container) {
    if (!container) return;

    container.hidden = !warnings.length;
    container.innerHTML = warnings.map(warning => `
      <div class="warning-item"><span>&#9888;&#65039;</span><span>${escapeHtml(warning)}</span></div>
    `).join("");
  }

  function createWyeCurrentResults(result) {
    return `
      <section class="card split-results-card wye-results-card">
        <div class="split-results-header">
          <p>Wye Operations PDP</p>
          <strong>${formatWhole(result.fixedPdp)} PSI</strong>
        </div>

        <div class="split-results-grid">
          <div class="split-result-section">
            <div class="split-section-divider">CURRENT OPERATION</div>
            <div class="split-result-title supply-1-title">Supply Section</div>
            <div class="split-result-details">
              ${createWyeResultItem("Total Flow", `${formatWhole(result.totalFlow)} GPM`)}
              ${createWyeResultItem("Supply FL", `${formatNumber(result.supplyLoss, 1)} PSI`)}
              ${createWyeResultItem("Appliance Loss", result.applianceLoss > 0 ? `${formatWhole(result.applianceLoss)} PSI` : "—")}
              ${createWyeResultItem("Driving Line", result.drivingLine)}
            </div>
          </div>

          ${createWyeLineResultSection(result.attack1)}
          ${createWyeLineResultSection(result.attack2)}
        </div>
      </section>
    `;
  }

  function createWyeResultItem(label, value, valueClass = "") {
    return `
      <div class="split-result-item">
        <p>${escapeHtml(label)}</p>
        <strong${valueClass ? ` class="${escapeHtml(valueClass)}"` : ""}>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function createWyeLineResultSection(line) {
    const tag = getWyeLineTag(line);

    return `
      <div class="split-result-section">
        <div class="split-section-divider">ATTACK LINES</div>
        <div class="split-result-title attack-${line.lineNumber}-title">
          <span>Attack Line ${line.lineNumber} • Delivered Conditions</span>
          <span class="pressure-path-tag ${escapeHtml(tag.className)}">${escapeHtml(tag.label)}</span>
        </div>
        <div class="split-result-details">
          ${createWyeResultItem("Delivered Flow", `${formatWhole(line.flow)} GPM`, line.isRecalculated ? "flow-increase" : "")}
          ${createWyeResultItem("Nozzle Pressure", `${formatWhole(line.nozzlePressure)} PSI`, line.isRecalculated ? "overpressure" : "normal-pressure")}
          ${createWyeResultItem("Attack Line FL", `${formatNumber(line.frictionLoss, 1)} PSI`)}
          ${createWyeResultItem("Nozzle Reaction", `${formatWhole(line.reaction)} lb`)}
        </div>
        <div class="field-calculator-actions wye-result-actions wye-line-actions">
          <button id="wyeAttack${line.lineNumber}ClosesButton" class="reset-button" type="button">Close Attack ${line.lineNumber}</button>
        </div>
      </div>
    `;
  }

  function getWyeLineTag(line) {
    if (line.pressurePath === "balanced") {
      return { className: "balanced", label: "BALANCED" };
    }

    if (line.pressurePath === "recalculated" || line.isRecalculated) {
      return { className: "recalculated", label: "RECALCULATED" };
    }

    return { className: "driver", label: "PDP DRIVING LINE" };
  }

  function bindWyeClosureButtons(result, controls) {
    const attack1Button = document.getElementById("wyeAttack1ClosesButton");
    const attack2Button = document.getElementById("wyeAttack2ClosesButton");

    attack1Button?.addEventListener("click", () => renderWyeClosureScenario(result, controls, 1));
    attack2Button?.addEventListener("click", () => renderWyeClosureScenario(result, controls, 2));
  }

  function renderWyeClosureScenario(result, controls, closedLineNumber) {
    const remainingLine = closedLineNumber === 1 ? result.attack2 : result.attack1;
    const closure = calculateWyeClosureLine(result, remainingLine);
    controls.currentResults.hidden = true;
    controls.closureResults.hidden = false;
    renderWyeOperationWarnings(getWyeScenarioWarnings(closure), controls.operationWarnings);

    if (!closure.ok) {
      controls.closureResults.innerHTML = `
        <section class="card split-results-card wye-results-card">
          <div class="split-results-header">
            <p>PDP Remains</p>
            <strong>${formatWhole(result.fixedPdp)} PSI</strong>
          </div>
          <div class="split-results-grid">
            <div class="warnings field-calculator-warning">
              <div class="warning-item"><span>&#9888;&#65039;</span><span>${escapeHtml(closure.message)}</span></div>
            </div>
            <div class="field-calculator-actions wye-result-actions">
              <button id="wyeBackToCurrentButton" class="reset-button" type="button">Back to Current Operation</button>
            </div>
          </div>
        </section>
      `;
    } else {
      controls.closureResults.innerHTML = `
        <section class="card split-results-card wye-results-card">
          <div class="split-results-header">
            <p>PDP Remains</p>
            <strong>${formatWhole(result.fixedPdp)} PSI</strong>
          </div>
          <div class="split-results-grid">
            <div class="split-result-section">
              <div class="split-section-divider">IF ATTACK ${closedLineNumber} CLOSES</div>
              <div class="split-result-title attack-${remainingLine.lineNumber}-title">
                <span>Attack Line ${remainingLine.lineNumber} • Remaining Line</span>
                <span class="pressure-path-tag recalculated">Fixed PDP</span>
              </div>
              <div class="split-result-details">
                ${createWyeResultItem("Delivered Flow", createValueChange(remainingLine.flow, closure.flow, "GPM"), "flow-increase")}
                ${createWyeResultItem("Nozzle Pressure", createValueChange(remainingLine.nozzlePressure, closure.nozzlePressure, "PSI"), "overpressure")}
                ${createWyeResultItem("Nozzle Reaction", createValueChange(remainingLine.reaction, closure.reaction, "lb"))}
              </div>
            </div>
            <div class="field-calculator-actions wye-result-actions">
              <button id="wyeBackToCurrentButton" class="reset-button" type="button">Back to Current Operation</button>
            </div>
          </div>
        </section>
      `;
    }

    document.getElementById("wyeBackToCurrentButton")?.addEventListener("click", () => {
      controls.closureResults.hidden = true;
      controls.currentResults.hidden = false;
      renderWyeOperationWarnings(result.warnings, controls.operationWarnings);
    });
  }

  function calculateWyeClosureLine(result, line) {
    const solve = solveWyeRemainingNozzlePressure({
      line,
      supplyHose: result.supplyHose,
      supplyLength: result.supplyLength,
      fixedPdp: result.fixedPdp
    });

    if (!solve.ok) return solve;

    const reaction = line.nozzleType === "smoothbore"
      ? calculateSmoothboreReaction(line.diameter, solve.nozzlePressure)
      : calculateFogReaction(solve.flow, solve.nozzlePressure);

    return {
      ok: true,
      nozzlePressure: solve.nozzlePressure,
      flow: solve.flow,
      applianceLoss: solve.applianceLoss,
      reaction
    };
  }

  function solveWyeRemainingNozzlePressure({ line, supplyHose, supplyLength, fixedPdp }) {
    if (isAutomaticFogType(line.nozzleType)) {
      return solveWyeRemainingAutomaticFog({
        line,
        supplyHose,
        supplyLength,
        fixedPdp
      });
    }

    const pressureDemand = nozzlePressure => {
      const flow = getWyeFlowAtPressure(line, nozzlePressure);
      const supplyLoss = calculateFrictionLoss(supplyHose, supplyLength, flow);
      const attackLoss = calculateFrictionLoss(line.hose, line.length, flow);
      const applianceLoss = getWyeApplianceLoss(flow);

      if (supplyLoss === null || attackLoss === null) return null;

      return {
        flow,
        applianceLoss,
        totalPressure: nozzlePressure + supplyLoss + attackLoss + applianceLoss
      };
    };

    let low = 0;
    let high = Math.max(line.nozzlePressure, 50);
    let highDemand = pressureDemand(high);

    while (highDemand && highDemand.totalPressure < fixedPdp && high < 2000) {
      high *= 2;
      highDemand = pressureDemand(high);
    }

    if (!highDemand || highDemand.totalPressure < fixedPdp) {
      return { ok: false, message: "Unable to solve remaining line pressure from the fixed PDP." };
    }

    for (let i = 0; i < 60; i += 1) {
      const mid = (low + high) / 2;
      const midDemand = pressureDemand(mid);

      if (!midDemand) {
        return { ok: false, message: "Unable to solve remaining line pressure from the selected hose setup." };
      }

      if (midDemand.totalPressure > fixedPdp) {
        high = mid;
      } else {
        low = mid;
      }
    }

    const nozzlePressure = (low + high) / 2;
    const flow = getWyeFlowAtPressure(line, nozzlePressure);
    const applianceLoss = getWyeApplianceLoss(flow);

    if (!(nozzlePressure > 0) || !(flow > 0)) {
      return { ok: false, message: "Closure scenario does not leave valid flow for the remaining line." };
    }

    return { ok: true, nozzlePressure, flow, applianceLoss };
  }

  function getWyeFlowAtPressure(line, nozzlePressure) {
    if (line.nozzleType === "smoothbore") {
      return calculateSmoothboreFlow(line.diameter, nozzlePressure);
    }

    if (isFixedFogType(line.nozzleType)) {
      return fixedFogFlowAtPressure(
        line.ratedFlow,
        line.ratedPressure,
        nozzlePressure
      ) || 0;
    }

    return calculateFogFlow(line.targetFlow, line.targetPressure, nozzlePressure);
  }

  function solveWyeRemainingAutomaticFog({ line, supplyHose, supplyLength, fixedPdp }) {
    const nozzlePressure = line.nozzlePressure;
    const pressureDemand = flow => {
      const supplyLoss = calculateFrictionLoss(supplyHose, supplyLength, flow);
      const attackLoss = calculateFrictionLoss(line.hose, line.length, flow);
      const applianceLoss = getWyeApplianceLoss(flow);

      if (supplyLoss === null || attackLoss === null) return null;

      return {
        flow,
        applianceLoss,
        totalPressure: nozzlePressure + supplyLoss + attackLoss + applianceLoss
      };
    };

    let low = 0;
    let high = Math.max(line.flow, 50);
    let highDemand = pressureDemand(high);

    while (highDemand && highDemand.totalPressure < fixedPdp && high < 5000) {
      high *= 2;
      highDemand = pressureDemand(high);
    }

    if (!highDemand || highDemand.totalPressure < fixedPdp) {
      return { ok: false, message: "Unable to solve remaining line flow from the fixed PDP." };
    }

    for (let i = 0; i < 60; i += 1) {
      const mid = (low + high) / 2;
      const midDemand = pressureDemand(mid);

      if (!midDemand) {
        return { ok: false, message: "Unable to solve remaining line flow from the selected hose setup." };
      }

      if (midDemand.totalPressure > fixedPdp) {
        high = mid;
      } else {
        low = mid;
      }
    }

    const flow = (low + high) / 2;
    const applianceLoss = getWyeApplianceLoss(flow);

    if (!(nozzlePressure > 0) || !(flow > 0)) {
      return { ok: false, message: "Closure scenario does not leave valid flow for the remaining line." };
    }

    return { ok: true, nozzlePressure, flow, applianceLoss };
  }

  function getWyeApplianceLoss(flow) {
    return flow > 350 ? 10 : 0;
  }

  function getWyeScenarioWarnings(scenario) {
    return scenario.ok && scenario.applianceLoss > 0
      ? ["Estimated appliance loss applied: 10 psi at flows >350 GPM."]
      : [];
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

  function renderWaterVelocity() {
    const hoseOptions = getHoseOptions()
      .filter(hose => Number(hose.id) > 0)
      .map(hose => `<option value="${escapeHtml(hose.id)}"${hose.id === "2.5" ? " selected" : ""}>${escapeHtml(hose.label)}</option>`)
      .join("");

    calculatorBody.innerHTML = `
      <div class="field-calculator-form">
        <div class="field">
          <label for="waterVelocityHoseId">Hose Size / ID</label>
          <select id="waterVelocityHoseId">
            ${hoseOptions}
            <option value="custom">Custom</option>
          </select>
        </div>

        <div class="field" id="waterVelocityCustomIdField" hidden>
          <label for="waterVelocityCustomId">Custom Charged ID</label>
          <input id="waterVelocityCustomId" type="text" inputmode="decimal" placeholder="Inches" />
        </div>

        <div class="field">
          <label for="waterVelocityFlow">Flow</label>
          <input id="waterVelocityFlow" type="text" inputmode="decimal" placeholder="GPM" />
        </div>
      </div>

      <div id="waterVelocityResults" hidden></div>
    `;

    const hoseId = document.getElementById("waterVelocityHoseId");
    const customIdField = document.getElementById("waterVelocityCustomIdField");
    const customId = document.getElementById("waterVelocityCustomId");
    const flow = document.getElementById("waterVelocityFlow");
    const results = document.getElementById("waterVelocityResults");

    const update = () => {
      const isCustom = hoseId.value === "custom";
      customIdField.hidden = !isCustom;

      const id = isCustom ? numberOrNull(customId.value) : numberOrNull(hoseId.value);
      const gpm = numberOrNull(flow.value);
      const isValid = id !== null && gpm !== null && id > 0 && gpm >= 0;

      results.hidden = !isValid;
      if (!isValid) return;

      const velocity = 0.408 * gpm / (id * id);
      results.innerHTML = createResultRows([
        ["Water Velocity", `${formatNumber(velocity, 1)} ft/sec`]
      ]);
    };

    [hoseId, customId, flow].forEach(input => {
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    });
    update();
  }

  function renderFrictionLossChart() {
    const hoseOptions = getFrictionLossChartHoseOptions();
    const defaultHoseIds = new Set(["1.75", "1.88", "2", "2.25", "2.5", "3", "4", "5"]);

    calculatorBody.innerHTML = `
      <p class="helper field-calculator-note">Select hose sizes to include. The chart covers 0-1000 GPM in 50 GPM increments.</p>
      <section class="field-calculator-section">
        <strong>Included Hose Sizes</strong>
        <div class="field-calculator-form" role="group" aria-label="Included hose sizes">
          ${hoseOptions.map(hose => {
            const coefficient = getHoseCoefficientValue(hose);
            return `
              <label class="split-inline-toggle friction-loss-hose-toggle">
                <input type="checkbox" value="${escapeHtml(hose.id)}"${defaultHoseIds.has(hose.id) ? " checked" : ""} />
                <span>
                  <strong>${escapeHtml(hose.chartName || hose.label)}</strong>
                  <span class="helper">C ${escapeHtml(formatNumber(coefficient, coefficient < 1 ? 2 : 1))}</span>
                </span>
              </label>
            `;
          }).join("")}
        </div>
        <div class="field-calculator-actions">
          <button id="generateFrictionLossChartButton" class="reset-button" type="button">Generate PNG</button>
        </div>
        <p id="frictionLossChartStatus" class="helper field-calculator-note" hidden></p>
      </section>
    `;

    const button = document.getElementById("generateFrictionLossChartButton");
    const status = document.getElementById("frictionLossChartStatus");

    button?.addEventListener("click", async () => {
      const selectedHoseIds = [...calculatorBody.querySelectorAll(".friction-loss-hose-toggle input:checked")]
        .map(input => input.value)
        .filter(Boolean);

      if (!selectedHoseIds.length) {
        alert("Select at least one hose size.");
        return;
      }

      if (typeof window.exportFrictionLossChart !== "function") {
        alert("Friction Loss Chart export is unavailable.");
        return;
      }

      button.disabled = true;
      status.hidden = false;
      status.textContent = "Generating Friction Loss Chart PNG...";

      try {
        const result = await window.exportFrictionLossChart(selectedHoseIds);
        status.textContent = result?.shared
          ? "Share sheet opened."
          : "PNG generated. Sharing fallback was used or unavailable on this device.";
      } catch (error) {
        status.textContent = "Unable to generate the Friction Loss Chart PNG.";
        console.error("[Friction Loss Chart]", error);
      } finally {
        button.disabled = false;
      }
    });
  }
})();
