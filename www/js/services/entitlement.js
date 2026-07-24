// ========================================
// ACCESS CONTROL
// ========================================

const ACCESS_LEVELS = {
  BASIC: "basic",
  PRO: "pro",
};

const ACCESS_LEVEL_STORAGE_KEY =
  "reverse-flow-access-level";

const LEGACY_ENTITLEMENT_SOURCES = Object.freeze({
  STOREKIT2_CURRENT_ENTITLEMENTS: "storekit2-current-entitlements",
  CORDOVA_VERIFIED_RECEIPT: "cordova-verified-receipt",
  CORDOVA_OWNED_PRODUCT: "cordova-owned-product",
  GOOGLE_OWNED_PURCHASE: "google-owned-purchase",
  PERSISTED_VERIFIED_LEGACY_CACHE: "persisted-verified-legacy-cache",
  OLD_PRO_STORAGE_MIGRATION: "old-pro-storage-migration",
  MANUAL_STORE_SYNC: "manual-store-sync",
  TEST_FIXTURE: "test-fixture"
});
const LEGACY_ENTITLEMENT_SOURCE_VALUES =
  new Set(Object.values(LEGACY_ENTITLEMENT_SOURCES));

let userAccessLevel = ACCESS_LEVELS.BASIC;

function logLegacyEntitlementStateChanged(eligible, source) {
  console.info("[Reverse Flow Legacy Entitlement]", {
    event: "legacy-entitlement-state-changed",
    eligible: eligible === true,
    source,
    productId: REVERSE_FLOW_PRO_PRODUCT_ID
  });
}

function logProAccessEvent(event, details = {}) {
  console.info("[Reverse Flow Pro Access]", {
    event,
    accessLevel: userAccessLevel,
    ...details
  });
}

function isValidStoredProEntitlement(entitlement) {
  return (
    entitlement &&
    entitlement.access === ACCESS_LEVELS.PRO &&
    entitlement.source === "purchase" &&
    entitlement.productId === REVERSE_FLOW_PRO_PRODUCT_ID &&
    typeof entitlement.verifiedAt === "string" &&
    Number.isFinite(Date.parse(entitlement.verifiedAt))
  );
}

function loadStoredAccessLevel() {
  try {
    const entitlement = JSON.parse(
      localStorage.getItem(PRO_ENTITLEMENT_STORAGE_KEY) || "null"
    );

    if (isValidStoredProEntitlement(entitlement)) {
      logLegacyEntitlementStateChanged(
        true,
        LEGACY_ENTITLEMENT_SOURCES.PERSISTED_VERIFIED_LEGACY_CACHE
      );
      console.info("[Reverse Flow Pro Access]", {
        event: "stored-entitlement-granted",
        source: LEGACY_ENTITLEMENT_SOURCES.PERSISTED_VERIFIED_LEGACY_CACHE,
        productId: entitlement.productId,
        verifiedAt: entitlement.verifiedAt
      });
      return ACCESS_LEVELS.PRO;
    }
  } catch (error) {
    console.warn("[Reverse Flow Pro Access]", {
      event: "stored-entitlement-read-failed",
      error
    });
  }

  if (localStorage.getItem(ACCESS_LEVEL_STORAGE_KEY) === ACCESS_LEVELS.PRO) {
    console.warn("[Reverse Flow Pro Access]", {
      event: "legacy-pro-storage-ignored",
      source: "stored entitlement",
      productId: null,
      reason: "missing verified product entitlement"
    });
    localStorage.removeItem(ACCESS_LEVEL_STORAGE_KEY);
  }

  localStorage.removeItem(PRO_ENTITLEMENT_STORAGE_KEY);
  localStorage.setItem(ACCESS_LEVEL_STORAGE_KEY, ACCESS_LEVELS.BASIC);
  return ACCESS_LEVELS.BASIC;
}

userAccessLevel = loadStoredAccessLevel();

function isProUser() {
  return userAccessLevel === ACCESS_LEVELS.PRO;
}

// Legacy purchase state is retained only as evidence that the user may claim
// permanent Supporter status. It must never be used for feature access.
function hasLegacyProEntitlement() {
  return isProUser();
}

function getLegacyProEntitlementEvidence() {
  try {
    const entitlement = JSON.parse(
      localStorage.getItem(PRO_ENTITLEMENT_STORAGE_KEY) || "null"
    );
    return isValidStoredProEntitlement(entitlement) ? entitlement : null;
  } catch {
    return null;
  }
}

function getLegacyProStoreTransactions() {
  const store = window.CdvPurchase?.store;
  const transactions = [];
  const append = values => {
    if (!Array.isArray(values)) return;
    values.forEach(value => {
      if (value && !transactions.includes(value)) transactions.push(value);
    });
  };

  append(store?.localTransactions);
  (store?.localReceipts || []).forEach(receipt => append(receipt?.transactions));
  (store?.verifiedReceipts || []).forEach(receipt => {
    append(receipt?.transactions);
    append(receipt?.sourceReceipt?.transactions);
  });
  return transactions;
}

function transactionContainsLegacyProduct(transaction) {
  return Array.isArray(transaction?.products) &&
    transaction.products.some(product => product?.id === REVERSE_FLOW_PRO_PRODUCT_ID);
}

function toIsoTimestamp(value) {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : Number(value);
  const date = Number.isFinite(timestamp)
    ? new Date(timestamp < 100000000000 ? timestamp * 1000 : timestamp)
    : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function collectLegacyProEntitlementEvidence() {
  const stored = getLegacyProEntitlementEvidence() || {};
  const platform = window.Capacitor?.getPlatform?.() || stored.platform || "web";
  const candidates = getLegacyProStoreTransactions()
    .filter(transactionContainsLegacyProduct)
    .sort((left, right) => {
      const leftTime = new Date(left?.purchaseDate || 0).getTime() || 0;
      const rightTime = new Date(right?.purchaseDate || 0).getTime() || 0;
      return leftTime - rightTime;
    });
  const transaction = candidates[0] || {};
  const nativePurchase = transaction?.nativePurchase || {};
  const purchaseTimestamp =
    toIsoTimestamp(transaction?.purchaseDate) ||
    toIsoTimestamp(nativePurchase?.purchaseTime) ||
    stored.originalPurchaseTimestamp ||
    stored.purchaseTimestamp ||
    null;

  return {
    productId: stored.productId || REVERSE_FLOW_PRO_PRODUCT_ID,
    platform,
    owned: hasLegacyProEntitlement(),
    originalTransactionId:
      transaction?.originalTransactionId ||
      stored.originalTransactionId ||
      transaction?.transactionId ||
      null,
    transactionId: transaction?.transactionId || stored.transactionId || null,
    purchaseToken:
      transaction?.purchaseId ||
      nativePurchase?.purchaseToken ||
      stored.purchaseToken ||
      null,
    originalPurchaseTimestamp: purchaseTimestamp,
    purchaseTimestamp,
    environment: stored.environment || null,
    sandbox: stored.sandbox === true ? true : null,
    isAcknowledged:
      typeof transaction?.isAcknowledged === "boolean"
        ? transaction.isAcknowledged
        : stored.isAcknowledged,
    purchaseState: transaction?.state || nativePurchase?.getPurchaseState || stored.purchaseState || null,
    orderId: nativePurchase?.orderId || transaction?.transactionId || stored.orderId || null,
    packageName: nativePurchase?.packageName || stored.packageName || null,
    obfuscatedAccountId: nativePurchase?.accountId || stored.obfuscatedAccountId || null,
    obfuscatedProfileId: nativePurchase?.profileId || stored.obfuscatedProfileId || null,
    appAccountToken: transaction?.appAccountToken || stored.appAccountToken || null,
    signedTransaction: transaction?.jwsRepresentation || null
  };
}

let legacyPurchaseRecoveryInFlight = null;

function getLegacyPurchaseStorePlatform() {
  const purchases = window.CdvPurchase;
  const platform = window.Capacitor?.getPlatform?.();
  if (platform === "ios") return purchases?.Platform?.APPLE_APPSTORE || null;
  if (platform === "android") return purchases?.Platform?.GOOGLE_PLAY || null;
  return null;
}

function storeOwnsLegacyProProduct(store, storePlatform) {
  const product = typeof store?.get === "function" && storePlatform
    ? store.get(REVERSE_FLOW_PRO_PRODUCT_ID, storePlatform)
    : null;
  return (
    (typeof store?.owned === "function" &&
      store.owned(REVERSE_FLOW_PRO_PRODUCT_ID) === true) ||
    (product?.id === REVERSE_FLOW_PRO_PRODUCT_ID && product.owned === true)
  );
}

function getIosLegacyEntitlementPlugin() {
  if (window.Capacitor?.getPlatform?.() !== "ios") return null;
  if (
    typeof window.Capacitor?.isPluginAvailable === "function" &&
    !window.Capacitor.isPluginAvailable("LegacyEntitlement")
  ) {
    return null;
  }
  const plugin = window.Capacitor?.Plugins?.LegacyEntitlement;
  return typeof plugin?.checkEntitlement === "function" ? plugin : null;
}

async function recoverIosLegacyProEntitlement(options = {}) {
  const trigger = options.trigger || "legacy-purchase-recovery";
  const synchronize = options.synchronize === true;
  console.info("[Reverse Flow IAP]", {
    event: "storekit2-bridge-invocation-started",
    productId: REVERSE_FLOW_PRO_PRODUCT_ID,
    synchronized: synchronize,
    trigger
  });

  const plugin = getIosLegacyEntitlementPlugin();
  if (!plugin) {
    const error = new Error(
      "LegacyEntitlement native bridge is unavailable"
    );
    console.warn("[Reverse Flow IAP]", {
      event: "storekit2-bridge-invocation-failed",
      synchronized: synchronize,
      trigger,
      message: error.message
    });
    throw error;
  }

  let result;
  try {
    result = await plugin.checkEntitlement({ synchronize });
  } catch (error) {
    console.warn("[Reverse Flow IAP]", {
      event: "storekit2-bridge-invocation-failed",
      synchronized: synchronize,
      trigger,
      message: error?.message || String(error)
    });
    throw error;
  }
  const found =
    result?.owned === true &&
    result?.productId === REVERSE_FLOW_PRO_PRODUCT_ID;

  if (found) {
    setAccessLevel(ACCESS_LEVELS.PRO, {
      source: "purchase",
      provenanceSource: synchronize
        ? LEGACY_ENTITLEMENT_SOURCES.MANUAL_STORE_SYNC
        : LEGACY_ENTITLEMENT_SOURCES.STOREKIT2_CURRENT_ENTITLEMENTS,
      productId: REVERSE_FLOW_PRO_PRODUCT_ID,
      trigger,
      platform: "ios",
      purchaseState: "verified-current-entitlement",
      transactionId: result.transactionId || null,
      originalTransactionId: result.originalTransactionId || null,
      purchaseTimestamp: result.purchaseDate || null,
      originalPurchaseTimestamp:
        result.originalPurchaseDate ||
        result.purchaseDate ||
        null,
      environment: result.environment || null
    });
  }

  console.info("[Reverse Flow IAP]", {
    event: "storekit-current-entitlement-check",
    productId: REVERSE_FLOW_PRO_PRODUCT_ID,
    found,
    synchronized: synchronize,
    trigger
  });

  return {
    found: hasLegacyProEntitlement(),
    evidence: collectLegacyProEntitlementEvidence(),
    authoritativeSource: "storekit-current-entitlements"
  };
}

async function initializeLegacyPurchaseStoreIfNeeded(store, storePlatform) {
  if (store.isReady) return;

  const purchases = window.CdvPurchase;
  store.register({
    id: REVERSE_FLOW_PRO_PRODUCT_ID,
    type: purchases.ProductType.NON_CONSUMABLE,
    platform: storePlatform
  });

  const initialization = storePlatform === purchases.Platform.APPLE_APPSTORE
    ? [{
        platform: storePlatform,
        options: { needAppReceipt: true }
      }]
    : [storePlatform];
  await store.initialize(initialization);
}

async function recoverLegacyProPurchase(options = {}) {
  if (legacyPurchaseRecoveryInFlight) return legacyPurchaseRecoveryInFlight;

  legacyPurchaseRecoveryInFlight = (async () => {
    const trigger = options.trigger || "manual-check-existing-purchase";
    if (window.Capacitor?.getPlatform?.() === "ios") {
      try {
        return await recoverIosLegacyProEntitlement({
          trigger,
          synchronize:
            options.synchronize !== false &&
            options.startup !== true
        });
      } catch (error) {
        console.warn("[Reverse Flow Supporter]", {
          event: "ios-legacy-entitlement-recovery-failed",
          trigger,
          message: error?.message || String(error)
        });
        return {
          found: hasLegacyProEntitlement(),
          error,
          evidence: collectLegacyProEntitlementEvidence()
        };
      }
    }

    if (navigator.onLine === false) {
      return {
        found: hasLegacyProEntitlement(),
        offline: true,
        evidence: collectLegacyProEntitlementEvidence()
      };
    }

    if (typeof window.reverseFlowRecoverLegacyPurchaseFromStore === "function") {
      return window.reverseFlowRecoverLegacyPurchaseFromStore({ trigger });
    }

    const store = window.CdvPurchase?.store;
    const storePlatform = getLegacyPurchaseStorePlatform();
    if (!store || !storePlatform) {
      return {
        found: hasLegacyProEntitlement(),
        unavailable: true,
        evidence: collectLegacyProEntitlementEvidence()
      };
    }

    try {
      await initializeLegacyPurchaseStoreIfNeeded(store, storePlatform);
      if (typeof store.restorePurchases === "function") {
        await store.restorePurchases();
      } else if (typeof store.update === "function") {
        await store.update();
      }

      if (storeOwnsLegacyProProduct(store, storePlatform)) {
        const evidence = collectLegacyProEntitlementEvidence();
        setAccessLevel(ACCESS_LEVELS.PRO, {
          ...evidence,
          trigger,
          source: "purchase",
          provenanceSource:
            storePlatform === window.CdvPurchase?.Platform?.GOOGLE_PLAY
              ? LEGACY_ENTITLEMENT_SOURCES.GOOGLE_OWNED_PURCHASE
              : LEGACY_ENTITLEMENT_SOURCES.CORDOVA_OWNED_PRODUCT,
          productId: REVERSE_FLOW_PRO_PRODUCT_ID
        });
      }

      return {
        found: hasLegacyProEntitlement(),
        evidence: collectLegacyProEntitlementEvidence()
      };
    } catch (error) {
      console.warn("[Reverse Flow Supporter]", {
        event: "legacy-purchase-recovery-failed",
        trigger,
        message: error?.message || String(error)
      });
      return {
        found: hasLegacyProEntitlement(),
        error,
        evidence: collectLegacyProEntitlementEvidence()
      };
    }
  })();

  try {
    return await legacyPurchaseRecoveryInFlight;
  } finally {
    legacyPurchaseRecoveryInFlight = null;
  }
}

async function refreshLegacyProEntitlementEvidence() {
  const result = await recoverLegacyProPurchase({
    trigger: "legacy-evidence-refresh",
    synchronize: false
  });
  return result.evidence;
}

window.recoverLegacyProPurchase = recoverLegacyProPurchase;
window.refreshLegacyProEntitlementEvidence = refreshLegacyProEntitlementEvidence;
window.recoverIosLegacyProEntitlement = recoverIosLegacyProEntitlement;

function getToolsSafeRedirectUrl() {
  try {
    const referrer = document.referrer ? new URL(document.referrer, window.location.href) : null;
    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname;

    if (
      referrer &&
      referrer.origin === currentOrigin &&
      !/\/(?:tools|references)\.html$/i.test(referrer.pathname) &&
      referrer.pathname !== currentPath
    ) {
      return `${referrer.pathname}${referrer.search}${referrer.hash}`;
    }
  } catch (error) {
    console.warn("[Reverse Flow Pro Access]", {
      event: "tools-safe-redirect-referrer-failed",
      error
    });
  }

  return "index.html";
}

function setToolsContentLocked(locked) {
  [
    document.getElementById("toolsProContent"),
    document.getElementById("referencesList")
  ].forEach(element => {
    if (!element) return;
    element.hidden = locked;
    element.inert = locked;
    element.setAttribute("aria-hidden", locked ? "true" : "false");
  });

  const lockedMessage = document.getElementById("toolsProLockedMessage");
  if (lockedMessage) {
    lockedMessage.hidden = !locked;
  }
}

function openToolsProModal() {
  const modal = document.getElementById("proModal");
  if (modal) {
    modal.hidden = false;
    return;
  }

  return;
}

function redirectFromLockedTools(options = {}) {
  const redirect = () => {
    if (isProUser()) return;
    window.location.replace(options.safeUrl || getToolsSafeRedirectUrl());
  };

  const delayMs = Number.isFinite(options.redirectDelayMs)
    ? Math.max(0, options.redirectDelayMs)
    : 0;

  window.setTimeout(redirect, delayMs);
}

function guardToolsAccess(options = {}) {
  setToolsContentLocked(false);
  return true;
}

function setAccessLevel(level, grantDetails = {}) {
  const provenanceSource = grantDetails.provenanceSource;
  if (
    level === ACCESS_LEVELS.PRO &&
    (
      grantDetails.productId !== REVERSE_FLOW_PRO_PRODUCT_ID ||
      !LEGACY_ENTITLEMENT_SOURCE_VALUES.has(provenanceSource)
    )
  ) {
    logProAccessEvent("pro-grant-denied", {
      trigger: grantDetails.trigger,
      source: grantDetails.source,
      provenanceSource: provenanceSource || null,
      productId: grantDetails.productId || null,
      reason:
        grantDetails.productId !== REVERSE_FLOW_PRO_PRODUCT_ID
          ? "product ID did not match approved lifetime product"
          : "legacy entitlement provenance source was not approved"
    });
    return false;
  }

  const wasLegacyEligible = hasLegacyProEntitlement();
  userAccessLevel = level;

  localStorage.setItem(
    ACCESS_LEVEL_STORAGE_KEY,
    level
  );

  if (level === ACCESS_LEVELS.PRO) {
    let previousEntitlement = {};
    try {
      const parsed = JSON.parse(
        localStorage.getItem(PRO_ENTITLEMENT_STORAGE_KEY) || "null"
      );
      if (isValidStoredProEntitlement(parsed)) previousEntitlement = parsed;
    } catch {
      previousEntitlement = {};
    }
    localStorage.setItem(
      PRO_ENTITLEMENT_STORAGE_KEY,
      JSON.stringify({
        access: ACCESS_LEVELS.PRO,
        source: grantDetails.source,
        provenanceSource,
        productId: grantDetails.productId,
        trigger: grantDetails.trigger,
        originalTransactionId:
          grantDetails.originalTransactionId ||
          previousEntitlement.originalTransactionId ||
          null,
        transactionId:
          grantDetails.transactionId ||
          previousEntitlement.transactionId ||
          null,
        purchaseToken:
          grantDetails.purchaseToken ||
          previousEntitlement.purchaseToken ||
          null,
        originalPurchaseTimestamp:
          grantDetails.originalPurchaseTimestamp ||
          previousEntitlement.originalPurchaseTimestamp ||
          null,
        purchaseTimestamp:
          grantDetails.purchaseTimestamp ||
          previousEntitlement.purchaseTimestamp ||
          null,
        platform:
          grantDetails.platform ||
          previousEntitlement.platform ||
          window.Capacitor?.getPlatform?.() ||
          null,
        environment:
          grantDetails.environment || previousEntitlement.environment || null,
        sandbox:
          grantDetails.sandbox === true ||
          previousEntitlement.sandbox === true
            ? true
            : null,
        isAcknowledged:
          typeof grantDetails.isAcknowledged === "boolean"
            ? grantDetails.isAcknowledged
            : previousEntitlement.isAcknowledged ?? null,
        purchaseState:
          grantDetails.purchaseState || previousEntitlement.purchaseState || null,
        orderId: grantDetails.orderId || previousEntitlement.orderId || null,
        packageName:
          grantDetails.packageName || previousEntitlement.packageName || null,
        obfuscatedAccountId:
          grantDetails.obfuscatedAccountId ||
          previousEntitlement.obfuscatedAccountId ||
          null,
        obfuscatedProfileId:
          grantDetails.obfuscatedProfileId ||
          previousEntitlement.obfuscatedProfileId ||
          null,
        appAccountToken:
          grantDetails.appAccountToken ||
          previousEntitlement.appAccountToken ||
          null,
        verifiedAt: new Date().toISOString()
      })
    );
  } else {
    localStorage.removeItem(PRO_ENTITLEMENT_STORAGE_KEY);
  }

  document.body.classList.toggle(
    "pro-user",
    isProUser()
  );

  document.dispatchEvent(new CustomEvent("reverseflow:legacy-entitlement-changed", {
    detail: {
      hasLegacyProEntitlement: hasLegacyProEntitlement()
    }
  }));

  if (typeof updateAccessBadge === "function") {
    updateAccessBadge();
  }
  if (!wasLegacyEligible && hasLegacyProEntitlement()) {
    logLegacyEntitlementStateChanged(true, provenanceSource);
  }
  logProAccessEvent("access-level-updated", {
    trigger: grantDetails.trigger,
    source: grantDetails.source,
    provenanceSource: provenanceSource || null,
    productId: grantDetails.productId || null
  });
  return true;
}



// ========================================
// FEATURE DEFINITIONS
// ========================================

const FEATURES = {
  reverseFlow: {
    name: "Reverse Flow"
  },

  requiredPdp: {
    name: "Required PDP"
  },

  relayPumping: {
    name: "Relay Pumping"
},

  splitLay: {
    name: "Split Lay"
  },

  equipmentCatalog: {
    name: "Equipment Catalog"
  },

  departmentProfiles: {
    name: "Department Profiles"
  }
};

function canAccessFeature(featureKey) {
  const feature = FEATURES[featureKey];

  if (!feature) return false;
  return true;
}

console.log(`Reverse Flow Calculator v${APP_VERSION}`);
