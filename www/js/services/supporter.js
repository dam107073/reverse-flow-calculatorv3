(function (global) {
  "use strict";

  const CACHE_VERSION = 1;
  const DEFAULT_CACHE_KEY = "reverse-flow-supporter-cache-v1";
  const ACTIONS = Object.freeze({
    MANAGE: "manage-support",
    CONTINUE: "continue-supporting",
    CLAIM: "claim-supporter-status",
    BECOME: "become-supporter"
  });

  const ACTION_CONTENT = Object.freeze({
    [ACTIONS.BECOME]: {
      label: "Become a Supporter",
      message: "Help fund continued development and keep Reverse Flow growing."
    },
    [ACTIONS.CLAIM]: {
      label: "Claim Supporter Status",
      message: "Your previous purchase qualifies you for permanent Supporter status."
    },
    [ACTIONS.CONTINUE]: {
      label: "Continue Supporting",
      message: "Thank you for supporting Reverse Flow. Help fund what comes next."
    },
    [ACTIONS.MANAGE]: {
      label: "Manage Support",
      message: "View or change your recurring support."
    }
  });

  function resolveSupportAction(state) {
    if (state?.isSupporter && state?.hasActiveRecurringSupport) {
      return ACTIONS.MANAGE;
    }
    if (state?.isSupporter) return ACTIONS.CONTINUE;
    if (state?.hasLegacyProEntitlement) return ACTIONS.CLAIM;
    return ACTIONS.BECOME;
  }

  function normalizeSupporterRecord(record) {
    const contribution = record?.contribution || {};
    const isSupporter = record?.isSupporter === true;
    const status = String(contribution.status || "inactive");
    const type = String(contribution.type || "none");
    const hasActiveRecurringSupport =
      isSupporter &&
      type === "monthly" &&
      (status === "active" || status === "canceling");

    return {
      version: CACHE_VERSION,
      isSupporter,
      supporterSince: isSupporter ? record.supporterSince || null : null,
      source: isSupporter ? record.source || null : null,
      contribution: {
        type,
        status,
        monthlyAmount: Number.isFinite(contribution.monthlyAmount)
          ? contribution.monthlyAmount
          : null,
        platform: contribution.platform || null,
        renewsOrExpiresAt: contribution.renewsOrExpiresAt || null
      },
      hasActiveRecurringSupport,
      lastVerifiedAt: record?.lastVerifiedAt || null,
      syncStatus: record?.syncStatus || "cached"
    };
  }

  class SupporterCache {
    constructor(storage, key) {
      this.storage = storage;
      this.key = key || global.SUPPORTER_CACHE_STORAGE_KEY || DEFAULT_CACHE_KEY;
    }

    read() {
      try {
        const raw = JSON.parse(this.storage.getItem(this.key) || "null");
        if (!raw || raw.isSupporter !== true) {
          return normalizeSupporterRecord(null);
        }
        return normalizeSupporterRecord(raw);
      } catch {
        return normalizeSupporterRecord(null);
      }
    }

    writeConfirmed(record) {
      if (record?.isSupporter !== true || !record?.lastVerifiedAt) {
        throw new Error("Only registry-confirmed Supporter records may be cached.");
      }
      const normalized = normalizeSupporterRecord(record);
      this.storage.setItem(this.key, JSON.stringify(normalized));
      return normalized;
    }

    retainAfterSyncFailure() {
      const cached = this.read();
      return { ...cached, syncStatus: navigator.onLine ? "stale" : "offline" };
    }
  }

  class SupporterRegistryService {
    async getStatus() {
      throw new Error("Supporter Registry integration is not configured.");
    }

    async submitLegacyClaim() {
      throw new Error("Supporter Registry integration is not configured.");
    }

    async registerVerifiedPurchase() {
      throw new Error("Supporter Registry integration is not configured.");
    }
  }

  class SupportPurchaseService {
    constructor(config) {
      this.config = config || {};
    }

    getOptions(platform) {
      const ids = this.config[platform] || {};
      return [
        { key: "oneTime5", label: "One-Time Support — $5", type: "one-time", amount: 5, productId: ids.oneTime5 || null },
        { key: "monthly3", label: "Monthly Support — $3", type: "monthly", amount: 3, productId: ids.monthly3 || null },
        { key: "monthly10", label: "Monthly Support — $10", type: "monthly", amount: 10, productId: ids.monthly10 || null }
      ];
    }

    async purchase(option) {
      if (!option?.productId) {
        throw new Error("This support option is not configured in the store yet.");
      }
      throw new Error("Verified support purchasing will be connected in a later pass.");
    }

    async openNativeSubscriptionManagement() {
      throw new Error("Subscription management is unavailable until recurring products are configured.");
    }
  }

  function getPlatform() {
    const platform = global.Capacitor?.getPlatform?.();
    return platform === "ios" || platform === "android" ? platform : "web";
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function getAppVersion() {
    return typeof APP_VERSION === "string" ? APP_VERSION : null;
  }

  function createLegacyClaimPayload(fields) {
    const evidence = global.getLegacyProEntitlementEvidence?.();
    return {
      name: String(fields?.name || "").trim(),
      email: String(fields?.email || "").trim().toLowerCase(),
      platform: getPlatform(),
      legacyProductIdentifier:
        typeof REVERSE_FLOW_PRO_PRODUCT_ID === "string"
          ? REVERSE_FLOW_PRO_PRODUCT_ID
          : null,
      verifiedEntitlementState: Boolean(global.hasLegacyProEntitlement?.()),
      originalTransactionId: evidence?.originalTransactionId || evidence?.transactionId || evidence?.purchaseToken || null,
      appVersion: getAppVersion(),
      claimTimestamp: new Date().toISOString()
    };
  }

  function createPurchaseRegistrationPayload(fields, verifiedPurchase) {
    return {
      name: String(fields?.name || "").trim(),
      email: String(fields?.email || "").trim().toLowerCase(),
      platform: getPlatform(),
      paymentSource: verifiedPurchase?.paymentSource || getPlatform(),
      productIdentifier: verifiedPurchase?.productIdentifier || null,
      purchaseType: verifiedPurchase?.purchaseType || null,
      recurring: verifiedPurchase?.purchaseType === "monthly",
      monthlyAmount: verifiedPurchase?.monthlyAmount || null,
      transactionId: verifiedPurchase?.transactionId || null,
      purchaseToken: verifiedPurchase?.purchaseToken || null,
      purchaseTimestamp: verifiedPurchase?.purchaseTimestamp || null,
      appVersion: getAppVersion()
    };
  }

  function getRuntimeState(cache) {
    const cached = cache.read();
    return {
      ...cached,
      hasLegacyProEntitlement: Boolean(global.hasLegacyProEntitlement?.())
    };
  }

  function getActionUrl(action) {
    return `support.html?action=${encodeURIComponent(action)}`;
  }

  function renderSharedSupportUi(cache) {
    const state = getRuntimeState(cache);
    const action = resolveSupportAction(state);
    const content = ACTION_CONTENT[action];

    document.querySelectorAll("[data-supporter-badge]").forEach(badge => {
      badge.hidden = !state.isSupporter;
      if (state.isSupporter) {
        badge.href = getActionUrl(action);
        badge.setAttribute("aria-label", `${content.label}. Open Support Reverse Flow.`);
      }
    });

    document.querySelectorAll("[data-support-card]").forEach(card => {
      card.dataset.supportActionState = action;
      card.querySelector("[data-support-message]").textContent = content.message;
      const link = card.querySelector("[data-support-action]");
      link.textContent = content.label;
      link.href = getActionUrl(action);
      card.hidden = false;
    });

    return { state, action };
  }

  function renderSupportOptions(container, purchaseService, platform) {
    if (!container) return;
    const storePlatform = platform === "ios" ? "apple" : platform === "android" ? "google" : null;
    const options = purchaseService.getOptions(storePlatform);
    container.innerHTML = "";

    options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "support-option";
      button.textContent = option.label;
      button.disabled = !option.productId;
      if (!option.productId) {
        button.setAttribute("aria-describedby", "supportProductsUnavailable");
      }
      button.addEventListener("click", async () => {
        const status = document.getElementById("supportPageStatus");
        try {
          button.disabled = true;
          status.textContent = "Connecting to the store…";
          const verifiedPurchase = await purchaseService.purchase(option);
          global.reverseFlowPendingVerifiedSupportPurchase = verifiedPurchase;
          const registration = document.getElementById("supportRegistrationSection");
          if (registration) {
            registration.hidden = false;
            registration.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } catch (error) {
          status.textContent = error.message;
          button.disabled = !option.productId;
        }
      });
      container.appendChild(button);
    });
  }

  function renderSupportPage(cache, registryService, purchaseService) {
    const page = document.getElementById("supportPage");
    if (!page) return;

    const { state, action } = renderSharedSupportUi(cache);
    const requestedAction = new URLSearchParams(global.location.search).get("action");
    const safeAction = requestedAction === action ? requestedAction : action;
    const title = document.getElementById("supportPageTitle");
    const intro = document.getElementById("supportPageIntro");
    const claimSection = document.getElementById("legacyClaimSection");
    const manageSection = document.getElementById("manageSupportSection");
    const optionsSection = document.getElementById("supportOptionsSection");

    title.textContent = ACTION_CONTENT[safeAction].label;
    claimSection.hidden = safeAction !== ACTIONS.CLAIM;
    manageSection.hidden = safeAction !== ACTIONS.MANAGE;
    optionsSection.hidden = safeAction === ACTIONS.CLAIM || safeAction === ACTIONS.MANAGE;

    if (safeAction === ACTIONS.BECOME) {
      intro.textContent = "Reverse Flow is a community-supported platform built by firefighters, with firefighters, for the fire service. Every production tool is available to everyone. Financial support helps fund continued development and helps shape what comes next.";
    } else if (safeAction === ACTIONS.CONTINUE) {
      intro.textContent = "Thank you for supporting Reverse Flow. Your support helps keep production tools available to the fire service while funding continued development.";
    } else if (safeAction === ACTIONS.CLAIM) {
      intro.textContent = "Your previous purchase qualifies you for permanent Supporter status. No additional purchase is required.";
    } else {
      intro.textContent = "View your verified recurring contribution and use your platform’s billing tools to make changes.";
    }

    const contribution = state.contribution;
    document.getElementById("manageSupportDetails").textContent =
      state.hasActiveRecurringSupport
        ? `$${contribution.monthlyAmount || "—"} monthly · ${contribution.platform || "platform unavailable"} · ${contribution.status}`
        : "Current recurring contribution details are unavailable.";

    renderSupportOptions(
      document.getElementById("supportOptions"),
      purchaseService,
      getPlatform()
    );
    renderSupportOptions(
      document.getElementById("manageSupportOptions"),
      purchaseService,
      getPlatform()
    );

    document.getElementById("manageSubscriptionButton")?.addEventListener("click", async () => {
      const status = document.getElementById("supportPageStatus");
      try {
        await purchaseService.openNativeSubscriptionManagement();
      } catch (error) {
        status.textContent = error.message;
      }
    });

    const form = document.getElementById("legacyClaimForm");
    if (form && form.dataset.bound !== "true") {
      form.dataset.bound = "true";
      form.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = form.querySelector("button[type='submit']");
      const status = document.getElementById("legacyClaimStatus");
      const payload = createLegacyClaimPayload({
        name: form.elements.fullName.value,
        email: form.elements.email.value
      });

      if (!payload.name) {
        status.textContent = "Enter your full name.";
        form.elements.fullName.focus();
        return;
      }
      if (!isValidEmail(payload.email)) {
        status.textContent = "Enter a valid email address.";
        form.elements.email.focus();
        return;
      }
      if (!payload.verifiedEntitlementState) {
        status.textContent = "A verified previous purchase is required to submit this claim.";
        return;
      }
      if (!navigator.onLine) {
        status.textContent = "An internet connection is required to update your supporter status.";
        return;
      }

      submit.disabled = true;
      status.textContent = "Preparing your claim…";
      try {
        const confirmed = await registryService.submitLegacyClaim(payload);
        cache.writeConfirmed(confirmed);
        status.textContent = "Supporter status confirmed.";
        renderSupportPage(cache, registryService, purchaseService);
      } catch (error) {
        status.textContent = `${error.message} Your claim was not registered.`;
      } finally {
        submit.disabled = false;
      }
      });
    }

    const registrationForm = document.getElementById("supportRegistrationForm");
    if (registrationForm && registrationForm.dataset.bound !== "true") {
      registrationForm.dataset.bound = "true";
      registrationForm.addEventListener("submit", async event => {
        event.preventDefault();
        const status = document.getElementById("supportPageStatus");
        const submit = registrationForm.querySelector("button[type='submit']");
        const verifiedPurchase = global.reverseFlowPendingVerifiedSupportPurchase;
        const payload = createPurchaseRegistrationPayload({
          name: registrationForm.elements.fullName.value,
          email: registrationForm.elements.email.value
        }, verifiedPurchase);

        if (!payload.name || !isValidEmail(payload.email)) {
          status.textContent = "Enter a full name and valid email address.";
          return;
        }
        if (!payload.productIdentifier || (!payload.transactionId && !payload.purchaseToken)) {
          status.textContent = "A verified store transaction is required before registration.";
          return;
        }
        if (!navigator.onLine) {
          status.textContent = "An internet connection is required to update your supporter status.";
          return;
        }

        submit.disabled = true;
        status.textContent = "Registering verified support…";
        try {
          const confirmed = await registryService.registerVerifiedPurchase(payload);
          cache.writeConfirmed(confirmed);
          global.reverseFlowPendingVerifiedSupportPurchase = null;
          status.textContent = "Supporter status confirmed.";
          renderSupportPage(cache, registryService, purchaseService);
        } catch (error) {
          status.textContent = `${error.message} Your support was not registered.`;
        } finally {
          submit.disabled = false;
        }
      });
    }
  }

  function initialize() {
    if (!global.localStorage) return;
    const cache = new SupporterCache(global.localStorage);
    const registry = new SupporterRegistryService();
    const productConfig =
      typeof SUPPORT_PRODUCT_CONFIG === "object"
        ? SUPPORT_PRODUCT_CONFIG
        : {};
    const purchases = new SupportPurchaseService(productConfig);
    renderSharedSupportUi(cache);
    renderSupportPage(cache, registry, purchases);

    document.addEventListener("reverseflow:legacy-entitlement-changed", () => {
      renderSharedSupportUi(cache);
      if (document.getElementById("supportPage")) {
        renderSupportPage(cache, registry, purchases);
      }
    });
  }

  const api = {
    ACTIONS,
    ACTION_CONTENT,
    resolveSupportAction,
    normalizeSupporterRecord,
    SupporterCache,
    SupporterRegistryService,
    SupportPurchaseService,
    createLegacyClaimPayload,
    createPurchaseRegistrationPayload,
    isValidEmail
  };
  global.ReverseFlowSupporter = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (global.document) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
      initialize();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
