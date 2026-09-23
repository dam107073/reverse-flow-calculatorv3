(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowSettingsSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KEY = "reverse-flow-settings-return-session-v1";
  // A one-use, same-tab Settings return. This is not hydraulic persistence or a
  // change to the normal fresh-launch contract. No localStorage writes occur.
  function capture(storage, state, activePumpChartEdit, presentation) {
    storage.setItem(KEY, JSON.stringify({ version: 1, state, activePumpChartEdit, presentation }));
  }
  function clear(storage) {
    try { storage.removeItem(KEY); } catch {}
  }
  function take(storage, validModes) {
    try {
      const saved = JSON.parse(storage.getItem(KEY));
      clear(storage);
      if (saved?.version !== 1 || !saved.state || !validModes.has(saved.state.mode)) return null;
      for (const field of ["splitLay", "standpipeOps", "wyeOps"]) {
        if (!saved.state[field] || typeof saved.state[field] !== "object") return null;
      }
      return saved;
    } catch { clear(storage); return null; }
  }
  return Object.freeze({ KEY, capture, take, clear });
});
