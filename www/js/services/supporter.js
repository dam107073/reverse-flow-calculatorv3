(function (global) {
  "use strict";

  const CACHE_VERSION = 1;
  const DEFAULT_CACHE_KEY = "reverse-flow-supporter-cache-v1";
  const PURCHASE_RETRY_CACHE_KEY = "reverse-flow-support-pending-registration-v2";
  const SUBSCRIPTION_RETRY_CACHE_KEY =
    "reverse-flow-support-subscription-pending-v1";
  const SUPPORT_ENVIRONMENT_CACHE_KEY =
    "reverse-flow-support-environment-v1";
  const LEGACY_PURCHASE_RETRY_CACHE_KEY = "reverse-flow-support-purchase-retry-v1";
  const BILLING_HISTORY_CACHE_KEY = "reverse-flow-store-support-history-v2";
  const LEGACY_GOOGLE_SUBSCRIPTION_PRODUCTS = Object.freeze({
    support_reverse_flow_monthly_3: {
      basePlanId: "monthly-3",
      monthlyAmount: 3
    },
    support_reverse_flow_monthly_10: {
      basePlanId: "monthly-10",
      monthlyAmount: 10
    }
  });
  const PENDING_REGISTRATION_STATUSES = new Set([
    "not-attempted",
    "verification-started",
    "verification-succeeded",
    "verification-failed",
    "verified-awaiting-registration",
    "acknowledgment-failed",
    "registration-started",
    "registration-failed",
    "confirmed-awaiting-finish",
    "finish-failed",
    "store-approved",
    "store-completion-failed"
  ]);
  const RECURRING_STATUSES = new Set(["active", "canceling", "expired", "inactive"]);
  const BILLING_STATES = Object.freeze({
    NEVER_PURCHASED: "never-purchased",
    ACTIVE_MONTHLY_3: "active-monthly-3",
    ACTIVE_MONTHLY_10: "active-monthly-10",
    PREVIOUSLY_SUPPORTED: "previously-supported",
    BILLING_UNAVAILABLE: "billing-unavailable"
  });
  const CLAIM_STATES = Object.freeze({
    UNCLAIMED: "unclaimed",
    CLAIMED: "claimed"
  });
  const ACTIONS = Object.freeze({
    MANAGE: "manage-support",
    BECOME: "become-supporter"
  });

  const ACTION_CONTENT = Object.freeze({
    [ACTIONS.BECOME]: {
      label: "Become a Supporter",
      message: "Join the community helping shape and sustain what Reverse Flow becomes next."
    },
    [ACTIONS.MANAGE]: {
      label: "Manage Support",
      message: "Manage your support through Apple or Google."
    }
  });

  function resolveSupportAction(state) {
    return state?.supportEligible === true ? ACTIONS.MANAGE : ACTIONS.BECOME;
  }

  function projectSupportPresentation(billingState, supporterRecord) {
    const normalizedBilling = Object.values(BILLING_STATES).includes(billingState)
      ? billingState
      : BILLING_STATES.NEVER_PURCHASED;
    const supportEligible =
      normalizedBilling === BILLING_STATES.ACTIVE_MONTHLY_3 ||
      normalizedBilling === BILLING_STATES.ACTIVE_MONTHLY_10 ||
      normalizedBilling === BILLING_STATES.PREVIOUSLY_SUPPORTED;
    const claimedSupporter = supporterRecord?.isSupporter === true;
    return {
      supportEligible,
      claimedSupporter,
      primaryAction: resolveSupportAction({ supportEligible })
    };
  }

  function resolveSupportActionVisibility(presentation) {
    const supportEligible = presentation?.supportEligible === true;
    return {
      showOneTime: true,
      showMonthly: true,
      showManage: supportEligible
    };
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
    const isSupporter = record?.isSupporter === true;

    return {
      version: CACHE_VERSION,
      isSupporter,
      name: isSupporter ? record?.name || null : null,
      supporterSince: isSupporter ? record.supporterSince || null : null,
      isPubliclyListed: isSupporter
        ? record?.isPubliclyListed !== false
        : null,
      lastVerifiedAt: record?.lastVerifiedAt || null,
      emailHash: /^[a-f0-9]{64}$/i.test(String(record?.emailHash || ""))
        ? String(record.emailHash).toLowerCase()
        : null,
      supporterEmail: isSupporter ? record?.supporterEmail || null : null,
      platform: isSupporter ? record?.platform || null : null,
      syncStatus: record?.syncStatus || "cached",
      welcomeEmailConfirmed: record?.welcomeEmailConfirmed === true
    };
  }

  function normalizeApiResponse(payload) {
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.isSupporter !== "boolean" ||
      !isValidTimestamp(payload.lastVerifiedAt)
    ) {
      throw new SupporterRegistryError(
        "Your Supporter status could not be confirmed. Please try again.",
        { code: "malformed_response" }
      );
    }
    if (
      payload.isSupporter &&
      (!isValidSupporterSince(payload.supporterSince) ||
        typeof payload.name !== "string" ||
        !payload.name.trim() ||
        typeof payload.isPubliclyListed !== "boolean")
    ) {
      throw new SupporterRegistryError(
        "Your Supporter status could not be confirmed. Please try again.",
        { code: "malformed_response" }
      );
    }
    if (
      !payload.isSupporter &&
      (payload.supporterSince !== null ||
        payload.name !== null ||
        payload.isPubliclyListed !== null)
    ) {
      throw new SupporterRegistryError(
        "Your Supporter status could not be confirmed. Please try again.",
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
    const environment = configured.environment || "production";
    const baseUrl = configured.baseUrl || configured.baseUrls?.[environment];
    if (
      !baseUrl ||
      !/^https:\/\//i.test(baseUrl) ||
      !configured.routes?.claimSupporter ||
      !configured.routes?.status ||
      !Number.isFinite(configured.timeoutsMs?.claimSupporter) ||
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
      return "Previous PRO purchase claims are temporarily unavailable. Your existing purchase remains recognized, and every tool is already available.";
    }
    if (status === 429 || code === "supporter_rate_limited") {
      return "Too many requests were made. Please wait and try again.";
    }
    if (status === 422) {
      return fallback || "This previous purchase could not be confirmed. Please refresh your purchase history and try again.";
    }
    if (status === 400) {
      return fallback || "Some information was incomplete. Please review it and try again.";
    }
    if (status >= 500) {
      return "Supporter status is temporarily unavailable. Please try again later.";
    }
    return fallback || "Your Supporter status could not be updated.";
  }

  class SupporterRegistryService {
    constructor(config, dependencies = {}) {
      this.config = getConfiguredApi(config);
      this.fetch = dependencies.fetch || global.fetch?.bind(global);
      this.AbortController = dependencies.AbortController || global.AbortController;
      this.navigator = dependencies.navigator || global.navigator;
      this.console = dependencies.console || global.console;
      this.platform = dependencies.platform || getPlatform();
    }

    logRegistration(level, details) {
      const logger = this.console?.[level] || this.console?.log;
      if (typeof logger !== "function") return;
      const provider =
        details?.provider ||
        (details?.platform === "ios"
          ? "apple"
          : details?.platform === "android"
            ? "google"
            : null);
      const diagnostic = {
        event: details?.event || "supporter-registration-diagnostic",
        provider,
        productId: details?.productId || null,
        stage: details?.stage || null,
        routeName: details?.routeName || null,
        path:
          typeof details?.path === "string" &&
          /^\/api\/supporters\/[a-z0-9/-]+$/i.test(details.path)
            ? details.path
            : null,
        httpStatus: Number(details?.httpStatus || details?.responseStatus) || null,
        backendOutcome: details?.backendOutcome || details?.outcome || null,
        failureCategory: details?.failureCategory || null,
        retryable:
          typeof details?.retryable === "boolean" ? details.retryable : null,
        verifiedPurchaseEvidencePresent:
          typeof details?.verifiedPurchaseEvidencePresent === "boolean"
            ? details.verifiedPurchaseEvidencePresent
            : null,
        localPendingStateWritten:
          typeof details?.localPendingStateWritten === "boolean"
            ? details.localPendingStateWritten
            : null,
        acknowledgmentAttempted:
          typeof details?.acknowledgmentAttempted === "boolean"
            ? details.acknowledgmentAttempted
            : null
      };
      logger.call(
        this.console,
        `[Reverse Flow Supporter Registration] ${JSON.stringify(diagnostic)}`
      );
    }

    async runEnvironmentDiagnostic() {
      const route = this.config.routes.environment;
      if (!route || typeof this.fetch !== "function") return null;
      const controller = this.AbortController ? new this.AbortController() : null;
      const timeout = controller
        ? setTimeout(() => controller.abort(), this.config.timeoutsMs.environment || 10000)
        : null;
      let response;
      try {
        response = await this.fetch(`${this.config.baseUrl}${route}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller?.signal
        });
        const payload = await response.json();
        const platform = this.platform || "unknown";
        const diagnostic = {
          event: "mobile-support-environment-diagnostic",
          appVersion:
            typeof APP_VERSION === "string" ? APP_VERSION : "unknown",
          buildNumber:
            typeof APP_BUILD_NUMBERS === "object"
              ? APP_BUILD_NUMBERS[platform] || "unknown"
              : "unknown",
          platform,
          buildConfiguration: this.config.environment,
          resolvedApiOrigin: this.config.baseUrl,
          resolvedWebsiteOrigin: "https://reverse-flow.app",
          environmentCategory: payload?.environment || "unknown",
          backendDeploymentIdentifier:
            payload?.deploymentId || payload?.deploymentHost || null,
          backendCommit: payload?.deployedCommit || null,
          databaseEnvironmentIdentifier: payload?.database?.project || null,
          databaseMigrationLevel: payload?.database?.migrationLevel || null,
          httpStatus: response.status
        };
        this.console?.info?.(
          `[Reverse Flow Environment] ${JSON.stringify(diagnostic)}`
        );
        return diagnostic;
      } catch (error) {
        const diagnostic = {
          event: "mobile-support-environment-diagnostic-failed",
          appVersion:
            typeof APP_VERSION === "string" ? APP_VERSION : "unknown",
          platform: this.platform || "unknown",
          buildConfiguration: this.config.environment,
          resolvedApiOrigin: this.config.baseUrl,
          environmentCategory: this.config.environment,
          failureCategory:
            error?.name === "AbortError" ? "timeout" : "network_error"
        };
        this.console?.warn?.(
          `[Reverse Flow Environment] ${JSON.stringify(diagnostic)}`
        );
        return diagnostic;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }

    async request(routeKey, body, timeoutKey, options = {}) {
      const route = this.config.routes[routeKey];
      const url = `${this.config.baseUrl}${route}`;
      const isRegistration =
        routeKey === "claimSupporter" ||
        routeKey === "verifyPurchase" ||
        routeKey === "verifyPendingPurchase";
      const registrationEventPrefix =
        routeKey === "claimSupporter"
          ? "supporter-claim"
          : routeKey === "verifyPendingPurchase"
          ? "pending-support-verification"
          : options.registrationMode === "existing-supporter"
          ? "supporter-contribution-attachment"
          : "supporter-registration";
      const provider =
        body?.platform === "ios"
          ? "apple"
          : body?.platform === "android"
            ? "google"
            : null;
      const productId = body?.productIdentifier || null;
      const verifiedPurchaseEvidencePresent =
        provider === "apple"
          ? Boolean(
              body?.transactionEvidence?.transactionId ||
              body?.transactionEvidence?.originalTransactionId ||
              body?.entitlementEvidence?.originalTransactionId
            )
          : provider === "google"
            ? Boolean(
                body?.transactionEvidence?.purchaseToken ||
                body?.entitlementEvidence?.purchaseToken
              )
            : false;
      const diagnosticBase = {
        provider,
        productId,
        routeName: routeKey,
        path: route,
        verifiedPurchaseEvidencePresent,
        localPendingStateWritten: options.localPendingStateWritten === true,
        acknowledgmentAttempted: options.acknowledgmentAttempted === true
      };
      if (isRegistration) {
        this.logRegistration("info", {
          ...diagnosticBase,
          event: `${registrationEventPrefix}-request-started`,
          stage: "request",
          retryable: true
        });
      }
      if (this.navigator?.onLine === false) {
        if (isRegistration) {
          this.logRegistration("warn", {
            ...diagnosticBase,
            event: `${registrationEventPrefix}-failed`,
            stage: "transport",
            failureCategory: "offline",
            retryable: true
          });
        }
        throw new SupporterRegistryError(
          "An internet connection is required to update your supporter status.",
          { code: "offline" }
        );
      }
      if (typeof this.fetch !== "function") {
        if (isRegistration) {
          this.logRegistration("warn", {
            ...diagnosticBase,
            event: `${registrationEventPrefix}-failed`,
            stage: "transport",
            failureCategory: "transport_unavailable",
            retryable: true
          });
        }
        throw new SupporterRegistryError(
          "Supporter status is unavailable on this device.",
          { code: "transport_unavailable" }
        );
      }
      const timeoutMs = this.config.timeoutsMs[timeoutKey];
      const controller = this.AbortController ? new this.AbortController() : null;
      const timeout = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

      let response;
      try {
        const method = options.method || "POST";
        const headers = {
          Accept: "application/json",
          "Content-Type": "application/json"
        };
        if (method === "GET") {
          headers["X-Supporter-Email"] = String(body?.email || "");
        }
        response = await this.fetch(url, {
          method,
          headers: {
            ...headers
          },
          body: method === "GET" ? undefined : JSON.stringify(body),
          signal: controller?.signal
        });
      } catch (error) {
        const timedOut = error?.name === "AbortError";
        if (isRegistration) {
          this.logRegistration("warn", {
            ...diagnosticBase,
            event: `${registrationEventPrefix}-failed`,
            stage: "transport",
            failureCategory: timedOut ? "timeout" : "network_exception",
            retryable: true
          });
        }
        throw new SupporterRegistryError(
          timedOut
            ? "The request timed out. Please try again."
            : "Supporter status could not be reached. Check your connection and try again.",
          { code: timedOut ? "timeout" : "network_error" }
        );
      } finally {
        if (timeout) clearTimeout(timeout);
      }

      if (isRegistration) {
        this.logRegistration("info", {
          ...diagnosticBase,
          event: `${registrationEventPrefix}-response`,
          stage: "response",
          httpStatus: response.status,
          backendOutcome: response.ok ? "accepted" : "rejected",
          retryable: response.status >= 500 || response.status === 429
        });
      }

      let payload;
      try {
        const text = await response.text();
        payload = text ? JSON.parse(text) : null;
      } catch {
        if (isRegistration) {
          this.logRegistration("warn", {
            ...diagnosticBase,
            event: `${registrationEventPrefix}-failed`,
            stage: "response-parse",
            httpStatus: response.status,
            backendOutcome: "invalid-response",
            failureCategory: "malformed_response",
            retryable: true
          });
        }
        throw new SupporterRegistryError(
          "Your Supporter status could not be confirmed. Please try again.",
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
        if (isRegistration) {
          this.logRegistration("warn", {
            ...diagnosticBase,
            event: `${registrationEventPrefix}-failed`,
            stage:
              routeKey === "verifyPendingPurchase"
                ? "purchase-verification"
                : "supporter-registration",
            httpStatus: response.status,
            backendOutcome: "rejected",
            failureCategory:
              response.status === 429
                ? "rate_limited"
                : response.status >= 500
                  ? "backend_server_error"
                  : "backend_rejected",
            retryable: response.status >= 500 || response.status === 429
          });
        }
        throw new SupporterRegistryError(
          getRegistryErrorMessage(response.status, code, fallback),
          {
            code,
            status: response.status,
            retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : null
          }
        );
      }
      if (options.normalize === false) return payload;
      const normalized = normalizeApiResponse(payload);
      if (isRegistration) {
        this.logRegistration("info", {
          ...diagnosticBase,
          event: `${registrationEventPrefix}-request-completed`,
          stage:
            routeKey === "verifyPendingPurchase"
              ? "pending-record-persisted"
              : "supporter-registration",
          httpStatus: response.status,
          backendOutcome: "success",
          retryable: false
        });
      }
      return normalized;
    }

    async getStatus(email) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        throw new SupporterRegistryError(
          "A valid Supporter email is required for status lookup.",
          { code: "email_invalid" }
        );
      }
      try {
        return await this.request(
          "status",
          { email: normalizedEmail },
          "status",
          { method: "GET" }
        );
      } catch (error) {
        if (error?.code !== "method_not_allowed") throw error;
        return this.request("status", { email: normalizedEmail }, "status");
      }
    }

    async submitLegacyClaim(payload) {
      return this.claimSupporter(payload);
    }

    async claimSupporter(payload) {
      return this.request(
        "claimSupporter",
        {
          name: String(payload?.name || "").trim(),
          email: String(payload?.email || "").trim().toLowerCase(),
          public: payload?.public !== false
        },
        "claimSupporter"
      );
    }

    async registerVerifiedPurchase(payload, options = {}) {
      return this.request(
        "verifyPurchase",
        payload,
        "verifyPurchase",
        {
          registrationMode: options.existingSupporter === true
            ? "existing-supporter"
            : "registration",
          localPendingStateWritten: options.localPendingStateWritten === true,
          acknowledgmentAttempted: options.acknowledgmentAttempted === true
        }
      );
    }

    async verifyPendingPurchase(payload, options = {}) {
      return this.request(
        "verifyPendingPurchase",
        payload,
        "verifyPendingPurchase",
        {
          normalize: false,
          localPendingStateWritten: options.localPendingStateWritten === true,
          acknowledgmentAttempted: false
        }
      );
    }
  }

  class SupportPurchaseError extends Error {
    constructor(message, code) {
      super(message);
      this.name = "SupportPurchaseError";
      this.code = code || "support_purchase_error";
    }
  }

  function privacySafeTransactionReference(evidence, provider) {
    const raw = provider === "apple"
      ? evidence?.transactionId || evidence?.originalTransactionId
      : evidence?.purchaseToken;
    const value = String(raw || "");
    if (!value) return null;
    return `${provider}:…${value.slice(-6)}`;
  }

  function normalizeStoreEnvironment(value) {
    const environment = String(value || "").trim().toLowerCase();
    return ["sandbox", "production"].includes(environment)
      ? environment
      : null;
  }

  function basePlanIdFromOfferId(value) {
    const offerId = String(value || "");
    return ["monthly-3", "monthly-10"].find(basePlanId =>
      offerId === basePlanId || offerId.endsWith(`@${basePlanId}`)
    ) || null;
  }

  class PendingSupportRegistrationStore {
    constructor(storage, key = PURCHASE_RETRY_CACHE_KEY) {
      this.storage = storage || null;
      this.key = key;
    }

    read() {
      if (!this.storage?.getItem) return null;
      try {
        let parsed = JSON.parse(this.storage.getItem(this.key) || "null");
        if (!parsed && this.key === PURCHASE_RETRY_CACHE_KEY) {
          const legacy = JSON.parse(
            this.storage.getItem(LEGACY_PURCHASE_RETRY_CACHE_KEY) || "null"
          );
          if (legacy?.version === 1 && legacy?.transactionId) {
            parsed = this.write({
              paymentSource: "ios",
              productIdentifier: legacy.productIdentifier,
              transactionId: legacy.transactionId,
              originalTransactionId: legacy.originalTransactionId,
              purchaseTimestamp: legacy.purchaseTimestamp
            });
            this.storage.removeItem(LEGACY_PURCHASE_RETRY_CACHE_KEY);
          }
        }
        if (
          ![2, 3].includes(parsed?.version) ||
          !["apple", "google"].includes(parsed?.provider) ||
          !parsed?.productId ||
          !parsed?.transactionReference ||
          !["registration-required", "store-completion-required"].includes(
            parsed?.state
          ) ||
          !isValidTimestamp(parsed?.approvedAt) ||
          !PENDING_REGISTRATION_STATUSES.has(parsed?.lastRegistrationAttemptStatus)
        ) {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    }

    write(evidence) {
      if (!this.storage?.setItem) {
        throw new SupportPurchaseError(
          "Your Supporter setup could not be saved on this device. Please try again.",
          "purchase_retry_persistence_unavailable"
        );
      }
      const provider = evidence?.paymentSource === "ios" ? "apple"
        : evidence?.paymentSource === "android" ? "google" : null;
      const transactionReference = privacySafeTransactionReference(evidence, provider);
      const record = {
        version: 3,
        provider,
        productId: String(evidence?.productIdentifier || ""),
        basePlanId: basePlanIdFromOfferId(evidence?.basePlanId) ||
          basePlanIdFromOfferId(evidence?.offerId),
        transactionReference,
        environmentCategory:
          String(global.SUPPORTER_API_CONFIG?.environment || "unknown"),
        approvedAt:
          toIsoTimestamp(evidence?.purchaseTimestamp) || new Date().toISOString(),
        state: "store-completion-required",
        lastRegistrationAttemptAt: null,
        lastRegistrationAttemptStatus: "not-attempted"
      };
      if (!record.provider || !record.productId || !record.transactionReference) {
        throw new SupportPurchaseError(
          "The store did not provide the transaction reference required for recovery.",
          "purchase_retry_evidence_invalid"
        );
      }
      this.storage.setItem(this.key, JSON.stringify(record));
      return record;
    }

    markAttempt(status) {
      if (!PENDING_REGISTRATION_STATUSES.has(status)) return this.read();
      const record = this.read();
      if (!record) return null;
      const updated = {
        ...record,
        lastRegistrationAttemptAt: new Date().toISOString(),
        lastRegistrationAttemptStatus: status
      };
      this.storage.setItem(this.key, JSON.stringify(updated));
      return updated;
    }

    clear() {
      this.storage?.removeItem?.(this.key);
      this.storage?.removeItem?.(LEGACY_PURCHASE_RETRY_CACHE_KEY);
    }

    markEnvironment(environmentCategory) {
      const record = this.read();
      if (!record || !this.storage?.setItem) return record;
      const updated = {
        ...record,
        environmentCategory: String(environmentCategory || "unknown")
      };
      this.storage.setItem(this.key, JSON.stringify(updated));
      return updated;
    }
  }

  const SupportPurchaseRetryStore = PendingSupportRegistrationStore;

  const SUPPORT_UI_STATES = Object.freeze({
    NOT_SUPPORTER: "not-supporter",
    SUPPORTER: "supporter",
    SUPPORTER_REFRESHING: "supporter-refreshing",
    PURCHASE_IN_PROGRESS: "purchase-in-progress"
  });

  function resolveSupporterUiPresentation(state, context = {}) {
    const phase = context.phase || SUPPORT_UI_STATES.NOT_SUPPORTER;
    const retainedState = context.lastConfirmedState?.isSupporter
      ? context.lastConfirmedState
      : null;
    const effectiveState = state?.isSupporter
      ? state
      : phase !== SUPPORT_UI_STATES.NOT_SUPPORTER
        ? retainedState || state
        : state;
    if (!effectiveState?.isSupporter) {
      return {
        uiState: phase === SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
          ? SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
          : SUPPORT_UI_STATES.NOT_SUPPORTER,
        state,
        action: resolveSupportAction(state)
      };
    }
    const action =
      (
        phase === SUPPORT_UI_STATES.SUPPORTER_REFRESHING ||
        phase === SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
      ) &&
      context.lastConfirmedAction === ACTIONS.MANAGE
        ? ACTIONS.MANAGE
        : resolveSupportAction(effectiveState);
    return {
      uiState:
        phase === SUPPORT_UI_STATES.SUPPORTER_REFRESHING ||
        phase === SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
          ? phase
          : SUPPORT_UI_STATES.SUPPORTER,
      state: effectiveState,
      action
    };
  }

  class SupportPurchaseService {
    constructor(config, dependencies = {}) {
      this.config = config || {};
      this.global = dependencies.global || global;
      this.store = dependencies.store || this.global.CdvPurchase?.store || null;
      const storage = dependencies.storage || this.global.localStorage;
      this.oneTimeRetryStore = dependencies.pendingStore || dependencies.retryStore ||
        new PendingSupportRegistrationStore(
          storage
        );
      this.subscriptionRetryStore = dependencies.subscriptionPendingStore ||
        new PendingSupportRegistrationStore(
          storage,
          SUBSCRIPTION_RETRY_CACHE_KEY
        );
      this.supporterCache = dependencies.supporterCache ||
        new SupporterCache(storage);
      this.storage = storage || null;
      this.googlePurchaseAcknowledger =
        dependencies.googlePurchaseAcknowledger || null;
      this.apiEnvironment =
        dependencies.apiEnvironment ||
        this.global.SUPPORTER_API_CONFIG?.environment ||
        (typeof SUPPORTER_API_CONFIG === "object"
          ? SUPPORTER_API_CONFIG.environment
          : "unknown");
      // Compatibility alias for callers that predate product-specific stores.
      this.retryStore = this.oneTimeRetryStore;
      this.initialization = null;
      this.initialized = false;
      this.initializeError = null;
      this.purchaseInFlight = null;
      this.waiters = new Map();
      this.listeners = new Set();
      this.recoveryListeners = new Set();
      this.bound = false;
      this.nativeRecoveryBound = false;
      this.receivedTransactionKeys = new Set();
      this.completedTransactionKeys = new Set();
      this.reconciliationRequests = new Map();
      this.googleAcknowledgmentRequests = new Map();
      this.googleSubscriptionFinalizingKeys = new Set();
      this.acknowledgedTransactionKeys = new Set();
      this.finishedTransactionKeys = new Set();
      this.supportUiState = SUPPORT_UI_STATES.NOT_SUPPORTER;
      this.lastConfirmedSupporterState = null;
      this.lastConfirmedSupportAction = null;
      this.subscriptionVerificationState = {
        status: "none",
        provider: null,
        productId: null,
        message: null
      };
      this.storeReportedPendingSubscriptionChange = null;
      this.authoritativeActiveMonthlyProductId = null;
      this.authoritativeMonthlyStateChecked = false;
      this.lastDerivedBillingState = null;
    }

    getOptions(platform) {
      const ids = this.config[platform] || {};
      const definitions = [
        { key: "oneTime5", title: "One-Time Support", type: "one-time", amount: 5 },
        { key: "monthly3", title: "Monthly Support", type: "monthly", amount: 3 },
        { key: "monthly10", title: "Monthly Support", type: "monthly", amount: 10 }
      ];
      return definitions.map(definition => {
        const configured = typeof ids[definition.key] === "string"
          ? { productId: ids[definition.key] }
          : ids[definition.key] || {};
        const product = configured.productId && this.storePlatform
          ? this.store?.get?.(configured.productId, this.storePlatform)
          : null;
        const offer = this.getOffer(product, configured, platform);
        const pricing = offer?.pricingPhases?.slice(-1)[0] || product?.pricing || null;
        const localizedPrice = pricing?.price || null;
        const suffix = definition.type === "monthly" ? "/month" : "";
        const state = !configured.productId || platform === "web"
          ? "unavailable"
          : !this.initialized
            ? "loading"
            : product && offer && localizedPrice
              ? "ready"
              : "unavailable";
        return {
          ...definition,
          ...configured,
          productId: configured.productId || null,
          localizedPrice,
          label: localizedPrice
            ? `${definition.title} — ${localizedPrice}${suffix}`
            : definition.title,
          state,
          offer,
          owned: product?.owned === true,
          repurchaseRestricted:
            definition.type === "one-time" &&
            configured.productType !== "consumable" &&
            product?.owned === true
        };
      });
    }

    readBillingHistory() {
      try {
        const record = JSON.parse(
          this.storage?.getItem?.(BILLING_HISTORY_CACHE_KEY) || "null"
        );
        return record?.previouslySupported === true
          ? {
              previouslySupported: true,
              lastBillingState:
                Object.values(BILLING_STATES).includes(
                  record.lastBillingState
                )
                  ? record.lastBillingState
                  : BILLING_STATES.PREVIOUSLY_SUPPORTED,
              lastProductId:
                this.supportProductIds().has(record.lastProductId)
                  ? record.lastProductId
                  : null,
              lastBasePlanId: basePlanIdFromOfferId(record.lastBasePlanId),
              lastSupportedAt: isValidTimestamp(record.lastSupportedAt)
                ? record.lastSupportedAt
                : null
            }
          : { previouslySupported: false };
      } catch {
        return { previouslySupported: false };
      }
    }

    recordBillingHistory(evidence) {
      const derivedMonthlyState =
        (
          Boolean(evidence?.basePlanId) &&
          evidence.basePlanId === this.config?.google?.monthly10?.basePlanId
        ) ||
        (
          evidence?.paymentSource === "ios" &&
          evidence?.productIdentifier === this.config?.apple?.monthly10?.productId
        )
          ? BILLING_STATES.ACTIVE_MONTHLY_10
          : evidence?.purchaseType === "monthly"
            ? BILLING_STATES.ACTIVE_MONTHLY_3
            : BILLING_STATES.PREVIOUSLY_SUPPORTED;
      const authoritativeMonthlyState = this.billingStateForMonthlyProduct(
        this.authoritativeActiveMonthlyProductId
      );
      const monthlyState =
        authoritativeMonthlyState || derivedMonthlyState;
      const authoritativeProductId =
        authoritativeMonthlyState
          ? this.authoritativeActiveMonthlyProductId
          : null;
      const record = {
        previouslySupported: true,
        lastBillingState: monthlyState,
        lastProductId: this.supportProductIds().has(
          authoritativeProductId || evidence?.productIdentifier
        )
          ? authoritativeProductId || evidence.productIdentifier
          : null,
        lastBasePlanId: basePlanIdFromOfferId(evidence?.basePlanId),
        lastSupportedAt:
          toIsoTimestamp(evidence?.purchaseTimestamp) ||
          new Date().toISOString()
      };
      this.storage?.setItem?.(
        BILLING_HISTORY_CACHE_KEY,
        JSON.stringify(record)
      );
      return record;
    }

    recordBillingState(state) {
      if (!this.storage?.setItem || state === BILLING_STATES.NEVER_PURCHASED) {
        return;
      }
      const authoritativeMonthlyState = this.billingStateForMonthlyProduct(
        this.authoritativeActiveMonthlyProductId
      );
      const persistedState = authoritativeMonthlyState || state;
      const current = this.readBillingHistory();
      this.storage.setItem(BILLING_HISTORY_CACHE_KEY, JSON.stringify({
        ...current,
        previouslySupported: true,
        lastBillingState: persistedState,
        lastProductId:
          authoritativeMonthlyState
            ? this.authoritativeActiveMonthlyProductId
            : current.lastProductId || null,
        lastCheckedAt: new Date().toISOString()
      }));
    }

    logBillingStateTransition(nextState, reason, details = {}) {
      const previousState = this.lastDerivedBillingState;
      this.lastDerivedBillingState = nextState;
      if (previousState === nextState) return nextState;
      const history = this.readBillingHistory();
      const pending =
        this.readPendingSubscriptionRegistration() ||
        this.readPendingRegistration();
      const claim = this.supporterCache.read();
      console.info(
        `[Reverse Flow Support Purchase] ${JSON.stringify({
          event: "billing-state-transition",
          previousNormalizedState: previousState,
          nextNormalizedState: nextState,
          reason,
          currentProductId: details.currentProductId || null,
          activeSubscriptionProductId:
            this.authoritativeActiveMonthlyProductId ||
            details.activeSubscriptionProductId ||
            null,
          historyFlag: history.previouslySupported === true,
          pendingProductId: pending?.productId || null,
          backendClaimState:
            claim.isSupporter === true
              ? CLAIM_STATES.CLAIMED
              : CLAIM_STATES.UNCLAIMED,
          timestamp: new Date().toISOString()
        })}`
      );
      return nextState;
    }

    billingStateForMonthlyProduct(productId) {
      if (productId === this.config?.apple?.monthly10?.productId) {
        return BILLING_STATES.ACTIVE_MONTHLY_10;
      }
      if (productId === this.config?.apple?.monthly3?.productId) {
        return BILLING_STATES.ACTIVE_MONTHLY_3;
      }
      return null;
    }

    async refreshAppleCurrentSubscriptions() {
      if (getPlatform() !== "ios") return null;
      const plugin = this.global.Capacitor?.Plugins?.SupportPurchaseRecovery;
      if (!plugin?.currentSupportSubscriptions) {
        this.logTransaction("apple-subscription-bridge-failed", {
          paymentSource: "ios",
          productIdentifier: null
        }, {
          stage: "storekit2-current-entitlements",
          failureCategory: "bridge-unavailable",
          retryable: true
        });
        return null;
      }
      try {
        const result = await plugin.currentSupportSubscriptions();
        const configuredMonthlyIds = new Set([
          this.config?.apple?.monthly3?.productId,
          this.config?.apple?.monthly10?.productId
        ].filter(Boolean));
        const subscriptions = Array.isArray(result?.subscriptions)
          ? result.subscriptions
          : [];
        const activeProductIds = subscriptions
          .map(subscription => subscription?.productId)
          .filter(productId => configuredMonthlyIds.has(productId));
        this.authoritativeActiveMonthlyProductId =
          activeProductIds.includes(this.config?.apple?.monthly10?.productId)
            ? this.config.apple.monthly10.productId
            : activeProductIds.includes(this.config?.apple?.monthly3?.productId)
              ? this.config.apple.monthly3.productId
              : null;
        const activeSubscription = subscriptions.find(subscription =>
          subscription?.productId ===
          this.authoritativeActiveMonthlyProductId
        );
        const pendingProductId =
          activeSubscription?.pendingProductId || null;
        this.storeReportedPendingSubscriptionChange =
          pendingProductId &&
          pendingProductId !== this.authoritativeActiveMonthlyProductId &&
          configuredMonthlyIds.has(pendingProductId)
            ? {
                storeReported: true,
                provider: "apple",
                currentProductId: this.authoritativeActiveMonthlyProductId,
                targetProductId: pendingProductId,
                targetBasePlanId: null,
                effectiveDate:
                  activeSubscription?.renewalDate || null
              }
            : null;
        this.authoritativeMonthlyStateChecked = true;
        const state = this.billingStateForMonthlyProduct(
          this.authoritativeActiveMonthlyProductId
        );
        if (state) this.recordBillingState(state);
        this.logTransaction("apple-subscription-entitlements-refreshed", {
          paymentSource: "ios",
          productIdentifier: this.authoritativeActiveMonthlyProductId
        }, {
          stage: "storekit2-current-entitlements",
          backendOutcome: state ? "active" : "no-active-subscription",
          retryable: false
        });
        return this.authoritativeActiveMonthlyProductId;
      } catch (error) {
        this.logTransaction("apple-subscription-bridge-failed", {
          paymentSource: "ios",
          productIdentifier: this.authoritativeActiveMonthlyProductId
        }, {
          stage: "storekit2-current-entitlements",
          failureCategory: error?.code || "native-bridge-error",
          retryable: true
        });
        return null;
      }
    }

    getStoreReportedPendingSubscriptionChange(platform = getPlatform()) {
      if (platform === "ios" || platform === "apple") {
        return this.storeReportedPendingSubscriptionChange;
      }
      if (platform !== "android" && platform !== "google") return null;
      const evidence = this.activeRecurringPurchaseEvidenceList().find(item =>
        item.transaction?.nativePurchase?.pendingPurchaseUpdate
      );
      if (!evidence) return null;
      const pendingUpdate =
        evidence.transaction.nativePurchase.pendingPurchaseUpdate;
      const reportedProductIds = Array.isArray(pendingUpdate?.productIds)
        ? pendingUpdate.productIds
        : [];
      const supportedProductId = reportedProductIds.find(productId =>
        this.supportProductIds("android").has(productId)
      ) || null;
      if (!supportedProductId) return null;
      return {
        storeReported: true,
        provider: "google",
        currentProductId: evidence.productIdentifier,
        targetProductId: supportedProductId,
        targetBasePlanId: null,
        effectiveDate: null
      };
    }

    deriveBillingState(platform = getPlatform()) {
      const configKey =
        platform === "ios" || platform === "apple"
          ? "apple"
          : platform === "android" || platform === "google"
            ? "google"
            : null;
      if (!configKey) {
        return this.logBillingStateTransition(
          BILLING_STATES.BILLING_UNAVAILABLE,
          "unsupported-platform"
        );
      }
      const pendingRecovery = this.readPendingRegistration();
      if (
        configKey === "apple" &&
        !this.initialized &&
        pendingRecovery?.provider === "apple"
      ) {
        return this.logBillingStateTransition(
          BILLING_STATES.NEVER_PURCHASED,
          "pending-apple-reconciliation"
        );
      }
      const options = this.getOptions(configKey);
      const cachedBilling = this.readBillingHistory();
      const activeEvidence = configKey === "google"
        ? this.activeRecurringPurchaseEvidenceList()[0] || null
        : null;
      const activeBasePlanId =
        activeEvidence?.basePlanId ||
        (
          activeEvidence?.productIdentifier === cachedBilling.lastProductId
            ? cachedBilling.lastBasePlanId
            : null
        );
      const authoritativeAppleOption =
        configKey === "apple" && this.authoritativeActiveMonthlyProductId
          ? options.find(option =>
              option.type === "monthly" &&
              option.productId === this.authoritativeActiveMonthlyProductId
            )
          : null;
      const activeMonthly = authoritativeAppleOption || (activeEvidence
        ? options.find(option =>
            option.type === "monthly" &&
            option.basePlanId === activeBasePlanId
          )
        : options
            .filter(option => option.type === "monthly" && option.owned)
            .sort((left, right) => Number(right.amount) - Number(left.amount))[0]);
      if (activeMonthly?.amount === 10) {
        this.recordBillingState(BILLING_STATES.ACTIVE_MONTHLY_10);
        return this.logBillingStateTransition(
          BILLING_STATES.ACTIVE_MONTHLY_10,
          authoritativeAppleOption
            ? "storekit2-current-entitlements"
            : "store-active-product",
          {
            currentProductId: activeMonthly.productId,
            activeSubscriptionProductId: activeMonthly.productId
          }
        );
      }
      if (activeMonthly?.amount === 3) {
        this.recordBillingState(BILLING_STATES.ACTIVE_MONTHLY_3);
        return this.logBillingStateTransition(
          BILLING_STATES.ACTIVE_MONTHLY_3,
          authoritativeAppleOption
            ? "storekit2-current-entitlements"
            : "store-active-product",
          {
            currentProductId: activeMonthly.productId,
            activeSubscriptionProductId: activeMonthly.productId
          }
        );
      }
      if (
        (
          !this.initialized ||
          (configKey === "apple" && !this.authoritativeMonthlyStateChecked) ||
          !options.some(option =>
            option.type === "monthly" && option.state === "ready"
          )
        ) &&
        [
          BILLING_STATES.ACTIVE_MONTHLY_3,
          BILLING_STATES.ACTIVE_MONTHLY_10
        ].includes(cachedBilling.lastBillingState)
      ) {
        return this.logBillingStateTransition(
          cachedBilling.lastBillingState,
          "cached-active-state-awaiting-authoritative-refresh",
          { currentProductId: cachedBilling.lastProductId }
        );
      }
      const hasStoreHistory = this.allSupportTransactions().some(transaction =>
        this.supportProductIds().has(this.transactionProductId(transaction))
      );
      if (
        hasStoreHistory ||
        cachedBilling.previouslySupported ||
        Boolean(this.global.hasLegacyProEntitlement?.())
      ) {
        this.recordBillingState(BILLING_STATES.PREVIOUSLY_SUPPORTED);
        return this.logBillingStateTransition(
          BILLING_STATES.PREVIOUSLY_SUPPORTED,
          "historical-support-without-active-subscription",
          { currentProductId: cachedBilling.lastProductId }
        );
      }
      if (
        this.initializeError ||
        (
          this.initialized &&
          !options.some(option => option.state === "ready")
        )
      ) {
        return this.logBillingStateTransition(
          BILLING_STATES.BILLING_UNAVAILABLE,
          "store-state-unavailable"
        );
      }
      return this.logBillingStateTransition(
        BILLING_STATES.NEVER_PURCHASED,
        "no-store-or-history-evidence"
      );
    }

    async refreshBillingState() {
      await this.initialize();
      if (typeof this.store?.update === "function") {
        await this.store.update();
      }
      if (getPlatform() === "ios") {
        await this.refreshAppleCurrentSubscriptions();
      }
      if (getPlatform() === "android") {
        await this.reconcileGooglePlaySubscriptions();
      }
      return this.deriveBillingState();
    }

    getStorePlatform(platform = getPlatform()) {
      const purchases = this.global.CdvPurchase;
      if (platform === "ios") return purchases?.Platform?.APPLE_APPSTORE || null;
      if (platform === "android") return purchases?.Platform?.GOOGLE_PLAY || null;
      return null;
    }

    getOffer(product, configured, platform = getPlatform()) {
      if (!product) return null;
      if (platform === "google" || platform === "android") {
        const suffix = configured.basePlanId || configured.purchaseOptionId;
        if (suffix) {
          const expectedId = `${configured.productId}@${suffix}`;
          const offers = Array.isArray(product.offers) ? product.offers : [];
          const matchingOffer =
            product.getOffer?.(expectedId) ||
            product.getOffer?.(suffix) ||
            offers.find(offer =>
              offer?.id === expectedId ||
              offer?.id === suffix ||
              String(offer?.id || "").endsWith(`@${suffix}`)
            );
          if (matchingOffer) return matchingOffer;
          if (configured.purchaseOptionId && offers.length === 1) {
            return offers[0];
          }
          return null;
        }
      }
      return product.getOffer?.() || product.offers?.[0] || null;
    }

    onChange(listener) {
      if (typeof listener === "function") this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    onRecovery(listener) {
      if (typeof listener === "function") this.recoveryListeners.add(listener);
      return () => this.recoveryListeners.delete(listener);
    }

    notifyRecovery(evidence) {
      this.recoveryListeners.forEach(listener => {
        try {
          listener(evidence);
        } catch (error) {
          console.warn(
            `[Reverse Flow Support Purchase] ${JSON.stringify({
              event: "consumable-recovery-listener-failed",
              failureCategory: error?.code || "listener_error"
            })}`
          );
        }
      });
    }

    notify() {
      this.listeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          console.warn(
            `[Reverse Flow Support Purchase] ${JSON.stringify({
              event: "support-purchase-listener-failed",
              failureCategory: error?.code || "listener_error"
            })}`
          );
        }
      });
    }

    observeSupporterState(state) {
      if (state?.isSupporter) {
        this.lastConfirmedSupporterState = state;
        if (
          this.supportUiState !== SUPPORT_UI_STATES.SUPPORTER_REFRESHING &&
          this.supportUiState !== SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
        ) {
          this.lastConfirmedSupportAction = resolveSupportAction(state);
          this.supportUiState = SUPPORT_UI_STATES.SUPPORTER;
        }
      } else if (
        !this.lastConfirmedSupporterState &&
        this.supportUiState !== SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
      ) {
        this.supportUiState = SUPPORT_UI_STATES.NOT_SUPPORTER;
      }
      return resolveSupporterUiPresentation(state, {
        phase: this.supportUiState,
        lastConfirmedState: this.lastConfirmedSupporterState,
        lastConfirmedAction: this.lastConfirmedSupportAction
      });
    }

    beginSupportUiOperation(uiState) {
      const current = this.supporterCache.read();
      if (current.isSupporter) {
        this.lastConfirmedSupporterState = current;
        this.lastConfirmedSupportAction =
          this.lastConfirmedSupportAction || resolveSupportAction(current);
      }
      this.supportUiState = uiState;
      this.notify();
    }

    endSupportUiOperation() {
      const current = this.supporterCache.read();
      if (current.isSupporter) {
        this.lastConfirmedSupporterState = current;
        this.lastConfirmedSupportAction = resolveSupportAction(current);
        this.supportUiState = SUPPORT_UI_STATES.SUPPORTER;
      } else if (!this.lastConfirmedSupporterState) {
        this.supportUiState = SUPPORT_UI_STATES.NOT_SUPPORTER;
      }
      this.notify();
    }

    beginSubscriptionVerification(evidence) {
      if (evidence?.purchaseType !== "monthly") return;
      this.subscriptionVerificationState = {
        status: "verifying",
        provider: evidence.paymentSource === "ios" ? "apple" : "google",
        productId: evidence.productIdentifier,
        message: null
      };
    }

    completeSubscriptionVerification(evidence, status = "verified") {
      if (evidence?.purchaseType !== "monthly") return;
      this.subscriptionVerificationState = {
        status,
        provider: evidence.paymentSource === "ios" ? "apple" : "google",
        productId: evidence.productIdentifier,
        message: null
      };
    }

    failSubscriptionVerification(evidence, error) {
      if (evidence?.purchaseType !== "monthly") return;
      this.subscriptionVerificationState = {
        status: "failed",
        provider: evidence.paymentSource === "ios" ? "apple" : "google",
        productId: evidence.productIdentifier,
        message: safeStoreErrorMessage(
          error,
          "The store could not verify this subscription."
        )
      };
    }

    markSubscriptionRefreshResult(result) {
      const cached = this.supporterCache.read();
      if (!cached.isSupporter || cached.contribution?.type !== "monthly") return;
      const platform = getPlatform();
      const provider = platform === "ios" ? "apple" : "google";
      if (["offline", "stale"].includes(result?.syncStatus)) {
        this.subscriptionVerificationState = {
          status: "cached",
          provider,
          productId: cached.contribution?.productId || null,
          message: null
        };
      } else if (result?.hasActiveRecurringSupport) {
        this.subscriptionVerificationState = {
          status: "verified",
          provider,
          productId: result.contribution?.productId || null,
          message: null
        };
      } else {
        this.subscriptionVerificationState = {
          status: "inactive",
          provider,
          productId: null,
          message: null
        };
      }
    }

    renderSubscriptionVerificationStatus(element) {
      if (!element) return;
      const state = this.subscriptionVerificationState;
      const providerName = state.provider === "apple" ? "Apple" : "Google Play";
      let message = "";
      if (state.status === "verifying") {
        message = `Refreshing ${providerName} subscription status…`;
      } else if (state.status === "cached") {
        message =
          `Using your last confirmed Supporter status while ${providerName} refresh is temporarily unavailable.`;
      } else if (state.status === "failed") {
        message = state.message;
      } else if (state.status === "inactive") {
        message = "No active monthly subscription was found.";
      }
      if (message) {
        element.textContent = message;
        element.dataset.verificationOwned = "true";
        element.dataset.verificationMessage = message;
      } else if (element.dataset.verificationOwned === "true") {
        if (element.textContent === element.dataset.verificationMessage) {
          element.textContent = "";
        }
        delete element.dataset.verificationOwned;
        delete element.dataset.verificationMessage;
      }
    }

    async refreshConfirmedSupporter(callback) {
      this.beginSupportUiOperation(SUPPORT_UI_STATES.SUPPORTER_REFRESHING);
      try {
        const result = await callback();
        this.markSubscriptionRefreshResult(result);
        return result;
      } finally {
        this.endSupportUiOperation();
      }
    }

    supportProductIds(platform = getPlatform()) {
      const storeKey = platform === "ios" ? "apple" : platform === "android" ? "google" : platform;
      const ids = new Set(
        Object.values(this.config[storeKey] || {})
          .map(value => typeof value === "string" ? value : value?.productId)
          .filter(Boolean)
      );
      if (storeKey === "google") {
        Object.keys(LEGACY_GOOGLE_SUBSCRIPTION_PRODUCTS)
          .forEach(productId => ids.add(productId));
      }
      return ids;
    }

    transactionProductId(transaction) {
      const allowed = this.supportProductIds();
      return transaction?.products
        ?.map(product => product?.id)
        .find(productId => allowed.has(productId)) || null;
    }

    transactionEvidence(transaction, option = null) {
      const productIdentifier = this.transactionProductId(transaction) || option?.productId;
      const productOfferId =
        transaction?.products?.find(product => product?.id === productIdentifier)
          ?.offerId ||
        option?.offer?.id ||
        null;
      const basePlanId =
        basePlanIdFromOfferId(productOfferId) ||
        basePlanIdFromOfferId(option?.basePlanId);
      const configuredOption = this.getOptions(getPlatform() === "ios" ? "apple" : "google")
        .find(candidate =>
          candidate.productId === productIdentifier &&
          (
            !basePlanId ||
            candidate.basePlanId === basePlanId
          )
        ) || option;
      const nativePurchase = transaction?.nativePurchase || {};
      const legacyGoogleSubscription =
        getPlatform() === "android"
          ? LEGACY_GOOGLE_SUBSCRIPTION_PRODUCTS[productIdentifier] || null
          : null;
      return {
        paymentSource: getPlatform(),
        productIdentifier,
        purchaseType:
          configuredOption?.type ||
          option?.type ||
          (legacyGoogleSubscription ? "monthly" : null),
        monthlyAmount:
          configuredOption?.type === "monthly"
            ? configuredOption.amount
            : legacyGoogleSubscription?.monthlyAmount || null,
        basePlanId:
          configuredOption?.type === "monthly" || legacyGoogleSubscription
            ? basePlanId ||
              configuredOption?.basePlanId ||
              legacyGoogleSubscription?.basePlanId ||
              null
            : null,
        transactionId: transaction?.transactionId || null,
        originalTransactionId:
          transaction?.originalTransactionId ||
          nativePurchase?.originalTransactionId ||
          null,
        purchaseToken:
          transaction?.purchaseId ||
          nativePurchase?.purchaseToken ||
          null,
        purchaseTimestamp: toIsoTimestamp(
          transaction?.purchaseDate || nativePurchase?.purchaseTime
        ),
        expirationTimestamp: toIsoTimestamp(transaction?.expirationDate),
        signedTransaction: transaction?.jwsRepresentation || null,
        environment: normalizeStoreEnvironment(
          transaction?.environment || nativePurchase?.environment
        ),
        offerId: productOfferId,
        purchaseState:
          String(
            nativePurchase?.purchaseState ||
            transaction?.state ||
            ""
          ).toLowerCase() || null,
        acknowledged:
          String(transaction?.state || "").toLowerCase() === "finished" ||
          nativePurchase?.acknowledged === true,
        transaction
      };
    }

    isOneTimeEvidence(evidence) {
      return evidence?.purchaseType === "one-time" ||
        evidence?.productIdentifier === this.oneTimeSupportProductId();
    }

    retryStoreForEvidence(evidence) {
      return this.isOneTimeEvidence(evidence)
        ? this.oneTimeRetryStore
        : this.subscriptionRetryStore;
    }

    persistPendingEvidence(evidence) {
      return this.retryStoreForEvidence(evidence).write(evidence);
    }

    markPendingAttempt(evidence, status) {
      return this.retryStoreForEvidence(evidence).markAttempt(status);
    }

    clearPendingRegistration(evidence) {
      this.retryStoreForEvidence(evidence).clear();
    }

    clearStalePendingRegistration(pending, reason) {
      const evidence = {
        paymentSource: pending?.provider === "apple" ? "ios" : "android",
        productIdentifier: pending?.productId || null,
        purchaseType:
          pending?.productId === this.oneTimeSupportProductId()
            ? "one-time"
            : "monthly"
      };
      const pendingStore = this.retryStoreForEvidence(evidence);
      pendingStore.clear();
      const history = this.readBillingHistory();
      const hasMatchingStoreHistory = this.allSupportTransactions()
        .some(transaction =>
          this.transactionProductId(transaction) === pending?.productId
        );
      if (
        !hasMatchingStoreHistory &&
        history.lastProductId === pending?.productId
      ) {
        this.storage?.removeItem?.(BILLING_HISTORY_CACHE_KEY);
      }
      this.logTransaction(
        "stale-pending-recovery-cleared",
        evidence,
        {
          stage: "store-reconciliation",
          failureCategory: reason,
          retryable: false
        }
      );
      this.notify();
    }

    isSupersededSubscriptionEvidence(evidence) {
      if (
        evidence?.paymentSource !== "ios" ||
        evidence?.purchaseType !== "monthly"
      ) {
        return false;
      }
      const cached = this.supporterCache.read();
      const cachedProductId = cached.contribution?.productId;
      if (
        !cached.isSupporter ||
        !cached.hasActiveRecurringSupport ||
        !cachedProductId ||
        cachedProductId === evidence.productIdentifier
      ) {
        return false;
      }
      const confirmedAt = Date.parse(cached.lastVerifiedAt || "");
      const purchasedAt = Date.parse(evidence.purchaseTimestamp || "");
      return Number.isFinite(confirmedAt) &&
        Number.isFinite(purchasedAt) &&
        confirmedAt >= purchasedAt;
    }

    transactionKey(evidence) {
      const provider = evidence?.paymentSource || "unknown";
      const reference = provider === "ios"
        ? evidence?.transactionId || evidence?.originalTransactionId
        : evidence?.purchaseToken;
      return [
        provider,
        evidence?.productIdentifier || "unknown-product",
        String(reference || "missing-reference")
      ].join(":");
    }

    logTransaction(event, evidence, extra = {}) {
      const diagnostic = {
        event,
        provider: evidence?.paymentSource === "ios" ? "apple" : "google",
        productId: evidence?.productIdentifier || null,
        basePlanId: evidence?.basePlanId || null,
        purchaseState: evidence?.purchaseState || null,
        acknowledged:
          typeof evidence?.acknowledged === "boolean"
            ? evidence.acknowledged
            : null,
        acknowledgmentResult: extra.acknowledgmentResult || null,
        stage: extra.stage || extra.lifecycle || null,
        backendOutcome: extra.backendOutcome || extra.outcome || null,
        failureCategory: extra.failureCategory || null,
        retryable:
          typeof extra.retryable === "boolean" ? extra.retryable : null,
        localPendingStateWritten:
          typeof extra.localPendingStateWritten === "boolean"
            ? extra.localPendingStateWritten
            : null,
        acknowledgmentAttempted:
          typeof extra.acknowledgmentAttempted === "boolean"
            ? extra.acknowledgmentAttempted
            : null,
        oldProductId: extra.oldProductId || null,
        oldBasePlanId: extra.oldBasePlanId || null,
        targetBasePlanId: extra.targetBasePlanId || null,
        replacementMode: extra.replacementMode || null,
        oldPurchaseTokenPresent:
          typeof extra.oldPurchaseTokenPresent === "boolean"
            ? extra.oldPurchaseTokenPresent
            : null,
        activeProductCount:
          Number.isFinite(extra.activeProductCount)
            ? extra.activeProductCount
            : null
      };
      console.info(
        `[Reverse Flow Support Purchase] ${JSON.stringify(diagnostic)}`
      );
    }

    settleTransaction(transaction, kind) {
      const productId = this.transactionProductId(transaction);
      if (!productId) return false;
      const waiter = this.waiters.get(productId);
      if (!waiter) return false;
      this.waiters.delete(productId);
      clearTimeout(waiter.timeout);
      if (kind === "approved") {
        const evidence = this.transactionEvidence(transaction, waiter.option);
        const key = this.transactionKey(evidence);
        this.logTransaction("purchase-discovered", evidence, {
          lifecycle: "approved"
        });
        if (this.receivedTransactionKeys.has(key)) {
          this.logTransaction("store-transaction-duplicate-ignored", evidence, {
            lifecycle: "approved"
          });
          waiter.reject(new SupportPurchaseError(
            "This store transaction is already being confirmed.",
            "purchase_duplicate_callback"
          ));
          return true;
        }
        this.receivedTransactionKeys.add(key);
        try {
          this.persistPendingEvidence(evidence);
          this.logTransaction("support-pending-state-written", evidence, {
            stage: "local-persistence",
            localPendingStateWritten: true,
            retryable: true
          });
        } catch (error) {
          this.logTransaction(
            "support-pending-state-write-deferred",
            evidence,
            {
              stage: "local-persistence",
              failureCategory:
                error?.code || "pending_state_write_failed",
              localPendingStateWritten: false,
              retryable: true
            }
          );
          if (
            evidence.paymentSource !== "android" ||
            evidence.purchaseType !== "monthly"
          ) {
            this.receivedTransactionKeys.delete(key);
            waiter.reject(error);
            return true;
          }
        }
        waiter.resolve(evidence);
      } else if (kind === "pending") {
        waiter.reject(new SupportPurchaseError(
          "This purchase is pending store approval. Supporter status will update after payment completes.",
          "purchase_pending"
        ));
      } else {
        waiter.reject(new SupportPurchaseError(
          "The store could not complete this purchase. Please try again.",
          "purchase_failed"
        ));
      }
      return true;
    }

    oneTimeSupportProductId() {
      return this.config?.apple?.oneTime5?.productId ||
        (typeof this.config?.apple?.oneTime5 === "string"
          ? this.config.apple.oneTime5
          : "reverse_flow_support_one_time_5");
    }

    captureRecoverableConsumable(evidence, source) {
      if (
        getPlatform() !== "ios" ||
        evidence?.productIdentifier !== this.oneTimeSupportProductId() ||
        !evidence?.transactionId
      ) {
        return null;
      }
      this.persistPendingEvidence(evidence);
      const recoverable = {
        ...evidence,
        recoverySource: source,
        transaction: evidence.transaction || null
      };
      this.logTransaction("unfinished-transaction-found", recoverable, {
        stage: source,
        retryable: true
      });
      this.notifyRecovery(recoverable);
      return recoverable;
    }

    bindNativeRecoveryBridge() {
      if (this.nativeRecoveryBound || getPlatform() !== "ios") return;
      const plugin = this.global.Capacitor?.Plugins?.SupportPurchaseRecovery;
      if (!plugin?.addListener) return;
      this.nativeRecoveryBound = true;
      void plugin.addListener("unfinishedConsumableAvailable", result => {
        this.captureRecoverableConsumable(
          this.nativeRecoveryEvidence(result),
          "storekit2-transaction-updates"
        );
      });
    }

    bindStoreCallbacks() {
      if (this.bound || !this.store?.when) return;
      this.bound = true;
      const storeCallbacks = this.store.when()
        .productUpdated(product => {
          if (this.supportProductIds().has(product?.id)) this.notify();
        }, "reverseFlowSupportProducts")
        .approved(transaction => {
          if (!this.transactionProductId(transaction)) {
            this.logTransaction(
              "store-non-product-callback-ignored",
              {
                paymentSource: getPlatform(),
                productIdentifier: null
              },
              {
                stage: "approved",
                failureCategory: "no-canonical-support-product",
                retryable: false
              }
            );
            return;
          }
          const settled = this.settleTransaction(transaction, "approved");
          if (!settled) {
            const evidence = this.transactionEvidence(transaction);
            const key = this.transactionKey(evidence);
            this.logTransaction("purchase-discovered", evidence, {
              lifecycle: "approved-redelivery"
            });
            if (this.receivedTransactionKeys.has(key)) {
              if (
                evidence.paymentSource === "android" &&
                evidence.purchaseType === "monthly" &&
                evidence.acknowledged !== true
              ) {
                void this.completeApprovedPurchase(evidence).catch(error => {
                  this.logTransaction(
                    "google-purchase-acknowledgment-deferred",
                    evidence,
                    {
                      stage: "approved-redelivery",
                      failureCategory:
                        error?.code || "google_acknowledgment_failed",
                      retryable: true,
                      acknowledgmentAttempted: true
                    }
                  );
                });
              }
              this.logTransaction("store-transaction-duplicate-ignored", evidence, {
                lifecycle: "approved-redelivery"
              });
              return;
            }
            if (
              evidence.paymentSource === "android" &&
              evidence.purchaseType === "monthly"
            ) {
              this.receivedTransactionKeys.add(key);
              void this.completeApprovedPurchase(evidence).catch(error => {
                this.receivedTransactionKeys.delete(key);
                this.logTransaction(
                  "google-purchase-acknowledgment-deferred",
                  evidence,
                  {
                    stage: "approved-redelivery",
                    failureCategory:
                      error?.code || "google_acknowledgment_failed",
                    retryable: true,
                    acknowledgmentAttempted: true
                  }
                );
              });
              return;
            }
            const pending = this.retryStoreForEvidence(evidence).read();
            if (!pending || !this.transactionMatchesPending(evidence, pending)) {
              const isRestorableSubscription =
                evidence.purchaseType === "monthly";
              const isRecoverableGoogleOneTime =
                getPlatform() === "android" &&
                evidence.acknowledged !== true;
              if (isRestorableSubscription || isRecoverableGoogleOneTime) {
                try {
                  this.persistPendingEvidence(evidence);
                  this.receivedTransactionKeys.add(key);
                  this.logTransaction(
                    "support-pending-state-written",
                    evidence,
                    {
                      stage: "approved-redelivery",
                      localPendingStateWritten: true,
                      retryable: true
                    }
                  );
                  this.notifyRecovery({
                    ...evidence,
                    recoverySource: isRestorableSubscription
                      ? "store-restored-subscription"
                      : "store-approved-redelivery"
                  });
                } catch (error) {
                  this.logTransaction(
                    "support-pending-state-write-deferred",
                    evidence,
                    {
                      stage: "approved-redelivery",
                      failureCategory:
                        error?.code || "pending_state_write_failed",
                      localPendingStateWritten: false,
                      retryable: true
                    }
                  );
                }
                return;
              }
              this.receivedTransactionKeys.add(key);
              this.logTransaction("store-transaction-duplicate-ignored", evidence, {
                lifecycle: "historical-callback",
                reason: "no-current-pending-record"
              });
              return;
            }
            this.receivedTransactionKeys.add(key);
            if (
              getPlatform() === "ios" &&
              evidence.productIdentifier === this.oneTimeSupportProductId()
            ) {
              this.captureRecoverableConsumable(
                evidence,
                "cordova-approved-redelivery"
              );
            } else {
              this.notifyRecovery({
                ...evidence,
                recoverySource: "store-approved-redelivery"
              });
            }
          }
        }, "reverseFlowSupportApproved")
        .pending(transaction => {
          this.settleTransaction(transaction, "pending");
        }, "reverseFlowSupportPending");
      storeCallbacks.receiptUpdated?.(() => {
        this.notify();
        if (getPlatform() === "android") {
          void this.reconcileGooglePlaySubscriptions();
        }
        if (this.readPendingRegistration()) {
          void this.recoverPendingRegistration();
        }
      }, "reverseFlowSupportReceiptUpdated");
      this.store.error?.(error => {
        const productId = error?.productId;
        const fallbackEntry = !productId && this.waiters.size === 1
          ? this.waiters.entries().next().value
          : null;
        const waiterProductId = productId || fallbackEntry?.[0];
        const waiter = waiterProductId
          ? this.waiters.get(waiterProductId)
          : null;
        if (!waiter) return;
        this.waiters.delete(waiterProductId);
        clearTimeout(waiter.timeout);
        const cancelled =
          error?.code === this.global.CdvPurchase?.ErrorCode?.PAYMENT_CANCELLED;
        const replacementFailed =
          !cancelled &&
          getPlatform() === "android" &&
          waiter.replacementData?.googlePlay?.replacementRequired === true;
        waiter.reject(new SupportPurchaseError(
          cancelled
            ? "Purchase canceled. No charge was made."
            : replacementFailed
              ? "Google Play couldn’t change your monthly support. Your current subscription is still active. Please try again."
              : "The store could not complete this purchase. Please try again.",
          cancelled
            ? "purchase_cancelled"
            : replacementFailed
              ? "subscription_replacement_failed"
              : "purchase_failed"
        ));
      });
    }

    async waitForNativePurchasePlugin() {
      if (this.global.CdvPurchase?.store) return;
      if (!["ios", "android"].includes(getPlatform())) return;
      await new Promise(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          this.global.document?.removeEventListener?.("deviceready", finish);
          resolve();
        };
        const timeout = setTimeout(finish, 10000);
        this.global.document?.addEventListener?.("deviceready", finish, {
          once: true
        });
      });
    }

    async initialize() {
      if (this.initialization) return this.initialization;
      this.initialization = (async () => {
        const platform = getPlatform();
        await this.waitForNativePurchasePlugin();
        this.store = this.store || this.global.CdvPurchase?.store || null;
        this.storePlatform = this.getStorePlatform(platform);
        if (!this.store || !this.storePlatform) {
          this.initializeError = new SupportPurchaseError(
            "Support purchases are available in the installed iOS or Android app.",
            "store_unavailable"
          );
          this.initialized = true;
          this.notify();
          return;
        }

        this.bindStoreCallbacks();
        this.bindNativeRecoveryBridge();
        const ProductType = this.global.CdvPurchase.ProductType;
        const storeKey = platform === "ios" ? "apple" : "google";
        const registrationKeys = new Set();
        const registrations = Object.values(this.config[storeKey] || {})
          .map(value => typeof value === "string" ? { productId: value } : value)
          .filter(value => value?.productId)
          .map(value => ({
            id: value.productId,
            type: value.productType === "paid subscription"
              ? ProductType.PAID_SUBSCRIPTION
              : value.productType === "consumable"
                ? ProductType.CONSUMABLE
              : ProductType.NON_CONSUMABLE,
            platform: this.storePlatform
          }))
          .filter(registration => {
            const key = [
              registration.id,
              registration.type,
              registration.platform
            ].join(":");
            if (registrationKeys.has(key)) return false;
            registrationKeys.add(key);
            return true;
          });
        if (
          typeof REVERSE_FLOW_PRO_PRODUCT_ID === "string" &&
          REVERSE_FLOW_PRO_PRODUCT_ID
        ) {
          registrations.push({
            id: REVERSE_FLOW_PRO_PRODUCT_ID,
            type: ProductType.NON_CONSUMABLE,
            platform: this.storePlatform
          });
        }
        this.store.register(registrations);
        const initialization = this.storePlatform === this.global.CdvPurchase.Platform?.APPLE_APPSTORE
          ? [{ platform: this.storePlatform, options: { needAppReceipt: true } }]
          : [this.storePlatform];
        const errors = await this.store.initialize(initialization);
        const firstError = Array.isArray(errors) ? errors.find(Boolean) : errors;
        if (firstError?.isError) {
          throw new SupportPurchaseError(
            "Store support options are temporarily unavailable.",
            "product_load_failed"
          );
        }
        this.initialized = true;
        this.migrateSupportEnvironment();
        if (platform === "ios") {
          await this.refreshAppleCurrentSubscriptions();
          await this.recoverPendingRegistration();
          await this.recoverUnfinishedConsumable({
            automatic: true,
            skipInitialize: true
          });
        }
        this.notify();
        if (platform === "android") {
          void this.reconcileGooglePlaySubscriptions();
        }
        if (platform !== "ios") {
          void this.recoverPendingRegistration();
        }
      })().catch(error => {
        this.initialized = true;
        this.initializeError = error;
        this.notify();
        throw error;
      });
      return this.initialization;
    }

    async purchase(option, context = {}) {
      if (this.purchaseInFlight) {
        throw new SupportPurchaseError(
          "A store purchase is already in progress.",
          "purchase_in_progress"
        );
      }
      this.beginSupportUiOperation(SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS);
      let approved = false;
      this.purchaseInFlight = (async () => {
        await this.initialize();
        const platform = getPlatform() === "ios" ? "apple" : "google";
        const current = this.getOptions(platform).find(item => item.key === option?.key);
        if (!current || current.state !== "ready" || !current.offer) {
          throw new SupportPurchaseError(
            "This support option is temporarily unavailable from the store.",
            "product_unavailable"
          );
        }
        if (platform === "google" && current.type === "monthly") {
          await this.reconcileGooglePlaySubscriptions({ refresh: true });
          if (this.hasUnacknowledgedGoogleSubscriptions()) {
            throw new SupportPurchaseError(
              "Finalizing your subscription…",
              "google_subscription_finalizing"
            );
          }
        }

        const replacementData = await this.prepareSubscriptionReplacement(
          current,
          context
        );
        const transactionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.waiters.delete(current.productId);
            reject(new SupportPurchaseError(
              "The store did not finish responding. Check your purchase history before trying again.",
              "purchase_timeout"
            ));
          }, 120000);
          this.waiters.set(current.productId, {
            option: current,
            replacementData,
            resolve,
            reject,
            timeout
          });
        });
        const orderError = await current.offer.order(replacementData);
        if (orderError) {
          const waiter = this.waiters.get(current.productId);
          if (waiter) {
            this.waiters.delete(current.productId);
            clearTimeout(waiter.timeout);
          }
          const cancelled =
            orderError.code === this.global.CdvPurchase?.ErrorCode?.PAYMENT_CANCELLED;
          const replacementFailed =
            !cancelled &&
            replacementData?.googlePlay?.replacementRequired === true;
          throw new SupportPurchaseError(
            cancelled
              ? "Purchase canceled. No charge was made."
              : replacementFailed
                ? "Google Play couldn’t change your monthly support. Your current subscription is still active. Please try again."
                : "The store could not complete this purchase. Please try again.",
            cancelled
              ? "purchase_cancelled"
              : replacementFailed
                ? "subscription_replacement_failed"
                : "purchase_failed"
          );
        }
        const transaction = await transactionPromise;
        approved = true;
        return transaction;
      })();
      try {
        return await this.purchaseInFlight;
      } finally {
        this.purchaseInFlight = null;
        if (!approved) this.endSupportUiOperation();
      }
    }

    allSupportTransactions() {
      const transactions = [];
      const append = values => {
        if (!Array.isArray(values)) return;
        values.forEach(transaction => {
          if (
            transaction &&
            this.transactionProductId(transaction) &&
            !transactions.includes(transaction)
          ) {
            transactions.push(transaction);
          }
        });
      };
      append(this.store?.localTransactions);
      (this.store?.localReceipts || []).forEach(receipt => append(receipt?.transactions));
      return transactions;
    }

    activeRecurringPurchaseEvidenceList() {
      const seen = new Set();
      const purchases = (Array.isArray(this.store?.localTransactions)
        ? this.store.localTransactions
        : [])
        .map(transaction => this.transactionEvidence(transaction))
        .filter(evidence =>
          evidence.purchaseType === "monthly" &&
          evidence.transaction?.isPending !== true &&
          !["pending", "cancelled", "canceled", "failed"].includes(
            evidence.purchaseState
          ) &&
          Boolean(evidence.purchaseToken)
        )
        .filter(evidence => {
          const key = `${evidence.productIdentifier}:${evidence.purchaseToken}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((left, right) =>
          Date.parse(right.purchaseTimestamp || 0) -
          Date.parse(left.purchaseTimestamp || 0)
        );
      if (getPlatform() !== "android") return purchases;
      const activeProducts = new Set();
      return purchases.filter(evidence => {
        if (activeProducts.has(evidence.productIdentifier)) return false;
        activeProducts.add(evidence.productIdentifier);
        return true;
      });
    }

    allGoogleSubscriptionEvidence() {
      if (getPlatform() !== "android") return [];
      const seen = new Set();
      return this.allSupportTransactions()
        .map(transaction => this.transactionEvidence(transaction))
        .filter(evidence =>
          evidence.paymentSource === "android" &&
          evidence.purchaseType === "monthly" &&
          Boolean(evidence.purchaseToken) &&
          evidence.transaction?.isPending !== true &&
          ["1", "approved", "purchased", "finished"].includes(
            evidence.purchaseState
          )
        )
        .filter(evidence => {
          const key = this.transactionKey(evidence);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((left, right) =>
          Date.parse(left.purchaseTimestamp || 0) -
          Date.parse(right.purchaseTimestamp || 0)
        );
    }

    unacknowledgedGoogleSubscriptions() {
      return this.allGoogleSubscriptionEvidence().filter(evidence =>
        evidence.acknowledged !== true &&
        !this.acknowledgedTransactionKeys.has(this.transactionKey(evidence))
      );
    }

    hasUnacknowledgedGoogleSubscriptions() {
      return this.googleSubscriptionFinalizingKeys.size > 0 ||
        this.unacknowledgedGoogleSubscriptions().length > 0;
    }

    async reconcileGooglePlaySubscriptions({ refresh = false } = {}) {
      if (getPlatform() !== "android" || !this.store) {
        return { discovered: 0, acknowledged: 0, unresolved: 0 };
      }
      if (refresh && typeof this.store.update === "function") {
        await this.store.update();
      }
      const purchases = this.unacknowledgedGoogleSubscriptions();
      const results = [];
      for (const evidence of purchases) {
        try {
          results.push({
            status: "fulfilled",
            value: await this.completeApprovedPurchase(evidence)
          });
        } catch (reason) {
          results.push({ status: "rejected", reason });
        }
      }
      const summary = {
        discovered: purchases.length,
        acknowledged: results.filter(result =>
          result.status === "fulfilled"
        ).length,
        unresolved: results.filter(result =>
          result.status === "rejected"
        ).length
      };
      this.notify();
      return summary;
    }

    activeRecurringPurchaseEvidence(productId) {
      return this.activeRecurringPurchaseEvidenceList()
        .find(evidence =>
          !productId || evidence.productIdentifier === productId
        ) || null;
    }

    async prepareSubscriptionReplacement(option, context = {}) {
      const fromProductId = context.currentRecurringProductId;
      const fromBasePlanId = context.currentBasePlanId;
      if (
        getPlatform() !== "android" ||
        option?.type !== "monthly" ||
        !fromProductId ||
        !fromBasePlanId
      ) {
        return undefined;
      }
      if (fromBasePlanId === option.basePlanId) {
        throw new SupportPurchaseError(
          "This Google Play base plan is already active.",
          "subscription_plan_already_active"
        );
      }
      if (typeof this.store?.restorePurchases === "function") {
        await this.store.restorePurchases();
      }
      await this.reconcileGooglePlaySubscriptions();
      if (this.hasUnacknowledgedGoogleSubscriptions()) {
        throw new SupportPurchaseError(
          "Finalizing your subscription…",
          "google_subscription_finalizing"
        );
      }
      const active = this.activeRecurringPurchaseEvidenceList();
      const current = active.find(evidence =>
        evidence.productIdentifier === fromProductId &&
        evidence.basePlanId === fromBasePlanId
      ) || active.find(evidence =>
        evidence.productIdentifier === fromProductId
      );
      if (!current?.purchaseToken) {
        throw new SupportPurchaseError(
          "Your current Google Play subscription could not be prepared for a plan change. Refresh your status and try again.",
          "subscription_replacement_token_unavailable"
        );
      }
      const modes = this.global.CdvPurchase?.GooglePlay?.ReplacementMode || {};
      const isUpgrade =
        Number(option.amount) > Number(context.currentMonthlyAmount);
      const isSameSubscriptionBasePlanChange =
        fromProductId === option.productId;
      const replacementMode = isSameSubscriptionBasePlanChange
        ? isUpgrade
          ? modes.CHARGE_FULL_PRICE || "IMMEDIATE_AND_CHARGE_FULL_PRICE"
          : modes.WITHOUT_PRORATION || "IMMEDIATE_WITHOUT_PRORATION"
        : isUpgrade
          ? modes.CHARGE_PRORATED_PRICE || "IMMEDIATE_AND_CHARGE_PRORATED_PRICE"
          : modes.DEFERRED || "DEFERRED";
      this.logTransaction(
        "google-subscription-replacement-prepared",
        {
          paymentSource: "android",
          productIdentifier: option.productId
        },
        {
          stage: "subscription-replacement",
          oldProductId: fromProductId,
          oldBasePlanId: fromBasePlanId,
          targetBasePlanId: option.basePlanId,
          replacementMode,
          oldPurchaseTokenPresent: true,
          retryable: false
        }
      );
      return {
        googlePlay: {
          oldPurchaseToken: current.purchaseToken,
          replacementMode,
          replacementRequired: true,
          oldProductId: fromProductId,
          oldBasePlanId: fromBasePlanId,
          targetBasePlanId: option.basePlanId,
          sameSubscriptionBasePlanChange: isSameSubscriptionBasePlanChange
        }
      };
    }

    readPendingRegistration() {
      return this.oneTimeRetryStore.read() ||
        this.subscriptionRetryStore.read();
    }

    readPendingSubscriptionRegistration() {
      return this.subscriptionRetryStore.read();
    }

    readPendingOneTimeRegistration() {
      return this.oneTimeRetryStore.read();
    }

    transactionMatchesPending(evidence, pending) {
      return Boolean(
        evidence?.productIdentifier === pending?.productId &&
        privacySafeTransactionReference(
          evidence,
          evidence?.paymentSource === "ios" ? "apple" : "google"
        ) === pending?.transactionReference
      );
    }

    async recoverPendingRegistration() {
      const pending = this.readPendingRegistration();
      if (!pending) return null;
      const evidence = this.allSupportTransactions()
        .map(transaction => this.transactionEvidence(transaction))
        .find(candidate => this.transactionMatchesPending(candidate, pending));
      if (evidence) {
        const recovered = {
          ...evidence,
          recoverySource: "store-approved-redelivery"
        };
        this.notifyRecovery(recovered);
        return recovered;
      }
      if (
        getPlatform() === "ios" &&
        this.initialized &&
        pending.provider === "apple" &&
        pending.productId !== this.oneTimeSupportProductId()
      ) {
        this.clearStalePendingRegistration(
          pending,
          this.supportProductIds("apple").has(pending.productId)
            ? "no-matching-store-transaction"
            : "unsupported-persisted-product"
        );
        return null;
      }
      this.logTransaction(
        "store-completion-awaiting-redelivery",
        {
          paymentSource: pending.provider === "apple" ? "ios" : "android",
          productIdentifier: pending.productId
        },
        {
          stage: "local-recovery",
          retryable: true
        }
      );
      return null;
    }

    migrateSupportEnvironment() {
      if (!this.storage?.getItem || !this.storage?.setItem) return;
      const pendingStores = [
        this.oneTimeRetryStore,
        this.subscriptionRetryStore
      ];
      const pending = pendingStores
        .map(store => ({ store, record: store.read() }))
        .filter(item => item.record);
      const recordedEnvironment =
        String(this.storage.getItem(SUPPORT_ENVIRONMENT_CACHE_KEY) || "");
      const previousEnvironment =
        recordedEnvironment ||
        (
          this.apiEnvironment === "production" && pending.length
            ? "preview"
            : "unknown"
        );
      if (previousEnvironment === this.apiEnvironment) return;

      const transactions = this.allSupportTransactions()
        .map(transaction => this.transactionEvidence(transaction));
      let recoveredPurchaseCount = 0;
      let pendingRecordsMigrated = 0;
      for (const item of pending) {
        const matched = transactions.some(evidence =>
          this.transactionMatchesPending(evidence, item.record)
        );
        if (matched) {
          recoveredPurchaseCount += 1;
          pendingRecordsMigrated += 1;
          item.store.markEnvironment(this.apiEnvironment);
        } else if (
          previousEnvironment === "preview" &&
          this.apiEnvironment === "production"
        ) {
          pendingRecordsMigrated += 1;
          item.store.markEnvironment(this.apiEnvironment);
        }
      }
      this.storage.setItem(
        SUPPORT_ENVIRONMENT_CACHE_KEY,
        this.apiEnvironment
      );
      console.info(
        `[Reverse Flow Support Purchase] ${JSON.stringify({
          event: "support-environment-migration-completed",
          previousEnvironmentCategory: previousEnvironment,
          newEnvironmentCategory: this.apiEnvironment,
          recoveredPurchaseCount,
          pendingRecordsMigrated,
          outcome: "success"
        })}`
      );
    }

    async acknowledgeGoogleOneTimePurchase(verifiedPurchase) {
      if (typeof this.googlePurchaseAcknowledger === "function") {
        await this.googlePurchaseAcknowledger(verifiedPurchase);
        return;
      }
      const purchaseToken = verifiedPurchase?.purchaseToken;
      const exec = this.global.cordova?.exec;
      if (!purchaseToken || typeof exec !== "function") {
        throw new SupportPurchaseError(
          "Google Play acknowledgment is temporarily unavailable.",
          "google_acknowledgment_unavailable"
        );
      }
      await new Promise((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new SupportPurchaseError(
            "Google Play acknowledgment timed out and will retry automatically.",
            "google_acknowledgment_timeout"
          ));
        }, 15000);
        const complete = callback => value => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          callback(value);
        };
        exec(
          complete(resolve),
          complete(error => reject(new SupportPurchaseError(
            "Google Play acknowledgment will retry automatically.",
            error?.code || "google_acknowledgment_failed"
          ))),
          "InAppBillingPlugin",
          "acknowledgePurchase",
          [purchaseToken]
        );
      });
    }

    async acknowledgeVerifiedGooglePurchase(
      verifiedPurchase,
      completion = {}
    ) {
      if (verifiedPurchase?.paymentSource !== "android") {
        return false;
      }
      if (completion.storeApproved !== true) {
        this.logTransaction(
          "google-purchase-acknowledgment-deferred",
          verifiedPurchase,
          {
            stage: "store-acknowledgment",
            backendOutcome: "deferred",
            failureCategory: "store_approval_not_confirmed",
            retryable: true,
            localPendingStateWritten: null,
            acknowledgmentAttempted: false
          }
        );
        throw new SupportPurchaseError(
          "Google Play has not approved this purchase yet.",
          "google_acknowledgment_preconditions_not_met"
        );
      }
      if (
        verifiedPurchase.purchaseState &&
        !["1", "approved", "purchased", "finished"].includes(
          verifiedPurchase.purchaseState
        )
      ) {
        throw new SupportPurchaseError(
          "Google Play has not completed this purchase yet.",
          "google_purchase_not_completed"
        );
      }
      const transactionKey = this.transactionKey(verifiedPurchase);
      if (
        this.acknowledgedTransactionKeys.has(transactionKey) ||
        verifiedPurchase.acknowledged === true
      ) {
        this.acknowledgedTransactionKeys.add(transactionKey);
        this.markPendingAttempt(
          verifiedPurchase,
          "store-approved"
        );
        this.logTransaction(
          "google-purchase-acknowledgment-deduplicated",
          verifiedPurchase,
          {
            stage: "store-acknowledgment",
            backendOutcome: "already-acknowledged",
            acknowledgmentResult: "already-acknowledged",
            acknowledgmentAttempted: false,
            retryable: false
          }
        );
        return false;
      }
      const existingRequest =
        this.googleAcknowledgmentRequests.get(transactionKey);
      if (existingRequest) return existingRequest;
      if (typeof verifiedPurchase?.transaction?.finish !== "function") {
        throw new SupportPurchaseError(
          "Your support is saved and Google Play acknowledgment will retry automatically.",
          "google_acknowledgment_unavailable"
        );
      }
      const acknowledgment = (async () => {
        if (verifiedPurchase.purchaseType === "monthly") {
          this.googleSubscriptionFinalizingKeys.add(transactionKey);
          this.notify();
        }
        this.logTransaction(
          "google-purchase-acknowledgment-attempted",
          verifiedPurchase,
          {
            stage: "store-acknowledgment",
            acknowledgmentAttempted: true,
            retryable: true,
          }
        );
        try {
          if (this.isOneTimeEvidence(verifiedPurchase)) {
            await this.acknowledgeGoogleOneTimePurchase(verifiedPurchase);
          } else {
            await verifiedPurchase.transaction.finish();
            this.finishedTransactionKeys.add(transactionKey);
          }
        } catch (error) {
          this.logTransaction(
            "google-purchase-acknowledgment-deferred",
            verifiedPurchase,
            {
              stage: "store-acknowledgment",
              backendOutcome: "deferred",
              acknowledgmentResult: "failed-retryable",
              failureCategory:
                error?.code || "google_acknowledgment_failed",
              retryable: true,
              localPendingStateWritten: null,
              acknowledgmentAttempted: true
            }
          );
          throw error;
        }
        verifiedPurchase.acknowledged = true;
        this.acknowledgedTransactionKeys.add(transactionKey);
        try {
          this.markPendingAttempt(verifiedPurchase, "store-approved");
        } catch {
          // Store completion is intentionally independent of local retry state.
        }
        this.logTransaction(
          "google-purchase-acknowledgment-succeeded",
          verifiedPurchase,
          {
            stage: "store-acknowledgment",
            backendOutcome: "success",
            acknowledgmentResult: "succeeded",
            acknowledgmentAttempted: true,
            retryable: false
          }
        );
        return true;
      })().finally(() => {
        this.googleAcknowledgmentRequests.delete(transactionKey);
        this.googleSubscriptionFinalizingKeys.delete(transactionKey);
        this.notify();
      });
      this.googleAcknowledgmentRequests.set(
        transactionKey,
        acknowledgment
      );
      return acknowledgment;
    }

    async acknowledgeVerifiedPendingSubscription(
      verifiedPurchase,
      completion = {}
    ) {
      return this.acknowledgeVerifiedGooglePurchase(
        verifiedPurchase,
        completion
      );
    }

    async reconcileTransaction(evidence, callback) {
      const key = this.transactionKey(evidence);
      if (this.completedTransactionKeys.has(key)) {
        this.logTransaction("store-transaction-duplicate-ignored", evidence, {
          lifecycle: "reconciliation-completed"
        });
        return null;
      }
      const existing = this.reconciliationRequests.get(key);
      if (existing) {
        this.logTransaction("store-transaction-duplicate-ignored", evidence, {
          lifecycle: "reconciliation-in-flight"
        });
        return existing;
      }
      this.logTransaction("store-transaction-reconciliation-started", evidence);
      this.beginSupportUiOperation(SUPPORT_UI_STATES.SUPPORTER_REFRESHING);
      const reconciliation = Promise.resolve()
        .then(callback)
        .then(result => {
          this.completedTransactionKeys.add(key);
          this.logTransaction("store-transaction-reconciliation-completed", evidence, {
            outcome: "success"
          });
          if (evidence?.purchaseType === "monthly") {
            this.logTransaction("subscription-current-product-updated", evidence);
          }
          return result;
        })
        .catch(error => {
          this.logTransaction("store-transaction-reconciliation-completed", evidence, {
            outcome: "failed",
            failureCategory: error?.code || "reconciliation_failed"
          });
          throw error;
        })
        .finally(() => {
          this.reconciliationRequests.delete(key);
          this.endSupportUiOperation();
        });
      this.reconciliationRequests.set(key, reconciliation);
      return reconciliation;
    }

    async completeApprovedPurchase(evidence) {
      return this.reconcileTransaction(evidence, async () => {
        if (
          evidence?.paymentSource === "ios" &&
          evidence?.purchaseType === "monthly"
        ) {
          this.authoritativeActiveMonthlyProductId =
            evidence.productIdentifier;
          this.authoritativeMonthlyStateChecked = true;
        }
        this.recordBillingHistory(evidence);
        if (evidence?.paymentSource === "android") {
          await this.acknowledgeVerifiedGooglePurchase(evidence, {
            storeApproved: true
          });
        }
        await this.finishPurchase(evidence, {
          storeApproved: true,
          billingStatePersisted: true
        });
        if (typeof this.store?.update === "function") {
          await this.store.update();
        }
        if (evidence?.paymentSource === "ios") {
          await this.refreshAppleCurrentSubscriptions();
        }
        this.deriveBillingState();
        this.logTransaction("store-purchase-completed", evidence, {
          stage: "store-completion",
          outcome: "success",
          retryable: false
        });
        this.notify();
        return evidence;
      });
    }

    nativeRecoveryEvidence(result) {
      return {
        paymentSource: "ios",
        productIdentifier: result?.productId || null,
        purchaseType: "one-time",
        monthlyAmount: null,
        transactionId: result?.transactionId || null,
        originalTransactionId: result?.originalTransactionId || null,
        purchaseToken: null,
        purchaseTimestamp: toIsoTimestamp(result?.purchaseDate),
        expirationTimestamp: null,
        signedTransaction: result?.signedTransaction || null,
        offerId: null,
        environment: normalizeStoreEnvironment(result?.environment),
        nativeRecovery: true,
        transaction: null
      };
    }

    cordovaRecoverableConsumable() {
      const productId = this.oneTimeSupportProductId();
      const transaction = this.allSupportTransactions()
        .filter(candidate =>
          this.transactionProductId(candidate) === productId &&
          candidate?.isPending !== true &&
          String(candidate?.state || "").toLowerCase() !== "finished" &&
          typeof candidate?.finish === "function"
        )
        .sort((left, right) =>
          (new Date(right?.purchaseDate || 0).getTime() || 0) -
          (new Date(left?.purchaseDate || 0).getTime() || 0)
        )[0];
      return transaction ? this.transactionEvidence(transaction) : null;
    }

    async recoverUnfinishedConsumable({
      automatic = false,
      skipInitialize = false
    } = {}) {
      if (!skipInitialize) await this.initialize();
      if (getPlatform() !== "ios") {
        throw new SupportPurchaseError(
          "Unfinished one-time support recovery is available in the iOS app.",
          "consumable_recovery_unavailable"
        );
      }
      this.logTransaction("consumable-recovery-attempted", {
        paymentSource: "ios",
        productIdentifier: this.oneTimeSupportProductId()
      }, {
        stage: automatic ? "automatic" : "manual",
        retryable: true
      });

      const plugin = this.global.Capacitor?.Plugins?.SupportPurchaseRecovery;
      let nativeScanConfirmedNoMatch = false;
      if (plugin?.recoverUnfinishedConsumable) {
        try {
          const result = await plugin.recoverUnfinishedConsumable();
          if (result?.found === true) {
            return this.captureRecoverableConsumable(
              this.nativeRecoveryEvidence(result),
              "storekit2-transaction-unfinished"
            );
          }
          nativeScanConfirmedNoMatch = result?.found === false;
        } catch (error) {
          this.logTransaction("consumable-recovery-bridge-failed", {
            paymentSource: "ios",
            productIdentifier: this.oneTimeSupportProductId()
          }, {
            stage: "native-bridge",
            failureCategory: error?.code || "native_bridge_error",
            retryable: true
          });
        }
      }

      const cordovaEvidence = this.cordovaRecoverableConsumable();
      if (cordovaEvidence) {
        return this.captureRecoverableConsumable(
          cordovaEvidence,
          "cordova-approved-redelivery"
        );
      }

      const persisted = this.oneTimeRetryStore.read();
      if (persisted) {
        if (nativeScanConfirmedNoMatch) {
          this.clearStalePendingRegistration(
            persisted,
            "no-matching-unfinished-transaction"
          );
          this.logTransaction("no-recoverable-transaction-found", {
            paymentSource: "ios",
            productIdentifier: this.oneTimeSupportProductId()
          }, {
            stage: "store-query",
            retryable: false
          });
          return null;
        }
        const cachedSupporter = this.supporterCache.read();
        if (
          cachedSupporter.isSupporter &&
          cachedSupporter.source &&
          ["confirmed-awaiting-finish", "finish-failed"].includes(
            persisted.lastRegistrationAttemptStatus
          )
        ) {
          this.oneTimeRetryStore.clear();
          this.logTransaction("stale-consumable-retry-resolved", {
            paymentSource: "ios",
            productIdentifier: persisted.productId
          }, {
            stage: "local-recovery",
            backendOutcome: "supporter-confirmed-transaction-absent",
            retryable: false
          });
          return null;
        }
        this.logTransaction("persisted-consumable-retry-found", {
          paymentSource: "ios",
          productIdentifier: persisted.productId
        }, {
          stage: "local-recovery",
          retryable: true
        });
        this.notifyRecovery({
          pendingRegistration: true,
          productIdentifier: persisted.productId,
          paymentSource: "ios"
        });
        return null;
      }

      this.logTransaction("no-recoverable-transaction-found", {
        paymentSource: "ios",
        productIdentifier: this.oneTimeSupportProductId()
      }, {
        stage: "store-query",
        retryable: false
      });
      if (automatic) return null;
      throw new SupportPurchaseError(
        "No unfinished one-time support transaction was found on this device.",
        "no_recoverable_consumable_found"
      );
    }

    async refreshSubscriptionPurchases() {
      await this.initialize();
      if (!this.store?.restorePurchases) {
        throw new SupportPurchaseError(
          "Store purchase history is unavailable on this device.",
          "restore_unavailable"
        );
      }
      await this.store.restorePurchases();
      const transaction = this.allSupportTransactions()
        .filter(candidate => {
          const evidence = this.transactionEvidence(candidate);
          return candidate?.isPending !== true && evidence.purchaseType === "monthly";
        })
        .sort((left, right) =>
          (new Date(right?.purchaseDate || 0).getTime() || 0) -
          (new Date(left?.purchaseDate || 0).getTime() || 0)
        )[0];
      if (!transaction) {
        throw new SupportPurchaseError(
          "No active Reverse Flow support subscription was found for the current store account.",
          "no_support_subscription_found"
        );
      }
      return this.transactionEvidence(transaction);
    }

    async finishPurchase(verifiedPurchase, completion = {}) {
      if (
        completion.storeApproved !== true ||
        completion.billingStatePersisted !== true
      ) {
        throw new SupportPurchaseError(
          "The approved store purchase must be saved before completion.",
          "purchase_finish_preconditions_not_met"
        );
      }
      const isAppleConsumable =
        verifiedPurchase?.paymentSource === "ios" &&
        verifiedPurchase?.productIdentifier === this.oneTimeSupportProductId() &&
        Boolean(verifiedPurchase?.transactionId);
      const transactionKey = this.transactionKey(verifiedPurchase);
      if (this.finishedTransactionKeys.has(transactionKey)) {
        this.logTransaction(
          "store-transaction-duplicate-ignored",
          verifiedPurchase,
          { lifecycle: "finish" }
        );
        this.clearPendingRegistration(verifiedPurchase);
        return;
      }
      if (
        verifiedPurchase?.paymentSource === "android" &&
        verifiedPurchase?.purchaseType === "monthly" &&
        (
          verifiedPurchase?.acknowledged === true ||
          this.acknowledgedTransactionKeys.has(transactionKey)
        )
      ) {
        this.acknowledgedTransactionKeys.add(transactionKey);
        this.finishedTransactionKeys.add(transactionKey);
        this.clearPendingRegistration(verifiedPurchase);
        this.logTransaction(
          "google-purchase-acknowledgment-deduplicated",
          verifiedPurchase,
          {
            stage: "store-acknowledgment",
            backendOutcome: "already-acknowledged",
            acknowledgmentAttempted: false,
            retryable: false
          }
        );
        return;
      }
      if (isAppleConsumable) {
        const plugin = this.global.Capacitor?.Plugins?.SupportPurchaseRecovery;
        if (plugin?.finishRecoveredConsumable) {
          await plugin.finishRecoveredConsumable({
            transactionId: verifiedPurchase.transactionId
          });
          this.finishedTransactionKeys.add(transactionKey);
          this.clearPendingRegistration(verifiedPurchase);
          return;
        }
        if (typeof verifiedPurchase?.transaction?.finish === "function") {
          await verifiedPurchase.transaction.finish();
          this.finishedTransactionKeys.add(transactionKey);
          this.clearPendingRegistration(verifiedPurchase);
          return;
        }
        throw new SupportPurchaseError(
          "Your Supporter status is saved. We’ll finish this step automatically when the store is available.",
          "consumable_finish_unavailable"
        );
      }
      if (verifiedPurchase?.paymentSource === "android") {
        await this.acknowledgeVerifiedGooglePurchase(
          verifiedPurchase,
          {
            storeApproved: true
          }
        );
        if (this.isOneTimeEvidence(verifiedPurchase)) {
          const transaction = verifiedPurchase?.transaction;
          if (typeof transaction?.finish !== "function") {
            throw new SupportPurchaseError(
              "Your Supporter status is saved. Google Play completion will retry automatically.",
              "google_consumption_unavailable"
            );
          }
          this.logTransaction(
            "google-consumable-consumption-attempted",
            verifiedPurchase,
            {
              stage: "store-consumption",
              acknowledgmentAttempted: false,
              retryable: true
            }
          );
          try {
            await transaction.finish();
          } catch (error) {
            this.logTransaction(
              "google-consumable-consumption-deferred",
              verifiedPurchase,
              {
                stage: "store-consumption",
                failureCategory:
                  error?.code || "google_consumption_failed",
                acknowledgmentAttempted: false,
                retryable: true
              }
            );
            throw error;
          }
          this.finishedTransactionKeys.add(transactionKey);
          this.logTransaction(
            "google-consumable-consumption-succeeded",
            verifiedPurchase,
            {
              stage: "store-consumption",
              backendOutcome: "success",
              acknowledgmentAttempted: false,
              retryable: false
            }
          );
        }
        this.clearPendingRegistration(verifiedPurchase);
        return;
      }
      const transaction = verifiedPurchase?.transaction;
      if (typeof transaction?.finish !== "function") {
        throw new SupportPurchaseError(
          "Your Supporter status is saved. We’ll finish this step automatically when the store is available.",
          "purchase_finish_unavailable"
        );
      }
      await transaction.finish();
      this.finishedTransactionKeys.add(transactionKey);
      this.clearPendingRegistration(verifiedPurchase);
    }

    async openNativeSubscriptionManagement() {
      await this.initialize();
      const error = await this.store?.manageSubscriptions?.(this.storePlatform);
      if (error?.isError) {
        throw new SupportPurchaseError(
          "Subscription management could not be opened. Try again from your store account.",
          "subscription_management_failed"
        );
      }
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
    const payload = {
      name: String(fields?.name || "").trim(),
      email: String(fields?.email || "").trim().toLowerCase(),
      platform: getPlatform(),
      paymentSource: verifiedPurchase?.paymentSource || getPlatform(),
      productIdentifier: verifiedPurchase?.productIdentifier || null,
      purchaseType: verifiedPurchase?.purchaseType || null,
      recurring: verifiedPurchase?.purchaseType === "monthly",
      monthlyAmount: verifiedPurchase?.monthlyAmount || null,
      purchaseTimestamp: verifiedPurchase?.purchaseTimestamp || null,
      expirationTimestamp: verifiedPurchase?.expirationTimestamp || null,
      offerId: verifiedPurchase?.offerId || null,
      transactionEvidence: {},
      appVersion: getAppVersion()
    };
    if (payload.platform === "ios") {
      payload.transactionEvidence.transactionId =
        verifiedPurchase?.transactionId || null;
      payload.transactionEvidence.originalTransactionId =
        verifiedPurchase?.originalTransactionId || null;
      const environment =
        normalizeStoreEnvironment(verifiedPurchase?.environment);
      if (environment) {
        payload.transactionEvidence.environment = environment;
      }
      if (verifiedPurchase?.signedTransaction) {
        payload.transactionEvidence.signedTransaction =
          verifiedPurchase.signedTransaction;
      }
    } else if (payload.platform === "android") {
      payload.transactionEvidence.purchaseToken =
        verifiedPurchase?.purchaseToken || null;
    }
    return payload;
  }

  function createPendingVerificationPayload(verifiedPurchase) {
    const payload = createPurchaseRegistrationPayload({}, verifiedPurchase);
    delete payload.name;
    delete payload.email;
    return payload;
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

  function renderSharedSupportUi(cache, stateOverride = null, actionOverride = null) {
    const state = stateOverride || getRuntimeState(cache);
    const action = actionOverride || resolveSupportAction(state);
    const content = ACTION_CONTENT[action];

    document.querySelectorAll("[data-supporter-badge]").forEach(badge => {
      badge.hidden = !state.isSupporter;
      if (state.isSupporter) {
        badge.textContent = "❤️ Supporter";
        badge.setAttribute("aria-label", "Reverse Flow Supporter");
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

  async function recoverSupporterIdentity(
    cache,
    registryService,
    email,
    platform = getPlatform()
  ) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new SupporterRegistryError(
        "Enter the email used to register your Supporter status.",
        { code: "email_invalid" }
      );
    }
    const confirmed = await registryService.getStatus(normalizedEmail);
    if (!confirmed.isSupporter) {
      return {
        recovered: false,
        record: confirmed
      };
    }
    return {
      recovered: true,
      record: cache.writeConfirmed(confirmed, {
        email: normalizedEmail,
        platform
      })
    };
  }

  function beginStoreProgress(status, initialMessage) {
    status.textContent = initialMessage;
    return setTimeout(() => {
      status.textContent =
        "This is taking a little longer than usual. Keep Reverse Flow open while the store confirms your support.";
    }, 8000);
  }

  function safeStoreErrorMessage(error, fallback) {
    return error instanceof SupportPurchaseError
      ? error.message
      : fallback;
  }

  function renderSimplifiedSupportActions(
    container,
    purchaseService,
    presentation,
    onPurchase
  ) {
    if (!container) return;
    const platform = getPlatform();
    const storePlatform =
      platform === "ios" ? "apple" : platform === "android" ? "google" : null;
    const options = purchaseService.getOptions(storePlatform);
    const oneTime = options.find(option => option.key === "oneTime5") || null;
    const monthly = options.find(option => option.key === "monthly3") || null;
    const visibility = resolveSupportActionVisibility(presentation);
    container.replaceChildren();

    const appendPurchaseButton = (option, label) => {
      if (!option) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "support-secondary-action";
      button.textContent = label;
      button.disabled = option.state !== "ready";
      button.addEventListener("click", async () => {
        if (button.dataset.purchasing === "true") return;
        const status = document.getElementById("supportPageStatus");
        button.dataset.purchasing = "true";
        button.disabled = true;
        status.textContent = "Opening the store…";
        try {
          const purchase = await purchaseService.purchase(option);
          await onPurchase(purchase);
        } catch (error) {
          status.textContent = safeStoreErrorMessage(
            error,
            "The store could not complete this request. Please try again."
          );
        } finally {
          button.dataset.purchasing = "false";
          button.disabled = option.state !== "ready";
        }
      });
      container.appendChild(button);
    };

    if (!visibility.showManage) {
      appendPurchaseButton(oneTime, "One-Time Contribution");
      appendPurchaseButton(monthly, "Monthly Support");
      return;
    }

    appendPurchaseButton(oneTime, "Make a One-Time Contribution");
    if (visibility.showMonthly) {
      appendPurchaseButton(monthly, "Support Monthly");
    }
    const manageButton = document.createElement("button");
    manageButton.type = "button";
    manageButton.className = "support-secondary-action";
    manageButton.textContent = "Manage Subscription";
    manageButton.addEventListener("click", async () => {
      const status = document.getElementById("supportPageStatus");
      try {
        await purchaseService.openNativeSubscriptionManagement();
      } catch (error) {
        status.textContent = safeStoreErrorMessage(
          error,
          "Subscription management could not be opened. Please try again."
        );
      }
    });
    container.appendChild(manageButton);
  }

  function renderSimplifiedSupportPage(cache, registryService, purchaseService) {
    const page = document.getElementById("supportPage");
    if (!page) return;

    const claimRecord = cache.read();
    const presentation = projectSupportPresentation(
      purchaseService.deriveBillingState(),
      claimRecord
    );
    renderSharedSupportUi(
      cache,
      {
        ...claimRecord,
        supportEligible: presentation.supportEligible
      },
      presentation.primaryAction
    );

    const title = document.getElementById("supportPageTitle");
    const intro = document.getElementById("supportPageIntro");
    const supportTitle = document.getElementById("supportSectionTitle");
    const supportCopy = document.getElementById("supportSectionCopy");
    const pageStatus = document.getElementById("supportPageStatus");
    const unclaimedState = document.getElementById("unclaimedSupporterState");
    const claimedState = document.getElementById("claimedSupporterState");

    title.textContent = "Support Reverse Flow";
    intro.textContent = "";
    intro.hidden = true;
    supportTitle.textContent = presentation.supportEligible
      ? "Thank You for Your Support"
      : "Become a Supporter";
    supportCopy.textContent = presentation.supportEligible
      ? "Your support helps keep Reverse Flow moving forward. You can make another contribution or manage it anytime through Apple or Google."
      : "Your support helps keep every Reverse Flow tool available to every firefighter.";
    unclaimedState.hidden = presentation.claimedSupporter;
    claimedState.hidden = !presentation.claimedSupporter;

    const completePurchase = async evidence => {
      pageStatus.textContent = "Completing your store purchase…";
      await purchaseService.completeApprovedPurchase(evidence);
      pageStatus.textContent = "Thank you for supporting Reverse Flow.";
      renderSimplifiedSupportPage(cache, registryService, purchaseService);
    };
    renderSimplifiedSupportActions(
      document.getElementById("supportActions"),
      purchaseService,
      presentation,
      completePurchase
    );

    const storePlatform =
      getPlatform() === "ios"
        ? "apple"
        : getPlatform() === "android"
          ? "google"
          : null;
    const options = purchaseService.getOptions(storePlatform);
    const requiredOptions = presentation.supportEligible
      ? options.filter(option => option.key === "oneTime5")
      : options.filter(option =>
          option.key === "oneTime5" || option.key === "monthly3"
        );
    const productsNote = document.getElementById(
      "supportProductsUnavailable"
    );
    if (productsNote) {
      const allReady =
        requiredOptions.length > 0 &&
        requiredOptions.every(option => option.state === "ready");
      const loading = requiredOptions.some(option => option.state === "loading");
      productsNote.hidden = allReady;
      productsNote.textContent = loading
        ? "Loading support options…"
        : "Support options are temporarily unavailable. Please try again later.";
    }

    if (page.dataset.simplifiedRecoveryBound !== "true") {
      page.dataset.simplifiedRecoveryBound = "true";
      purchaseService.onRecovery(evidence => {
        void purchaseService.completeApprovedPurchase(evidence)
          .then(() => {
            pageStatus.textContent = "Your store purchase has been restored.";
            renderSimplifiedSupportPage(cache, registryService, purchaseService);
          })
          .catch(error => {
            pageStatus.textContent = safeStoreErrorMessage(
              error,
              "Store completion will retry when the purchase service is available."
            );
          });
      });
    }

    const claimForm = document.getElementById("supporterClaimForm");
    if (claimForm && claimForm.dataset.simplifiedBound !== "true") {
      claimForm.dataset.simplifiedBound = "true";
      claimForm.addEventListener("submit", async event => {
        event.preventDefault();
        const status = document.getElementById("supporterClaimStatus");
        const submit = claimForm.querySelector("button[type='submit']");
        const name = String(claimForm.elements.fullName.value || "").trim();
        const email = String(claimForm.elements.email.value || "")
          .trim()
          .toLowerCase();
        if (!name || !isValidEmail(email)) {
          status.textContent = "Enter a name and valid email address.";
          return;
        }
        submit.disabled = true;
        status.textContent = "Claiming your Supporter status…";
        try {
          const confirmed = await registryService.claimSupporter({
            name,
            email,
            public: true
          });
          cache.writeConfirmed(confirmed, {
            email,
            platform: getPlatform()
          });
          status.textContent =
            "Your Supporter status has been claimed. Thank you.";
          renderSimplifiedSupportPage(cache, registryService, purchaseService);
        } catch (error) {
          status.textContent =
            error.message ||
            "Supporter status could not be claimed. Please try again.";
        } finally {
          submit.disabled = false;
        }
      });
    }
  }

  function initialize() {
    if (!global.localStorage) return;
    if (global.__reverseFlowSupporterV2Initialized === true) return;
    global.__reverseFlowSupporterV2Initialized = true;
    const cache = new SupporterCache(global.localStorage);
    const registry = new SupporterRegistryService();
    const productConfig =
      typeof SUPPORT_PRODUCT_CONFIG === "object"
        ? SUPPORT_PRODUCT_CONFIG
        : {};
    const purchases = new SupportPurchaseService(productConfig);
    const renderSharedV2 = () => {
      const claimRecord = cache.read();
      const presentation = projectSupportPresentation(
        purchases.deriveBillingState(),
        claimRecord
      );
      return renderSharedSupportUi(
        cache,
        {
          ...claimRecord,
          supportEligible: presentation.supportEligible
        },
        presentation.primaryAction
      );
    };
    renderSharedV2();
    renderSimplifiedSupportPage(cache, registry, purchases);
    if (document.getElementById("supportPage")) {
      void registry.runEnvironmentDiagnostic();
      purchases.onChange(() => {
        renderSharedV2();
        renderSimplifiedSupportPage(cache, registry, purchases);
      });
      void purchases.initialize().catch(error => {
        const status = document.getElementById("supportPageStatus");
        if (status && !status.textContent) {
          status.textContent = safeStoreErrorMessage(
            error,
            "Store support options are temporarily unavailable."
          );
        }
      });
    }
    let lastRefreshStartedAt = 0;
    const requestStatusRefresh = () => {
      void purchases.recoverPendingRegistration().catch(error => {
        console.warn(
          `[Reverse Flow Support Purchase] ${JSON.stringify({
            event: "pending-registration-recovery-deferred",
            failureCategory:
              error?.code || "pending_registration_recovery_failed",
            retryable: true
          })}`
        );
      });
      const now = Date.now();
      if (now - lastRefreshStartedAt < 60000) return;
      lastRefreshStartedAt = now;
      void purchases.refreshBillingState().then(() => {
        renderSharedV2();
        if (document.getElementById("supportPage")) {
          renderSimplifiedSupportPage(cache, registry, purchases);
        }
      });
      void refreshSupporterStatus(cache, registry).then(() => {
        renderSharedV2();
        if (document.getElementById("supportPage")) {
          renderSimplifiedSupportPage(cache, registry, purchases);
        }
      });
    };
    setTimeout(requestStatusRefresh, 0);
    document.addEventListener("resume", requestStatusRefresh);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestStatusRefresh();
    });
    global.addEventListener?.("online", requestStatusRefresh);

    document.addEventListener("reverseflow:legacy-entitlement-changed", () => {
      renderSharedV2();
      if (document.getElementById("supportPage")) {
        renderSimplifiedSupportPage(cache, registry, purchases);
      }
    });
  }

  const api = {
    ACTIONS,
    ACTION_CONTENT,
    BILLING_STATES,
    CLAIM_STATES,
    SUPPORT_UI_STATES,
    resolveSupportAction,
    projectSupportPresentation,
    resolveSupportActionVisibility,
    resolveSupporterUiPresentation,
    normalizeSupporterRecord,
    normalizeApiResponse,
    SupporterCache,
    SupporterRegistryError,
    SupporterRegistryService,
    SupportPurchaseRetryStore,
    PendingSupportRegistrationStore,
    SupportPurchaseService,
    SupportPurchaseError,
    createLegacyClaimPayload,
    createPurchaseRegistrationPayload,
    createPendingVerificationPayload,
    refreshSupporterStatus,
    recoverSupporterIdentity,
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
