(function (root, factory) {
  const api = factory(root, typeof module === "object" && module.exports ? require("./units") : root.ReverseFlowUnits,
    typeof module === "object" && module.exports ? require("./required-pdp-units") : root.ReverseFlowOperationalUnits);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowToolUnits = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root, U, B) {
  "use strict";
  const SESSION_KEY = "reverse-flow-tool-settings-return-v1";
  const toolIds = ["smoothbore-flow", "nozzle-reaction", "water-velocity", "tank-time", "water-shuttle", "estimated-remaining-supply", "coefficient", "friction-loss-per-100", "friction-loss-chart"];
  function edit(text, quantity, preference) {
    if (preference.unitSystem === "metric") return B.parseQuantityEdit(text, { quantity }, preference);
    const raw = String(text);
    return { valid: raw === "" || Number.isFinite(Number(raw)), canonical: raw, text: raw };
  }
  function pending(storage) {
    try {
      const value = JSON.parse(storage.getItem(SESSION_KEY));
      return value?.version === 1 && toolIds.includes(value.toolId) && value.values && value.selections ? value : null;
    } catch { return null; }
  }
  function bind(toolId, body, fields, hoses = [], lifecycle = {}) {
    let storage, session;
    try { storage = root.localStorage; } catch {}
    try { session = root.sessionStorage; } catch {}
    const store = U.createPreferenceStore(storage);
    let preference = store.get(), result = null, update;
    const values = {}, selections = {}, lastText = {};
    const controls = Object.keys(fields).map(id => body.querySelector(`#${id}`));
    const selects = [...body.querySelectorAll("select")];
    const labels = new Map(controls.map(input => [input, {
      placeholder: input.placeholder,
      label: body.querySelector(`label[for="${input.id}"]`),
      text: body.querySelector(`label[for="${input.id}"]`)?.textContent
    }]));
    const options = [...body.querySelectorAll("option")].map(option => ({ option, text: option.textContent }));
    controls.forEach(input => { values[input.id] = input.value; });
    selects.forEach(select => { selections[select.id] = select.value; });
    Object.assign(values, lifecycle.defaults?.(preference) || {});
    const saved = pending(session);
    try {
      // A fresh launch keeps the original empty-tool contract. Only a scoped
      // same-tab return from Settings consumes this transient canonical state.
      const fromSettings = root.document.referrer && new URL(root.document.referrer).pathname.endsWith("/settings.html");
      const historyReturn = root.performance?.getEntriesByType("navigation")[0]?.type === "back_forward";
      if (saved?.toolId === toolId && (fromSettings || historyReturn)) {
        if (saved.extra !== undefined) lifecycle.restore?.(saved.extra);
        for (const id of Object.keys(values)) if (Object.hasOwn(saved.values, id)) values[id] = saved.values[id];
        selects.forEach(select => {
          if ([...select.options].some(o => o.value === saved.selections[select.id])) select.value = saved.selections[select.id];
          selections[select.id] = select.value;
        });
      }
    } catch {}
    try { session?.removeItem(SESSION_KEY); } catch {}
    function renderInputs() {
      const metric = preference.unitSystem === "metric";
      controls.forEach(input => {
        const value = values[input.id];
        input.value = value === null ? "" : metric ? lifecycle.decimalFields?.includes(input.id) && value !== "" ? U.formatNumber(U.fromCanonical(Number(value), fields[input.id], preference), 12) : B.number(value, fields[input.id], preference) : String(value);
        lastText[input.id] = input.value;
        const label = labels.get(input);
        input.placeholder = metric ? U.displayUnit(fields[input.id], preference) : label.placeholder;
        if (label.label) label.label.textContent = metric ? `${label.text} (${U.displayUnit(fields[input.id], preference)})` : label.text;
        input.setAttribute("aria-label", `${label.text || (fields[input.id] === "flow" ? "Rated Flow" : "Rated Pressure")} (${U.displayUnit(fields[input.id], preference)})`);
      });
      options.forEach(({ option, text }) => {
        // Physical tips and factory hose categories deliberately use distinct APIs.
        const hose = ["waterVelocityHoseId", "coefficientHoseSize", "frictionLossPerHundredHoseSize"].includes(option.parentElement.id) ? hoses.find(h => h.id === option.value) : null;
        const quantity = option.dataset.unitQuantity;
        const suffix = text.includes(" — ") ? " — " + text.split(" — ").slice(1).join(" — ") : "";
        option.textContent = !metric ? text : quantity ? B.format(Number(option.value), quantity, preference) + suffix : option.dataset.diameter ? U.physicalDiameterLabel(Number(option.dataset.diameter), preference) : hose ? U.factoryHoseLabel(hose, preference) : text;
      });
      lifecycle.render?.();
    }
    const api = {
      preference: () => ({ ...preference }),
      referenceFeet: () => referenceFeet(preference),
      referencePressure: value => referencePressure(value, preference),
      metric: () => preference.unitSystem === "metric",
      read: input => values[input.id] === "" ? null : values[input.id] === null ? NaN : Number(values[input.id]),
      edit: (text, quantity) => edit(text, quantity, preference),
      number: (value, quantity) => api.metric() ? B.number(value, quantity, preference) : String(value ?? ""),
      warning: text => !api.metric() ? text : text.replace(/(\d+(?:\.\d+)?) (psi|GPM|gallons)\b/g,
        (_, value, unit) => B.format(value, { psi: "pressure", GPM: "flow", gallons: "volume" }[unit], preference)),
      format: (value, quantity) => B.format(value, quantity, preference),
      display: (value, quantity, usText) => api.metric() ? B.format(value, quantity, preference) : usText,
      result: value => { result = value; },
      snapshot: () => JSON.parse(JSON.stringify({ toolId, values, selections, result, ...(lifecycle.snapshot ? { extra: lifecycle.snapshot() } : {}) })),
      refresh() {
        const next = store.get();
        if (JSON.stringify(next) === JSON.stringify(preference)) return;
        preference = next;
        renderInputs();
        update();
      },
      start(calculate) {
        update = calculate;
        controls.forEach(input => {
          const onEdit = () => {
            // Browsers emit change after input. Never reparse a rounded rerender.
            if (input.value === lastText[input.id]) return;
            lastText[input.id] = input.value;
            const parsed = api.metric() && lifecycle.decimalFields?.includes(input.id)
              ? B.parseQuantityEdit(input.value, { quantity: fields[input.id], decimal: true }, preference)
              : edit(input.value, fields[input.id], preference);
            values[input.id] = parsed.valid ? parsed.canonical : null;
            if (!lifecycle.manual) update();
          };
          input.addEventListener("input", onEdit);
          input.addEventListener("change", onEdit);
        });
        selects.forEach(select => {
          const onSelect = () => { selections[select.id] = select.value; if (!lifecycle.manual) update(); };
          select.addEventListener("input", onSelect);
          select.addEventListener("change", onSelect);
        });
        root.document.querySelectorAll('a[href="settings.html"]').forEach(link => link.addEventListener("click", () => {
          try { session.setItem(SESSION_KEY, JSON.stringify({ version: 1, ...api.snapshot() })); } catch {}
        }));
        root.addEventListener("storage", api.refresh);
        root.addEventListener("pageshow", () => {
          try { session?.removeItem(SESSION_KEY); } catch {}
          // History restoration can restore old displayed form values after
          // pageshow. Repaint from canonical state after that browser step.
          root.setTimeout(() => { api.refresh(); renderInputs(); update(); }, 0);
        });
        renderInputs();
        update();
        // Read-only numeric snapshot also supports regression inspection.
        root.ReverseFlowActiveTool = Object.freeze({ snapshot: api.snapshot, refresh: api.refresh });
      }
    };
    return api;
  }
  // Reference distance is a product convention, not a new conversion constant.
  function referenceFeet(preference) {
    return preference.unitSystem === "metric" ? U.metresToFeet(30) : 100;
  }
  function referencePressure(value, preference, withUnit = true) {
    const converted = U.fromCanonical(value, "pressure", preference);
    const digits = preference.metricPressureUnit === "kpa" ? 1 : 3;
    // Three bar decimals / one kPa decimal normally; retain tiny positive losses
    // with three significant digits rather than presenting a false zero.
    const rounded = converted.toFixed(digits);
    const text = converted !== 0 && Number(rounded) === 0 ? converted.toPrecision(3) : rounded;
    return withUnit ? `${text} ${U.displayUnit("pressure", preference)}` : text;
  }
  function chartData(hoses, preference, hydraulics) {
    const metric = preference.unitSystem === "metric", lengthFeet = referenceFeet(preference);
    return { lengthFeet, hoses: hoses.map(hose => ({ ...hose })), rows: Array.from({ length: 21 }, (_, index) => {
      const displayFlow = index * (metric ? 200 : 50);
      const flowGpm = U.toCanonical(displayFlow, "flow", preference);
      return { displayFlow, flowGpm, lossesPsi: hoses.map(hose => hydraulics.frictionLoss(hose.coefficient, flowGpm, lengthFeet)) };
    }) };
  }
  return Object.freeze({ edit, bind, pending, SESSION_KEY, referenceFeet, referencePressure, chartData });
});
