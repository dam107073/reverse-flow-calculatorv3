    // ========================================
// APP CONFIG
// ========================================

const APP_VERSION = "2.0";
const APP_BUILD_NUMBERS = Object.freeze({
  ios: "6",
  android: "144"
});
    const BUILD_DATE = "2026-07-24";

    const REVERSE_FLOW_PRO_PRODUCT_ID =
	  "reverse_flow_pro_lifetime";
const IAP_DEBUG_DIAGNOSTICS = false;
	
	  let reverseFlowProProductReady = false;
	  let reverseFlowProStoreInitialized = false;
	  let reverseFlowProLoadTimeout = null;
	  let reverseFlowRestoreInProgress = false;
	  let reverseFlowPurchaseInProgress = false;

const STORAGE_KEY = "reverse-flow-calculator-v3";
const PRESETS_KEY = "reverse-flow-calculator-presets-v1";
const PUMP_CHARTS_KEY = "reverse-flow-pump-charts-v2";
const LAST_VIEWED_PUMP_CHART_KEY = "reverse-flow-last-viewed-pump-chart-v1";
const HOSE_COEFFS_KEY = "reverse-flow-hose-coefficients-v1";
const HOSE_LIBRARY_SELECTIONS_KEY =
  "reverse-flow-hose-library-selections-v1";
const DEFAULT_HOSE_PROFILES_KEY = "reverseFlowDefaultHoseProfiles";
const CUSTOM_HOSE_PROFILES_KEY = "reverseFlowCustomHoseProfiles";
const VISIBLE_HOSE_SIZES_KEY = "visibleHoseSizes";
const VISIBLE_SMOOTHBORE_TIPS_KEY = "visibleSmoothboreTips";
const VISIBLE_SMOOTHBORE_TIPS_MIGRATION_KEY =
  "visibleSmoothboreTipsMigrationVersion";
const APPEARANCE_PREFERENCE_KEY = "reverse-flow-appearance-preference";
const PRO_ENTITLEMENT_STORAGE_KEY =
  "reverse-flow-pro-entitlement-v1";
const SUPPORTER_CACHE_STORAGE_KEY =
  "reverse-flow-supporter-cache-v1";
const SUPPORTER_API_ENVIRONMENT = "production";
const SUPPORTER_API_CONFIG = Object.freeze({
  environment: SUPPORTER_API_ENVIRONMENT,
  baseUrls: Object.freeze({
    production: "https://reverse-flow.app"
  }),
  routes: Object.freeze({
    environment: "/api/supporters/environment",
    claimSupporter: "/api/supporters/claim-supporter",
    status: "/api/supporters/status"
  }),
  timeoutsMs: Object.freeze({
    environment: 10000,
    claimSupporter: 15000,
    status: 10000
  })
});

const SUPPORT_PRODUCT_CONFIG = Object.freeze({
  apple: Object.freeze({
    oneTime5: Object.freeze({
      productId: "reverse_flow_support_one_time_5",
      productType: "consumable"
    }),
    monthly3: Object.freeze({
      productId: "support_reverse_flow_monthly_3",
      productType: "paid subscription",
      subscriptionGroupId: "22260570",
      subscriptionLevel: 2
    }),
    monthly10: Object.freeze({
      productId: "support_reverse_flow_monthly_10",
      productType: "paid subscription",
      subscriptionGroupId: "22260570",
      subscriptionLevel: 1
    })
  }),
  google: Object.freeze({
    oneTime5: Object.freeze({
      productId: "reverse_flow_support_one_time_5",
      productType: "consumable",
      purchaseOptionId: "buy"
    }),
    monthly3: Object.freeze({
      productId: "support_reverse_flow_subscription",
      productType: "paid subscription",
      basePlanId: "monthly-3"
    }),
    monthly10: Object.freeze({
      productId: "support_reverse_flow_subscription",
      productType: "paid subscription",
      basePlanId: "monthly-10"
    })
  })
});

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
