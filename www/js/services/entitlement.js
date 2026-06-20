// ========================================
// ACCESS CONTROL
// ========================================

const ACCESS_LEVELS = {
  BASIC: "basic",
  PRO: "pro",
};

const ACCESS_LEVEL_STORAGE_KEY =
  "reverse-flow-access-level";

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
    entitlement.productId === REVERSE_FLOW_PRO_PRODUCT_ID
  );
}

function loadStoredAccessLevel() {
  try {
    const entitlement = JSON.parse(
      localStorage.getItem(PRO_ENTITLEMENT_STORAGE_KEY) || "null"
    );

    if (isValidStoredProEntitlement(entitlement)) {
      console.info("[Reverse Flow Pro Access]", {
        event: "stored-entitlement-granted",
        source: "stored entitlement",
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

let userAccessLevel = loadStoredAccessLevel();

function isProUser() {
  return userAccessLevel === ACCESS_LEVELS.PRO;
}

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

  alert("Reverse Flow Pro is required for Tools.");
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
  const hasAccess = isProUser();
  setToolsContentLocked(!hasAccess);

  if (hasAccess) {
    const modal = document.getElementById("proModal");
    if (modal) modal.hidden = true;
    return true;
  }

  if (options.showModal !== false) {
    openToolsProModal();
  }

  if (options.redirect !== false) {
    redirectFromLockedTools(options);
  }

  logProAccessEvent("tools-access-blocked", {
    page: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    reason: options.reason || "missing Pro entitlement"
  });

  return false;
}

function setAccessLevel(level, grantDetails = {}) {
  if (
    level === ACCESS_LEVELS.PRO &&
    grantDetails.productId !== REVERSE_FLOW_PRO_PRODUCT_ID
  ) {
    logProAccessEvent("pro-grant-denied", {
      trigger: grantDetails.trigger,
      source: grantDetails.source,
      productId: grantDetails.productId || null,
      reason: "product ID did not match approved lifetime product"
    });
    return false;
  }

  userAccessLevel = level;

  localStorage.setItem(
    ACCESS_LEVEL_STORAGE_KEY,
    level
  );

  if (level === ACCESS_LEVELS.PRO) {
    localStorage.setItem(
      PRO_ENTITLEMENT_STORAGE_KEY,
      JSON.stringify({
        access: ACCESS_LEVELS.PRO,
        source: grantDetails.source,
        productId: grantDetails.productId,
        trigger: grantDetails.trigger,
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

  updateAccessBadge();
  logProAccessEvent("access-level-updated", {
    trigger: grantDetails.trigger,
    source: grantDetails.source,
    productId: grantDetails.productId || null
  });
  return true;
}



// ========================================
// FEATURE DEFINITIONS
// ========================================

const FEATURES = {
  reverseFlow: {
    name: "Reverse Flow",
    access: ACCESS_LEVELS.BASIC
  },

  requiredPdp: {
    name: "Required PDP",
    access: ACCESS_LEVELS.BASIC
  },

  relayPumping: {
  name: "Relay Pumping",
  access: ACCESS_LEVELS.PRO
},

  splitLay: {
    name: "Split Lay",
    access: ACCESS_LEVELS.PRO
  },

  equipmentCatalog: {
    name: "Equipment Catalog",
    access: ACCESS_LEVELS.PRO
  },

  departmentProfiles: {
    name: "Department Profiles",
    access: ACCESS_LEVELS.PRO
  }
};

function canAccessFeature(featureKey) {
  const feature = FEATURES[featureKey];

  if (!feature) return false;

  if (feature.access === ACCESS_LEVELS.BASIC) {
    return true;
  }

  return isProUser();
}

console.log(`Reverse Flow Calculator v${APP_VERSION}`);
