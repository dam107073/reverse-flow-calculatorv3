    // ========================================
// APP CONFIG
// ========================================

const APP_VERSION = "1.0.3";
    const BUILD_DATE = "2026-06-08";

    const REVERSE_FLOW_PRO_PRODUCT_ID =
	  "reverse_flow_pro_lifetime";
	
	  let reverseFlowProProductReady = false;
	  let reverseFlowProStoreInitialized = false;
	  let reverseFlowProLoadTimeout = null;
	  let reverseFlowRestoreInProgress = false;

const STORAGE_KEY = "reverse-flow-calculator-v3";
const PRESETS_KEY = "reverse-flow-calculator-presets-v1";
const HOSE_COEFFS_KEY = "reverse-flow-hose-coefficients-v1";
const HOSE_LIBRARY_SELECTIONS_KEY =
  "reverse-flow-hose-library-selections-v1";
const DEFAULT_HOSE_PROFILES_KEY = "reverseFlowDefaultHoseProfiles";
const CUSTOM_HOSE_PROFILES_KEY = "reverseFlowCustomHoseProfiles";
const THEME_PREFERENCE_KEY = "reverse-flow-theme-preference-v1";
const PRO_ENTITLEMENT_STORAGE_KEY =
  "reverse-flow-pro-entitlement-v1";

  function getReverseFlowPurchasePlatform() {
  if (!window.CdvPurchase || !window.Capacitor) {
    return null;
  }

  const platform = window.CdvPurchase.Platform;
  const capacitorPlatform = window.Capacitor.getPlatform?.();

  if (capacitorPlatform === "android") {
    return platform.GOOGLE_PLAY;
  }

  if (capacitorPlatform === "ios") {
    return platform.APPLE_APPSTORE;
  }

  return null;
}
