(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    let storage;
    try { storage = root.localStorage; } catch {}
    api.bind(root.document, root.ReverseFlowUnits, storage);
    try {
      const saved = root.ReverseFlowToolUnits?.pending(root.sessionStorage);
      if (saved && new URL(root.document.referrer).pathname.endsWith("/tools.html")) {
        root.document.querySelectorAll('a[href="tools.html"]').forEach(link => {
          link.href = `tools.html?calculator=${encodeURIComponent(saved.toolId)}`;
        });
      }
    } catch {}
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function bind(document, units, storage) {
    const section = document.getElementById("unitPreferences");
    if (!section) return;
    const store = units.createPreferenceStore(storage);
    const controls = [...section.querySelectorAll("input[data-unit-preference]")];
    const metricOptions = document.getElementById("metricUnitPreferences");
    const status = document.getElementById("unitPreferenceStatus");
    let preference = store.get();
    function render() {
      controls.forEach(control => { control.checked = preference[control.name] === control.value; });
      metricOptions.hidden = preference.unitSystem !== "metric";
    }
    controls.forEach(control => control.addEventListener("change", () => {
      if (!control.checked) return;
      try {
        preference = store.save({ ...preference, [control.name]: control.value });
        status.textContent = "";
      } catch {
        status.textContent = "Unable to save unit preferences. Please try again.";
      }
      render();
    }));
    render();
  }
  return { bind };
});
