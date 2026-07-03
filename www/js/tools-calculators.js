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
    "water-shuttle": {
      title: "Water Shuttle Estimator",
      description: "Estimate sustained shuttle flow from one or more tenders.",
      render: renderWaterShuttle
    },
    "water-velocity": {
      title: "Water Velocity",
      description: "Calculate water velocity from hose ID and flow.",
      render: renderWaterVelocity
    },
    "estimated-remaining-supply": {
      title: "Estimated Remaining Supply",
      description: "Estimate additional hydrant supply at a selected residual pressure.",
      render: renderEstimatedRemainingSupply
    },
    coefficient: {
      title: "Coefficient Calculator",
      description: "Calculate hose friction loss coefficient from a 100' field test.",
      render: renderCoefficientCalculator
    },
    "friction-loss-per-100": {
      title: "Friction Loss / 100'",
      description: "Calculate hose friction loss per 100 feet at a known flow.",
      render: renderFrictionLossPerHundredCalculator
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

  function getHoseCoefficientValue(hose) {
    if (!hose) return null;
    if (typeof getActiveHoseCoefficient === "function") {
      return getActiveHoseCoefficient(hose.id);
    }
    return hose.coefficient;
  }

  function createSmoothboreTipSelect(id) {
    const tips = typeof getVisibleSmoothboreTipOptions === "function"
      ? getVisibleSmoothboreTipOptions(getSmoothboreTipOptions())
      : getSmoothboreTipOptions();
    const tipOptions = tips
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
    const visibleOptions = typeof getVisibleHoseOptions === "function"
      ? getVisibleHoseOptions(options, fallbackId)
      : options;

    return `
      <select id="${escapeHtml(id)}">
        ${visibleOptions.map(hose => `
          <option value="${escapeHtml(hose.id)}"${hose.id === fallbackId ? " selected" : ""}>${escapeHtml(hose.label)}</option>
        `).join("")}
      </select>
    `;
  }

  function getFrictionLossChartHoseOptions() {
    const hoseOptions = getHoseOptions().filter(hose => getHoseCoefficientValue(hose) > 0);
    return typeof getVisibleHoseOptions === "function"
      ? getVisibleHoseOptions(hoseOptions)
      : hoseOptions;
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

      <div id="smoothboreFlowResults" hidden></div>

      <details class="formula">
        <summary>Formula / Reference</summary>
        <p><strong>Flow: GPM = 29.7 &times; d<sup>2</sup> &times; &radic;NP</strong></p>
        <p><strong>Velocity: Velocity (ft/sec) = 0.408 &times; GPM / d<sup>2</sup></strong></p>
        <p><strong>Definitions:</strong></p>
        <ul>
          <li>d = tip diameter (inches)</li>
          <li>NP = nozzle pressure (PSI)</li>
          <li>GPM = calculated flow</li>
        </ul>
      </details>
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
      const velocity = 0.408 * gpm / (diameter * diameter);
      results.innerHTML = createResultRows([
        ["Flow", `${formatWhole(gpm)} GPM`],
        ["Stream Velocity", `${formatNumber(velocity, 1)} ft/sec`]
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

  function renderWaterShuttle() {
    const createTender = () => ({
      tankSize: "3000",
      dumpSceneTime: "",
      timeToHydrant: "",
      fillTime: "",
      timeToScene: ""
    });

    const tenderFields = [
      ["tankSize", "Tank Size", "Gallons", "decimal"],
      ["dumpSceneTime", "Dump / Scene Time", "Minutes", "decimal"],
      ["timeToHydrant", "Time to Hydrant", "Minutes", "decimal"],
      ["fillTime", "Fill Time", "Minutes", "decimal"],
      ["timeToScene", "Time to Scene", "Minutes", "decimal"]
    ];

    const tenders = [createTender()];

    calculatorBody.innerHTML = `
      <div class="field-calculator-form">
        <div class="field">
          <label for="waterShuttleTargetFlow">Target Flow</label>
          <input id="waterShuttleTargetFlow" type="text" inputmode="decimal" placeholder="500" />
        </div>
      </div>

      <div id="waterShuttleTenderList" class="field-calculator-body"></div>

      <div class="field-calculator-actions">
        <button id="waterShuttleAddTender" class="reset-button reference-open-button" type="button">
          Add Another Tender
        </button>
      </div>

      <div id="waterShuttleValidation" class="warnings field-calculator-warning" hidden></div>
      <div id="waterShuttleResults" hidden></div>
      <div id="waterShuttleBreakdown" class="field-calculator-section" hidden></div>

      <details class="formula">
        <summary>Formula / Reference</summary>
        <p>
          Water Shuttle Estimator calculates the sustained flow that one or more tenders can provide after arriving on
          scene full and beginning a shuttle cycle.
        </p>
        <p>Each tender is assumed to start full on scene.</p>
        <p>
          <strong>Tender Cycle Time</strong> = Dump / Scene Time + Time to Hydrant + Fill Time + Time to Scene
        </p>
        <p>
          <strong>Tender Sustained Flow</strong> = Tank Size ÷ Tender Cycle Time
        </p>
        <p>
          <strong>Total Sustained Shuttle Flow</strong> = Sum of all Tender Sustained Flows
        </p>
        <p>
          <strong>Surplus / Deficit</strong> = Total Sustained Shuttle Flow − Target Flow
        </p>
        <p>
          This estimate assumes the full entered tank size is delivered each trip. Actual usable water may be lower
          depending on apparatus design, dump-site setup, fill-site setup, operator efficiency, traffic, access,
          portable tank capacity, and local procedures.
        </p>
        <p>
          <strong>Reference basis:</strong> NFPA 1142 rural/suburban firefighting water-supply planning; sustained
          water supply concepts for fire department water shuttle operations.
        </p>
      </details>
    `;

    const targetFlow = document.getElementById("waterShuttleTargetFlow");
    const tenderList = document.getElementById("waterShuttleTenderList");
    const addTender = document.getElementById("waterShuttleAddTender");
    const validation = document.getElementById("waterShuttleValidation");
    const results = document.getElementById("waterShuttleResults");
    const breakdown = document.getElementById("waterShuttleBreakdown");

    const renderWarning = (title, copy) => {
      validation.hidden = false;
      validation.innerHTML = `
        <div class="warning-item">
          <span>!</span>
          <span><strong>${escapeHtml(title)}</strong><br>${escapeHtml(copy)}</span>
        </div>
      `;
    };

    const clearOutput = () => {
      validation.hidden = true;
      validation.innerHTML = "";
      results.hidden = true;
      results.innerHTML = "";
      breakdown.hidden = true;
      breakdown.innerHTML = "";
    };

    const renderTenderList = () => {
      tenderList.innerHTML = tenders.map((tender, index) => `
        <article class="field-calculator-section" data-water-shuttle-tender="${index}">
          <strong>Tender ${index + 1}</strong>
          <div class="field-calculator-form">
            ${tenderFields.map(([key, label, placeholder, inputMode]) => `
              <div class="field">
                <label for="waterShuttleTender${index}${key}">${escapeHtml(label)}</label>
                <input
                  id="waterShuttleTender${index}${key}"
                  type="text"
                  inputmode="${escapeHtml(inputMode)}"
                  placeholder="${escapeHtml(placeholder)}"
                  value="${escapeHtml(tender[key])}"
                  data-water-shuttle-index="${index}"
                  data-water-shuttle-field="${escapeHtml(key)}"
                />
              </div>
            `).join("")}
          </div>
          ${index > 0 ? `
            <div class="field-calculator-actions">
              <button class="reset-button reference-open-button" type="button" data-remove-water-shuttle-tender="${index}">
                Remove Tender
              </button>
            </div>
          ` : ""}
        </article>
      `).join("");
    };

    const getTenderValidation = tender => {
      const tankSize = numberOrNull(tender.tankSize);
      const dumpSceneTime = numberOrNull(tender.dumpSceneTime);
      const timeToHydrant = numberOrNull(tender.timeToHydrant);
      const fillTime = numberOrNull(tender.fillTime);
      const timeToScene = numberOrNull(tender.timeToScene);

      if (!(tankSize > 0)) {
        return { error: "Tank Size must be greater than 0 gallons." };
      }

      if (!(dumpSceneTime >= 0)) {
        return { error: "Dump / Scene Time must be greater than or equal to 0 minutes." };
      }

      if (!(timeToHydrant >= 0)) {
        return { error: "Time to Hydrant must be greater than or equal to 0 minutes." };
      }

      if (!(fillTime >= 0)) {
        return { error: "Fill Time must be greater than or equal to 0 minutes." };
      }

      if (!(timeToScene >= 0)) {
        return { error: "Time to Scene must be greater than or equal to 0 minutes." };
      }

      const cycleTime = dumpSceneTime + timeToHydrant + fillTime + timeToScene;
      if (!(cycleTime > 0)) {
        return { error: "Each tender cycle time must be greater than 0 minutes." };
      }

      return {
        tankSize,
        cycleTime,
        sustainedFlow: tankSize / cycleTime
      };
    };

    const update = () => {
      clearOutput();

      const targetGpm = numberOrNull(targetFlow.value);
      if (targetGpm === null && tenders.every(tender => (
        tender.tankSize === "3000" &&
        tender.dumpSceneTime === "" &&
        tender.timeToHydrant === "" &&
        tender.fillTime === "" &&
        tender.timeToScene === ""
      ))) {
        return;
      }

      if (!(targetGpm > 0)) {
        renderWarning("Check Target Flow", "Target Flow must be greater than 0 GPM.");
        return;
      }

      const tenderResults = [];
      for (let index = 0; index < tenders.length; index += 1) {
        const tenderResult = getTenderValidation(tenders[index]);
        if (tenderResult.error) {
          renderWarning(`Check Tender ${index + 1}`, tenderResult.error);
          return;
        }
        tenderResults.push(tenderResult);
      }

      const totalSustainedFlow = tenderResults.reduce((sum, tender) => sum + tender.sustainedFlow, 0);
      const surplusDeficit = totalSustainedFlow - targetGpm;
      const isMeetingTarget = surplusDeficit >= 0;

      results.hidden = false;
      results.innerHTML = createCompactResultCard("Water Shuttle Estimate", [
        ["Target Flow", `${formatWhole(targetGpm)} GPM`],
        ["Tenders", String(tenderResults.length)],
        ["Sustained Shuttle Flow", `${formatWhole(totalSustainedFlow)} GPM`],
        [isMeetingTarget ? "Surplus" : "Deficit", `${formatWhole(Math.abs(surplusDeficit))} GPM`],
        ["Status", isMeetingTarget ? "Meets Target" : "Below Target"]
      ]);

      breakdown.hidden = false;
      breakdown.innerHTML = `
        <strong>Tender Breakdown</strong>
        <div class="field-calculator-compact-results">
          ${tenderResults.map((tender, index) => `
            <div>
              <span>Tender ${index + 1}</span>
              <strong>${formatWhole(tender.tankSize)} gal / ${formatNumber(tender.cycleTime, 1)} min = ${formatWhole(tender.sustainedFlow)} GPM</strong>
            </div>
          `).join("")}
        </div>
      `;
    };

    tenderList.addEventListener("input", event => {
      const index = Number(event.target?.dataset?.waterShuttleIndex);
      const field = event.target?.dataset?.waterShuttleField;
      if (!Number.isInteger(index) || !field || !tenders[index]) return;
      tenders[index][field] = event.target.value;
      update();
    });

    tenderList.addEventListener("click", event => {
      const button = event.target.closest("[data-remove-water-shuttle-tender]");
      if (!button) return;

      const index = Number(button.dataset.removeWaterShuttleTender);
      if (!Number.isInteger(index) || index < 1 || !tenders[index]) return;

      tenders.splice(index, 1);
      renderTenderList();
      update();
    });

    addTender.addEventListener("click", () => {
      tenders.push(createTender());
      renderTenderList();
      update();
    });

    targetFlow.addEventListener("input", update);
    renderTenderList();
    update();
  }

  function renderCoefficientCalculator() {
    const coefficientHoseOptions = typeof getVisibleHoseOptions === "function"
      ? getVisibleHoseOptions(getHoseOptions())
      : getHoseOptions();
    const hoseOptions = coefficientHoseOptions
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

  function renderFrictionLossPerHundredCalculator() {
    const hoseOptions = getHoseOptions().filter(hose => getHoseCoefficientValue(hose) > 0);

    calculatorBody.innerHTML = `
      <div class="field-calculator-form">
        <div class="field">
          <label for="frictionLossPerHundredHoseSize">Hose Size</label>
          ${createHoseSelect("frictionLossPerHundredHoseSize", hoseOptions)}
        </div>

        <div class="field">
          <label for="frictionLossPerHundredCoefficient">Coefficient</label>
          <input id="frictionLossPerHundredCoefficient" type="text" inputmode="decimal" placeholder="C" />
        </div>

        <div class="field">
          <label for="frictionLossPerHundredFlow">GPM</label>
          <input id="frictionLossPerHundredFlow" type="text" inputmode="decimal" placeholder="GPM" />
        </div>
      </div>

      <div class="field-calculator-actions">
        <button id="calculateFrictionLossPerHundredButton" class="reset-button" type="button">Calculate</button>
      </div>

      <div id="frictionLossPerHundredResults" hidden></div>

      <details class="formula">
        <summary>Formula / Reference</summary>
        <p><strong>FL/100' = C &times; (GPM / 100)<sup>2</sup></strong></p>
        <p><strong>Where:</strong></p>
        <ul>
          <li>C = hose coefficient</li>
          <li>GPM = flow in gallons per minute</li>
        </ul>
      </details>
    `;

    const hoseSize = document.getElementById("frictionLossPerHundredHoseSize");
    const coefficient = document.getElementById("frictionLossPerHundredCoefficient");
    const flow = document.getElementById("frictionLossPerHundredFlow");
    const calculateButton = document.getElementById("calculateFrictionLossPerHundredButton");
    const results = document.getElementById("frictionLossPerHundredResults");

    const getSelectedHose = () =>
      hoseOptions.find(hose => hose.id === hoseSize.value) || null;

    const syncCoefficient = () => {
      const selectedHose = getSelectedHose();
      const selectedCoefficient = getHoseCoefficientValue(selectedHose);
      coefficient.value = selectedCoefficient > 0
        ? formatNumber(selectedCoefficient, selectedCoefficient < 1 ? 2 : 1)
        : "";
      results.hidden = true;
    };

    const calculate = () => {
      const selectedHose = getSelectedHose();
      const coefficientValue = numberOrNull(coefficient.value);
      const gpm = numberOrNull(flow.value);
      const isValid = selectedHose && coefficientValue > 0 && gpm >= 0;

      results.hidden = !isValid;
      if (!isValid) return;

      const frictionLoss = coefficientValue * Math.pow(gpm / 100, 2);

      results.innerHTML = createResultRows([
        ["Friction Loss / 100'", `${formatNumber(frictionLoss, 1)} PSI`],
        ["Hose Size", selectedHose.label],
        ["Coefficient Used", formatNumber(coefficientValue, coefficientValue < 1 ? 2 : 1)],
        ["GPM Used", `${formatNumber(gpm, 0)} GPM`]
      ]);
    };

    hoseSize.addEventListener("change", syncCoefficient);
    calculateButton.addEventListener("click", calculate);
    syncCoefficient();
  }

  function renderWaterVelocity() {
    const waterVelocityHoseOptions = typeof getVisibleHoseOptions === "function"
      ? getVisibleHoseOptions(getHoseOptions().filter(hose => Number(hose.id) > 0), "2.5")
      : getHoseOptions().filter(hose => Number(hose.id) > 0);
    const hoseOptions = waterVelocityHoseOptions
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

  function renderEstimatedRemainingSupply() {
    calculatorBody.innerHTML = `
      <div class="field-calculator-form">
        <div class="field">
          <label for="remainingSupplyStaticPressure">Static Pressure</label>
          <input id="remainingSupplyStaticPressure" type="text" inputmode="decimal" placeholder="80" />
        </div>

        <div class="field">
          <label for="remainingSupplyResidualPressure">Residual Pressure</label>
          <input id="remainingSupplyResidualPressure" type="text" inputmode="decimal" placeholder="50" />
        </div>

        <div class="field">
          <label for="remainingSupplyCurrentFlow">Current Flow</label>
          <input id="remainingSupplyCurrentFlow" type="text" inputmode="decimal" placeholder="1000" />
        </div>

        <div class="field">
          <label for="remainingSupplyTargetResidual">Target Residual</label>
          <select id="remainingSupplyTargetResidual">
            <option value="20" selected>20 psi — Standard Reference</option>
            <option value="10">10 psi — Aggressive Estimate</option>
            <option value="0">0 psi — Theoretical Estimate</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div id="remainingSupplyCustomTargetField" class="field" hidden>
          <label for="remainingSupplyCustomTarget">Custom Target Residual</label>
          <input id="remainingSupplyCustomTarget" type="text" inputmode="decimal" placeholder="psi" />
        </div>
      </div>

      <div id="remainingSupplyValidation" class="warnings field-calculator-warning" hidden></div>
      <div id="remainingSupplyCaution" class="warnings field-calculator-warning" hidden></div>
      <div id="remainingSupplyResults" hidden></div>
      <div id="remainingSupplyTargetWarning" class="warnings field-calculator-warning" hidden></div>

      <details class="formula">
        <summary>Formula / Reference</summary>
        <p>
          Estimated Remaining Supply uses the standard hydrant-flow projection method to estimate how much additional
          flow may be available at a selected residual pressure.
        </p>
        <p>
          <strong>Estimated Flow</strong> = Current Flow × ((Static Pressure − Target Residual) / (Static Pressure − Current Residual)) ^ 0.54
        </p>
        <p>
          <strong>Estimated Remaining Supply</strong> = Estimated Flow − Current Flow
        </p>
        <p>
          The 0.54 exponent comes from the Hazen-Williams relationship commonly used in hydrant flow-test calculations.
          The default target residual is 20 psi because available fire flow is commonly evaluated at 20 psi residual
          pressure.
        </p>
        <p>
          Targets below 20 psi are aggressive fireground estimates and should not be treated as standard available
          fire-flow ratings.
        </p>
        <p>
          <strong>Reference basis:</strong> NFPA 291 hydrant flow-test guidance; Hazen-Williams available fire-flow
          projection; 20 psi residual fire-flow reference.
        </p>
      </details>
    `;

    const staticPressure = document.getElementById("remainingSupplyStaticPressure");
    const residualPressure = document.getElementById("remainingSupplyResidualPressure");
    const currentFlow = document.getElementById("remainingSupplyCurrentFlow");
    const targetResidual = document.getElementById("remainingSupplyTargetResidual");
    const customTargetField = document.getElementById("remainingSupplyCustomTargetField");
    const customTarget = document.getElementById("remainingSupplyCustomTarget");
    const validation = document.getElementById("remainingSupplyValidation");
    const caution = document.getElementById("remainingSupplyCaution");
    const results = document.getElementById("remainingSupplyResults");
    const targetWarning = document.getElementById("remainingSupplyTargetWarning");

    const renderWarning = (element, title, copy) => {
      element.hidden = false;
      element.innerHTML = `
        <div class="warning-item">
          <span>!</span>
          <span><strong>${escapeHtml(title)}</strong><br>${escapeHtml(copy)}</span>
        </div>
      `;
    };

    const clearWarning = element => {
      element.hidden = true;
      element.innerHTML = "";
    };

    const getTargetResidual = () => {
      return targetResidual.value === "custom"
        ? numberOrNull(customTarget.value)
        : numberOrNull(targetResidual.value);
    };

    const update = () => {
      customTargetField.hidden = targetResidual.value !== "custom";
      clearWarning(validation);
      clearWarning(caution);
      clearWarning(targetWarning);
      results.hidden = true;
      results.innerHTML = "";

      const staticPsi = numberOrNull(staticPressure.value);
      const residualPsi = numberOrNull(residualPressure.value);
      const flowGpm = numberOrNull(currentFlow.value);
      const targetPsi = getTargetResidual();

      if (staticPsi === null && residualPsi === null && flowGpm === null && targetResidual.value !== "custom") {
        return;
      }

      if (!(staticPsi > 0)) {
        renderWarning(validation, "Check Static Pressure", "Static Pressure must be greater than 0 psi.");
        return;
      }

      if (!(residualPsi >= 0)) {
        renderWarning(validation, "Check Residual Pressure", "Residual Pressure must be greater than or equal to 0 psi.");
        return;
      }

      if (!(flowGpm > 0)) {
        renderWarning(validation, "Check Current Flow", "Current Flow must be greater than 0 GPM.");
        return;
      }

      if (!(targetPsi >= 0)) {
        renderWarning(validation, "Check Target Residual", "Target Residual must be greater than or equal to 0 psi.");
        return;
      }

      if (!(staticPsi > residualPsi)) {
        renderWarning(validation, "Check Pressure Drop", "Static Pressure must be greater than Residual Pressure.");
        return;
      }

      if (!(staticPsi > targetPsi)) {
        renderWarning(validation, "Check Target Residual", "Static Pressure must be greater than Target Residual.");
        return;
      }

      const pressureDrop = staticPsi - residualPsi;
      if (pressureDrop <= 5) {
        renderWarning(caution, "Small Pressure Drop", "This estimate is less reliable when the static-to-residual pressure drop is about 5 psi or less.");
      }

      const projectedFlow = flowGpm * Math.pow((staticPsi - targetPsi) / pressureDrop, 0.54);
      const remainingSupply = projectedFlow - flowGpm;

      if (!(remainingSupply >= 0)) {
        renderWarning(validation, "No Additional Supply", "The selected target residual does not support additional flow based on the entered data.");
        return;
      }

      results.hidden = false;
      results.innerHTML = createCompactResultCard("Estimated Remaining Supply", [
        ["Current Flow", `${formatWhole(flowGpm)} GPM`],
        ["Target Residual", `${formatNumber(targetPsi, 0)} psi`],
        ["Estimated Remaining Supply", `${formatWhole(remainingSupply)} GPM`]
      ]);

      if (targetPsi === 0) {
        renderWarning(
          targetWarning,
          "Theoretical Estimate",
          "A 0 psi residual target represents a theoretical projection to complete pressure depletion. This is not a standard available fire-flow rating and should only be used as an aggressive fireground estimate."
        );
      } else if (targetPsi < 20) {
        renderWarning(
          targetWarning,
          "Aggressive Estimate",
          "Residual targets below 20 psi are not standard available fire-flow reference points. This estimate may be useful for fireground decision-making, but should not be treated as a rated available fire flow. Use department policy, water-system guidance, and pump operator judgment."
        );
      }
    };

    [staticPressure, residualPressure, currentFlow, targetResidual, customTarget].forEach(input => {
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
