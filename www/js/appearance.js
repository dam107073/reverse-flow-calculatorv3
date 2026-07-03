(function () {
  const STORAGE_KEY = "reverse-flow-appearance-preference";
  const VALID_PREFERENCES = ["system", "light", "dark"];
  const DARK_QUERY = "(prefers-color-scheme: dark)";

  function getStoredAppearancePreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return VALID_PREFERENCES.includes(stored) ? stored : "system";
    } catch (error) {
      return "system";
    }
  }

  function getSystemResolvedTheme() {
    return window.matchMedia &&
      window.matchMedia(DARK_QUERY).matches
      ? "dark"
      : "light";
  }

  function resolveAppearanceTheme(preference) {
    if (preference === "light" || preference === "dark") {
      return preference;
    }

    return getSystemResolvedTheme();
  }

  function applyAppearancePreference(preference = getStoredAppearancePreference()) {
    const normalizedPreference = VALID_PREFERENCES.includes(preference)
      ? preference
      : "system";
    const resolvedTheme = resolveAppearanceTheme(normalizedPreference);

    document.documentElement.dataset.appearancePreference = normalizedPreference;
    document.documentElement.dataset.resolvedTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;

    return {
      preference: normalizedPreference,
      resolvedTheme
    };
  }

  function saveAppearancePreference(preference) {
    const normalizedPreference = VALID_PREFERENCES.includes(preference)
      ? preference
      : "system";

    try {
      localStorage.setItem(STORAGE_KEY, normalizedPreference);
    } catch (error) {
      // Appearance remains usable for the current session even if persistence fails.
    }

    return applyAppearancePreference(normalizedPreference);
  }

  applyAppearancePreference();

  if (window.matchMedia) {
    const mediaQuery = window.matchMedia(DARK_QUERY);
    const handleSystemAppearanceChange = () => {
      if (getStoredAppearancePreference() === "system") {
        applyAppearancePreference("system");
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemAppearanceChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleSystemAppearanceChange);
    }
  }

  window.ReverseFlowAppearance = {
    getPreference: getStoredAppearancePreference,
    apply: applyAppearancePreference,
    save: saveAppearancePreference,
    options: VALID_PREFERENCES.slice()
  };
})();
