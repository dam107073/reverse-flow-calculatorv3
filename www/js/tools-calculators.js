(function () {
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
    coefficient: {
      title: "Coefficient Calculator",
      description: "Calculate hose friction loss coefficient from a 100' field test.",
      render: renderCoefficientCalculator
    },
    "wye-operations": {
      title: "Wye Operations",
      description: "Show fixed-PDP effects when one gated wye attack line closes.",
      render: renderWyeOperations
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
  calculatorPath.textContent = `Tools / Field Calculators / ${selectedCalculator.title}`;
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
            <option value="fog">Fog</option>
            <option value="smoothbore">Smoothbore</option>
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
      line.tip,
      line.customTip,
      line.pressure,
      line.customPressure
    ];
  }

  function syncWyeLineControls(line) {
    const isSmoothbore = line.nozzleType.value === "smoothbore";
    line.flowField.hidden = isSmoothbore;
    line.tipField.hidden = !isSmoothbore;
    line.customTipField.hidden = !isSmoothbore || line.tip.value !== "custom";
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
    const applianceLoss = totalFlow > 350 ? 10 : 0;
    const warnings = applianceLoss > 0
      ? ["Estimated appliance loss applied: 10 psi at flows >350 GPM."]
      : [];
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
    } else {
      const frictionMultiplier =
        coefficient *
        Math.pow(line.targetFlow / 100, 2) *
        lengthHundreds /
        line.targetPressure;

      actualNozzlePressure =
        branchPressure / (1 + frictionMultiplier);
      actualFlow =
        calculateFogFlow(line.targetFlow, line.targetPressure, actualNozzlePressure);
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
    const nozzleType = lineControls.nozzleType.value;
    const nozzlePressure = getWyePressureValue(lineControls);

    if (!hose) return { ok: false, message: `Select a hose size for ${lineLabel}.` };
    if (!(length > 0)) return { ok: false, message: `Enter a valid hose length for ${lineLabel}.` };
    if (!(nozzlePressure > 0)) return { ok: false, message: `Enter a valid nozzle pressure for ${lineLabel}.` };

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

    return {
      ok: true,
      lineNumber: lineControls.lineNumber,
      hose,
      length,
      nozzleType,
      nozzlePressure,
      targetPressure: nozzlePressure,
      targetFlow: flow,
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
      return { className: "balanced", label: "Balanced" };
    }

    if (line.pressurePath === "recalculated" || line.isRecalculated) {
      return { className: "recalculated", label: "Recalculated" };
    }

    return { className: "driver", label: "Driver" };
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
    });
  }

  function calculateWyeClosureLine(result, line) {
    const targetPressureBudget = result.fixedPdp - result.applianceLoss;

    if (!(targetPressureBudget > 0)) {
      return { ok: false, message: "Fixed PDP does not leave usable pressure after appliance loss." };
    }

    const solve = solveWyeRemainingNozzlePressure({
      line,
      supplyHose: result.supplyHose,
      supplyLength: result.supplyLength,
      targetPressureBudget
    });

    if (!solve.ok) return solve;

    const reaction = line.nozzleType === "smoothbore"
      ? calculateSmoothboreReaction(line.diameter, solve.nozzlePressure)
      : calculateFogReaction(solve.flow, solve.nozzlePressure);

    return {
      ok: true,
      nozzlePressure: solve.nozzlePressure,
      flow: solve.flow,
      reaction
    };
  }

  function solveWyeRemainingNozzlePressure({ line, supplyHose, supplyLength, targetPressureBudget }) {
    const pressureDemand = nozzlePressure => {
      const flow = getWyeFlowAtPressure(line, nozzlePressure);
      const supplyLoss = calculateFrictionLoss(supplyHose, supplyLength, flow);
      const attackLoss = calculateFrictionLoss(line.hose, line.length, flow);

      if (supplyLoss === null || attackLoss === null) return null;

      return {
        flow,
        totalPressure: nozzlePressure + supplyLoss + attackLoss
      };
    };

    let low = 0;
    let high = Math.max(line.nozzlePressure, 50);
    let highDemand = pressureDemand(high);

    while (highDemand && highDemand.totalPressure < targetPressureBudget && high < 2000) {
      high *= 2;
      highDemand = pressureDemand(high);
    }

    if (!highDemand || highDemand.totalPressure < targetPressureBudget) {
      return { ok: false, message: "Unable to solve remaining line pressure from the fixed PDP." };
    }

    for (let i = 0; i < 60; i += 1) {
      const mid = (low + high) / 2;
      const midDemand = pressureDemand(mid);

      if (!midDemand) {
        return { ok: false, message: "Unable to solve remaining line pressure from the selected hose setup." };
      }

      if (midDemand.totalPressure > targetPressureBudget) {
        high = mid;
      } else {
        low = mid;
      }
    }

    const nozzlePressure = (low + high) / 2;
    const flow = getWyeFlowAtPressure(line, nozzlePressure);

    if (!(nozzlePressure > 0) || !(flow > 0)) {
      return { ok: false, message: "Closure scenario does not leave valid flow for the remaining line." };
    }

    return { ok: true, nozzlePressure, flow };
  }

  function getWyeFlowAtPressure(line, nozzlePressure) {
    return line.nozzleType === "smoothbore"
      ? calculateSmoothboreFlow(line.diameter, nozzlePressure)
      : calculateFogFlow(line.targetFlow, line.targetPressure, nozzlePressure);
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
