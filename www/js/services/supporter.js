(function (global) {
  "use strict";

  const CACHE_VERSION = 1;
  const DEFAULT_CACHE_KEY = "reverse-flow-supporter-cache-v1";
  const RECURRING_STATUSES = new Set(["active", "canceling", "expired", "inactive"]);
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

  function isValidTimestamp(value) {
    return typeof value === "string" && Number.isFinite(Date.parse(value));
  }

  function isValidSupporterSince(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  }

  function normalizeSupporterRecord(record) {
    const contribution = record?.contribution || {};
    const isSupporter = record?.isSupporter === true;
    const status = RECURRING_STATUSES.has(record?.recurringStatus)
      ? record.recurringStatus
      : String(contribution.status || "inactive");
    const hasActiveRecurringSupport =
      isSupporter &&
      (record?.hasActiveRecurringSupport === true ||
        status === "active" ||
        status === "canceling");
    const type = hasActiveRecurringSupport ||
      status === "expired" ||
      contribution.type === "monthly"
        ? "monthly"
        : "none";

    return {
      version: CACHE_VERSION,
      isSupporter,
      supporterSince: isSupporter ? record.supporterSince || null : null,
      source: isSupporter ? record.source || null : null,
      recurringStatus: status,
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
      supporterEmail: isSupporter ? record?.supporterEmail || null : null,
      platform: isSupporter
        ? record?.platform || contribution.platform || null
        : null,
      syncStatus: record?.syncStatus || "cached"
    };
  }

  function normalizeApiResponse(payload) {
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.isSupporter !== "boolean" ||
      typeof payload.hasActiveRecurringSupport !== "boolean" ||
      !RECURRING_STATUSES.has(payload.recurringStatus) ||
      !isValidTimestamp(payload.lastVerifiedAt)
    ) {
      throw new SupporterRegistryError(
        "The Supporter Directory returned an invalid response. Please try again.",
        { code: "malformed_response" }
      );
    }
    if (
      payload.isSupporter &&
      (!isValidSupporterSince(payload.supporterSince) ||
        typeof payload.source !== "string" ||
        !payload.source)
    ) {
      throw new SupporterRegistryError(
        "The Supporter Directory returned an incomplete confirmation. Please try again.",
        { code: "malformed_response" }
      );
    }
    if (
      !payload.isSupporter &&
      (payload.supporterSince !== null ||
        payload.source !== null ||
        payload.recurringStatus !== "inactive")
    ) {
      throw new SupporterRegistryError(
        "The Supporter Directory returned an inconsistent response. Please try again.",
        { code: "malformed_response" }
      );
    }
    const recurringShouldBeActive =
      payload.isSupporter &&
      (payload.recurringStatus === "active" ||
        payload.recurringStatus === "canceling");
    if (payload.hasActiveRecurringSupport !== recurringShouldBeActive) {
      throw new SupporterRegistryError(
        "The Supporter Directory returned an inconsistent recurring status. Please try again.",
        { code: "malformed_response" }
      );
    }
    return normalizeSupporterRecord(payload);
  }

  class SupporterCache {
    constructor(storage, key) {
      this.storage = storage;
      this.key = key || global.SUPPORTER_CACHE_STORAGE_KEY || DEFAULT_CACHE_KEY;
    }

    read() {
      try {
        const raw = JSON.parse(this.storage.getItem(this.key) || "null");
        if (
          !raw ||
          raw.isSupporter !== true ||
          !isValidTimestamp(raw.lastVerifiedAt)
        ) {
          return normalizeSupporterRecord(null);
        }
        return normalizeSupporterRecord(raw);
      } catch {
        return normalizeSupporterRecord(null);
      }
    }

    writeConfirmed(record, identity = {}) {
      if (
        record?.isSupporter !== true ||
        !isValidTimestamp(record?.lastVerifiedAt) ||
        !isValidSupporterSince(record?.supporterSince)
      ) {
        throw new Error("Only registry-confirmed Supporter records may be cached.");
      }
      const current = this.read();
      const incomingVerifiedAt = Date.parse(record.lastVerifiedAt);
      const currentVerifiedAt = Date.parse(current.lastVerifiedAt || "");
      if (
        current.isSupporter &&
        Number.isFinite(currentVerifiedAt) &&
        currentVerifiedAt > incomingVerifiedAt
      ) {
        return current;
      }
      const normalized = normalizeSupporterRecord({
        ...record,
        supporterEmail:
          String(identity.email || record.supporterEmail || current.supporterEmail || "")
            .trim()
            .toLowerCase() || null,
        platform: identity.platform || record.platform || current.platform || null
      });
      this.storage.setItem(this.key, JSON.stringify(normalized));
      return normalized;
    }

    retainAfterSyncFailure(online = global.navigator?.onLine) {
      const cached = this.read();
      return {
        ...cached,
        syncStatus: online === false ? "offline" : "stale"
      };
    }
  }

  class SupporterRegistryError extends Error {
    constructor(message, details = {}) {
      super(message);
      this.name = "SupporterRegistryError";
      this.code = details.code || "supporter_registry_error";
      this.status = details.status || null;
      this.retryAfterSeconds = details.retryAfterSeconds || null;
    }
  }

  function getConfiguredApi(config) {
    const configured =
      config ||
      (typeof SUPPORTER_API_CONFIG === "object"
        ? SUPPORTER_API_CONFIG
        : null);
    if (!configured) {
      throw new Error("Supporter API configuration is unavailable.");
    }
    const environment = configured.environment || "preview";
    const baseUrl = configured.baseUrl || configured.baseUrls?.[environment];
    if (
      !baseUrl ||
      !/^https:\/\//i.test(baseUrl) ||
      !configured.routes?.claimLegacy ||
      !configured.routes?.status ||
      !Number.isFinite(configured.timeoutsMs?.claimLegacy) ||
      !Number.isFinite(configured.timeoutsMs?.status)
    ) {
      throw new Error("Supporter API configuration must use HTTPS.");
    }
    return {
      environment,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      routes: { ...configured.routes },
      timeoutsMs: { ...configured.timeoutsMs }
    };
  }

  function getRegistryErrorMessage(status, code, fallback) {
    if (code === "legacy_verification_unavailable") {
      return "Supporter claims are not available yet while purchase verification is being completed. Your existing purchase remains recognized, and every tool is already available.";
    }
    if (status === 429 || code === "supporter_rate_limited") {
      return "Too many Supporter Directory requests were made. Please wait and try again.";
    }
    if (status === 422) {
      return fallback || "The store could not verify this previous purchase. Please refresh your purchase history and try again.";
    }
    if (status === 400) {
      return fallback || "The claim information or purchase evidence was incomplete.";
    }
    if (status >= 500) {
      return "The Supporter Directory is temporarily unavailable. Please try again later.";
    }
    return fallback || "The Supporter Directory request could not be completed.";
  }

  class SupporterRegistryService {
    constructor(config, dependencies = {}) {
      this.config = getConfiguredApi(config);
      this.fetch = dependencies.fetch || global.fetch?.bind(global);
      this.AbortController = dependencies.AbortController || global.AbortController;
      this.navigator = dependencies.navigator || global.navigator;
    }

    async request(routeKey, body, timeoutKey) {
      if (this.navigator?.onLine === false) {
        throw new SupporterRegistryError(
          "An internet connection is required to update your supporter status.",
          { code: "offline" }
        );
      }
      if (typeof this.fetch !== "function") {
        throw new SupporterRegistryError(
          "The Supporter Directory is unavailable on this device.",
          { code: "transport_unavailable" }
        );
      }
      const route = this.config.routes[routeKey];
      const url = `${this.config.baseUrl}${route}`;
      const timeoutMs = this.config.timeoutsMs[timeoutKey];
      const controller = this.AbortController ? new this.AbortController() : null;
      const timeout = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

      let response;
      try {
        response = await this.fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: controller?.signal
        });
      } catch (error) {
        const timedOut = error?.name === "AbortError";
        throw new SupporterRegistryError(
          timedOut
            ? "The Supporter Directory request timed out. Please try again."
            : "The Supporter Directory could not be reached. Check your connection and try again.",
          { code: timedOut ? "timeout" : "network_error" }
        );
      } finally {
        if (timeout) clearTimeout(timeout);
      }

      let payload;
      try {
        const text = await response.text();
        payload = text ? JSON.parse(text) : null;
      } catch {
        throw new SupporterRegistryError(
          "The Supporter Directory returned an invalid response. Please try again.",
          { code: "malformed_response", status: response.status }
        );
      }

      if (!response.ok) {
        const code =
          typeof payload?.code === "string"
            ? payload.code
            : `http_${response.status}`;
        const fallback =
          typeof payload?.error === "string" ? payload.error : null;
        const retryAfter = Number(response.headers?.get?.("Retry-After"));
        throw new SupporterRegistryError(
          getRegistryErrorMessage(response.status, code, fallback),
          {
            code,
            status: response.status,
            retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : null
          }
        );
      }
      return normalizeApiResponse(payload);
    }

    async getStatus(email) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        throw new SupporterRegistryError(
          "A valid Supporter email is required for status lookup.",
          { code: "email_invalid" }
        );
      }
      return this.request("status", { email: normalizedEmail }, "status");
    }

    async submitLegacyClaim(payload) {
      return this.request("claimLegacy", payload, "claimLegacy");
    }

    async registerVerifiedPurchase() {
      throw new SupporterRegistryError(
        "New support products are not configured yet.",
        { code: "support_products_unavailable" }
      );
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

  function toIsoTimestamp(value) {
    if (!value) return null;
    const numeric = Number(value);
    const date = Number.isFinite(numeric)
      ? new Date(numeric < 100000000000 ? numeric * 1000 : numeric)
      : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }

  function createLegacyClaimPayload(fields, evidence) {
    const platform = getPlatform();
    const productIdentifier =
      typeof REVERSE_FLOW_PRO_PRODUCT_ID === "string"
        ? REVERSE_FLOW_PRO_PRODUCT_ID
        : evidence?.productId || null;
    const payload = {
      name: String(fields?.name || "").trim(),
      email: String(fields?.email || "").trim().toLowerCase(),
      platform,
      legacyProductIdentifier: productIdentifier,
      entitlementEvidence: {},
      appVersion: getAppVersion(),
      claimTimestamp: new Date().toISOString()
    };
    const purchaseTimestamp = toIsoTimestamp(
      evidence?.originalPurchaseTimestamp || evidence?.purchaseTimestamp
    );
    if (purchaseTimestamp) payload.originalPurchaseTimestamp = purchaseTimestamp;

    if (platform === "ios") {
      const transactionReference =
        evidence?.originalTransactionId || evidence?.transactionId || null;
      if (transactionReference) {
        payload.entitlementEvidence.originalTransactionId = transactionReference;
        payload.originalTransactionId = transactionReference;
      }
    } else if (platform === "android") {
      const purchaseToken = evidence?.purchaseToken || null;
      if (purchaseToken) {
        payload.entitlementEvidence.purchaseToken = purchaseToken;
        payload.purchaseToken = purchaseToken;
      }
    }
    return payload;
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
      const link = card.matches("[data-support-action]")
        ? card
        : card.querySelector("[data-support-action]");
      if (!link) return;
      link.textContent = content.label;
      link.href = getActionUrl(action);
      link.setAttribute("aria-label", `${content.label}. Open Support Reverse Flow.`);
      card.hidden = false;
    });

    return { state, action };
  }

  async function refreshSupporterStatus(cache, registryService) {
    const cached = cache.read();
    if (!cached.isSupporter || !cached.supporterEmail) return cached;
    try {
      const confirmed = await registryService.getStatus(cached.supporterEmail);
      if (!confirmed.isSupporter) {
        return cache.retainAfterSyncFailure();
      }
      const updated = cache.writeConfirmed(confirmed, {
        email: cached.supporterEmail,
        platform: cached.platform
      });
      renderSharedSupportUi(cache);
      return updated;
    } catch {
      return cache.retainAfterSyncFailure();
    }
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
      button.disabled = !option.productId;
      const label = document.createElement("span");
      label.className = "support-option-label";
      label.textContent = option.label;
      button.appendChild(label);
      if (!option.productId) {
        button.classList.add("is-coming-soon");
        const availability = document.createElement("span");
        availability.className = "support-option-availability";
        availability.textContent = "Coming Soon";
        button.appendChild(availability);
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

    title.textContent = "Support Reverse Flow";
    claimSection.hidden = safeAction !== ACTIONS.CLAIM;
    manageSection.hidden = safeAction !== ACTIONS.MANAGE;
    optionsSection.hidden = safeAction === ACTIONS.CLAIM || safeAction === ACTIONS.MANAGE;

    if (safeAction === ACTIONS.BECOME) {
      intro.textContent = "Join the firefighters helping Reverse Flow keep growing.";
    } else if (safeAction === ACTIONS.CONTINUE) {
      intro.textContent = "Thank you for helping build what comes next.";
    } else if (safeAction === ACTIONS.CLAIM) {
      intro.textContent = "Previous purchase found. Claim your permanent Supporter status below.";
    } else {
      intro.textContent = "Thank you for standing behind Reverse Flow.";
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

    const recoveryButton = document.getElementById("checkExistingPurchaseButton");
    if (recoveryButton && recoveryButton.dataset.bound !== "true") {
      recoveryButton.dataset.bound = "true";
      recoveryButton.addEventListener("click", async () => {
        if (recoveryButton.dataset.checking === "true") return;
        const status = document.getElementById("legacyRecoveryStatus");

        if (navigator.onLine === false) {
          status.textContent = "Connect to the internet to check your Apple or Google purchase history. Your current app access is unchanged.";
          return;
        }

        recoveryButton.dataset.checking = "true";
        recoveryButton.disabled = true;
        recoveryButton.textContent = "Checking Existing Purchase…";
        status.textContent = "Checking the purchase history for your current store account…";
        try {
          const result = await global.recoverLegacyProPurchase?.({
            trigger: "support-page-check-existing-purchase"
          });
          if (result?.found) {
            status.textContent = "Previous purchase found. You can now claim Supporter status.";
            renderSupportPage(cache, registryService, purchaseService);
          } else if (result?.unavailable) {
            status.textContent = "Purchase history can be checked in the installed iOS or Android app.";
          } else if (result?.offline) {
            status.textContent = "Connect to the internet to check your Apple or Google purchase history. Your current app access is unchanged.";
          } else if (result?.error) {
            status.textContent = "The store could not complete the check. Confirm your connection and try again.";
          } else {
            status.textContent = "No previous Reverse Flow PRO purchase was found for the currently signed-in Apple or Google account.";
          }
        } catch {
          status.textContent = "The store could not complete the check. Confirm your connection and try again.";
        } finally {
          recoveryButton.dataset.checking = "false";
          recoveryButton.disabled = false;
          recoveryButton.textContent = "Check Existing Purchase";
        }
      });
    }

    const form = document.getElementById("legacyClaimForm");
    if (form && form.dataset.bound !== "true") {
      form.dataset.bound = "true";
      form.addEventListener("submit", async event => {
        event.preventDefault();
        if (form.dataset.submitting === "true") return;
        const submit = form.querySelector("button[type='submit']");
        const status = document.getElementById("legacyClaimStatus");
        const name = String(form.elements.fullName.value || "").trim();
        const email = String(form.elements.email.value || "").trim().toLowerCase();

        if (!name) {
          status.textContent = "Enter your full name.";
          form.elements.fullName.focus();
          return;
        }
        if (!isValidEmail(email)) {
          status.textContent = "Enter a valid email address.";
          form.elements.email.focus();
          return;
        }
        if (navigator.onLine === false) {
          status.textContent = "An internet connection is required to update your supporter status.";
          return;
        }

        form.dataset.submitting = "true";
        submit.disabled = true;
        status.textContent = "Refreshing your previous purchase…";
        try {
          const evidence =
            await global.refreshLegacyProEntitlementEvidence?.() ||
            global.getLegacyProEntitlementEvidence?.();
          const hasLegacyEntitlement = Boolean(global.hasLegacyProEntitlement?.());
          const payload = createLegacyClaimPayload({ name, email }, evidence);
          const hasRequiredEvidence =
            payload.platform === "ios"
              ? Boolean(payload.originalTransactionId)
              : payload.platform === "android"
                ? Boolean(payload.purchaseToken)
                : false;

          if (
            !hasLegacyEntitlement ||
            evidence?.productId !== payload.legacyProductIdentifier
          ) {
            status.textContent = "A verified previous purchase is required to submit this claim.";
            return;
          }
          if (!hasRequiredEvidence) {
            status.textContent = "The store did not provide the purchase reference required for a claim. Reopen Reverse Flow, check your previous purchase, and try again.";
            return;
          }

          status.textContent = "Submitting your claim…";
          const confirmed = await registryService.submitLegacyClaim(payload);
          cache.writeConfirmed(confirmed, {
            email,
            platform: payload.platform
          });
          const pageStatus = document.getElementById("supportPageStatus");
          if (pageStatus) {
            pageStatus.textContent = "Welcome, Supporter. Thank you for helping build what comes next.";
          }
          renderSupportPage(cache, registryService, purchaseService);
        } catch (error) {
          status.textContent = error.message || "Your claim was not registered. Please try again.";
        } finally {
          form.dataset.submitting = "false";
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
    let lastRefreshStartedAt = 0;
    const requestStatusRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshStartedAt < 60000) return;
      lastRefreshStartedAt = now;
      void refreshSupporterStatus(cache, registry);
    };
    setTimeout(requestStatusRefresh, 0);
    document.addEventListener("resume", requestStatusRefresh);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestStatusRefresh();
    });

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
    normalizeApiResponse,
    SupporterCache,
    SupporterRegistryError,
    SupporterRegistryService,
    SupportPurchaseService,
    createLegacyClaimPayload,
    createPurchaseRegistrationPayload,
    refreshSupporterStatus,
    getConfiguredApi,
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
