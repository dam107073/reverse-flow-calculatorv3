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
    "finish-failed"
  ]);
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
        productId: contribution.productId || null,
        pendingReplacementProductId:
          contribution.pendingReplacementProductId || null,
        pendingReplacementMonthlyAmount:
          Number.isFinite(contribution.pendingReplacementMonthlyAmount)
            ? contribution.pendingReplacementMonthlyAmount
            : null,
        platform: contribution.platform || null,
        renewsOrExpiresAt: contribution.renewsOrExpiresAt || null
      },
      hasActiveRecurringSupport,
      lastVerifiedAt: record?.lastVerifiedAt || null,
      emailHash: /^[a-f0-9]{64}$/i.test(String(record?.emailHash || ""))
        ? String(record.emailHash).toLowerCase()
        : null,
      supporterEmail: isSupporter ? record?.supporterEmail || null : null,
      platform: isSupporter
        ? record?.platform || contribution.platform || null
        : null,
      syncStatus: record?.syncStatus || "cached",
      welcomeEmailConfirmed: record?.welcomeEmailConfirmed === true
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
        "Your Supporter status could not be confirmed. Please try again.",
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
        "Your Supporter status could not be confirmed. Please try again.",
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
        "Your Supporter status could not be confirmed. Please try again.",
        { code: "malformed_response" }
      );
    }
    const recurringShouldBeActive =
      payload.isSupporter &&
      (payload.recurringStatus === "active" ||
        payload.recurringStatus === "canceling");
    if (payload.hasActiveRecurringSupport !== recurringShouldBeActive) {
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
      !configured.routes?.claimLegacy ||
      !configured.routes?.verifyPurchase ||
      !configured.routes?.status ||
      !Number.isFinite(configured.timeoutsMs?.claimLegacy) ||
      !Number.isFinite(configured.timeoutsMs?.verifyPurchase) ||
      !Number.isFinite(configured.timeoutsMs?.status)
    ) {
      throw new Error("Supporter API configuration must use HTTPS.");
    }
    return {
      environment,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      routes: {
        ...configured.routes,
        verifyPendingPurchase:
          configured.routes.verifyPendingPurchase || "/api/supporters/verify-pending"
      },
      timeoutsMs: {
        ...configured.timeoutsMs,
        verifyPendingPurchase:
          configured.timeoutsMs.verifyPendingPurchase ||
          configured.timeoutsMs.verifyPurchase
      }
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
        routeKey === "verifyPurchase" ||
        routeKey === "verifyPendingPurchase";
      const registrationEventPrefix =
        routeKey === "verifyPendingPurchase"
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
      return this.request("claimLegacy", payload, "claimLegacy");
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
          parsed?.version !== 2 ||
          !["apple", "google"].includes(parsed?.provider) ||
          !parsed?.productId ||
          !parsed?.transactionReference ||
          parsed?.state !== "registration-required" ||
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
        version: 2,
        provider,
        productId: String(evidence?.productIdentifier || ""),
        transactionReference,
        environmentCategory:
          String(global.SUPPORTER_API_CONFIG?.environment || "unknown"),
        approvedAt:
          toIsoTimestamp(evidence?.purchaseTimestamp) || new Date().toISOString(),
        state: "registration-required",
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
      this.finishedTransactionKeys = new Set();
      this.supportUiState = SUPPORT_UI_STATES.NOT_SUPPORTER;
      this.lastConfirmedSupporterState = null;
      this.lastConfirmedSupportAction = null;
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
          offer
        };
      });
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

    async refreshConfirmedSupporter(callback) {
      this.beginSupportUiOperation(SUPPORT_UI_STATES.SUPPORTER_REFRESHING);
      try {
        return await callback();
      } finally {
        this.endSupportUiOperation();
      }
    }

    supportProductIds(platform = getPlatform()) {
      const storeKey = platform === "ios" ? "apple" : platform === "android" ? "google" : platform;
      return new Set(
        Object.values(this.config[storeKey] || {})
          .map(value => typeof value === "string" ? value : value?.productId)
          .filter(Boolean)
      );
    }

    transactionProductId(transaction) {
      const allowed = this.supportProductIds();
      return transaction?.products
        ?.map(product => product?.id)
        .find(productId => allowed.has(productId)) || null;
    }

    transactionEvidence(transaction, option = null) {
      const productIdentifier = this.transactionProductId(transaction) || option?.productId;
      const configuredOption = this.getOptions(getPlatform() === "ios" ? "apple" : "google")
        .find(candidate => candidate.productId === productIdentifier);
      const nativePurchase = transaction?.nativePurchase || {};
      return {
        paymentSource: getPlatform(),
        productIdentifier,
        purchaseType: configuredOption?.type || option?.type || null,
        monthlyAmount: configuredOption?.type === "monthly"
          ? configuredOption.amount
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
        offerId:
          transaction?.products?.find(product => product?.id === productIdentifier)?.offerId ||
          null,
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
        this.logTransaction("store-transaction-received", evidence, {
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
          waiter.reject(error);
          return true;
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
          const settled = this.settleTransaction(transaction, "approved");
          if (!settled) {
            const evidence = this.transactionEvidence(transaction);
            const key = this.transactionKey(evidence);
            this.logTransaction("store-transaction-received", evidence, {
              lifecycle: "approved-redelivery"
            });
            if (this.receivedTransactionKeys.has(key)) {
              this.logTransaction("store-transaction-duplicate-ignored", evidence, {
                lifecycle: "approved-redelivery"
              });
              return;
            }
            this.receivedTransactionKeys.add(key);
            const pending = this.retryStoreForEvidence(evidence).read();
            if (!pending || !this.transactionMatchesPending(evidence, pending)) {
              this.logTransaction("store-transaction-duplicate-ignored", evidence, {
                lifecycle: "historical-callback",
                reason: "no-current-pending-record"
              });
              return;
            }
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
        waiter.reject(new SupportPurchaseError(
          cancelled
            ? "Purchase canceled. No charge was made."
            : "The store could not complete this purchase. Please try again.",
          cancelled ? "purchase_cancelled" : "purchase_failed"
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
          }));
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
        this.notify();
        this.migrateSupportEnvironment();
        if (platform === "ios") {
          void this.recoverUnfinishedConsumable({ automatic: true });
        }
        void this.recoverPendingRegistration();
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
            resolve,
            reject,
            timeout
          });
        });
        const orderError = await current.offer.order(
          this.subscriptionReplacementData(current, context)
        );
        if (orderError) {
          const waiter = this.waiters.get(current.productId);
          if (waiter) {
            this.waiters.delete(current.productId);
            clearTimeout(waiter.timeout);
          }
          const cancelled =
            orderError.code === this.global.CdvPurchase?.ErrorCode?.PAYMENT_CANCELLED;
          throw new SupportPurchaseError(
            cancelled
              ? "Purchase canceled. No charge was made."
              : "The store could not complete this purchase. Please try again.",
            cancelled ? "purchase_cancelled" : "purchase_failed"
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

    activeRecurringPurchaseEvidence(productId) {
      return this.allSupportTransactions()
        .map(transaction => this.transactionEvidence(transaction))
        .filter(evidence =>
          evidence.purchaseType === "monthly" &&
          (!productId || evidence.productIdentifier === productId) &&
          Boolean(evidence.purchaseToken)
        )
        .sort((left, right) =>
          Date.parse(right.purchaseTimestamp || 0) -
          Date.parse(left.purchaseTimestamp || 0)
        )[0] || null;
    }

    subscriptionReplacementData(option, context = {}) {
      const fromProductId = context.currentRecurringProductId;
      if (
        getPlatform() !== "android" ||
        option?.type !== "monthly" ||
        !fromProductId ||
        fromProductId === option.productId
      ) {
        return undefined;
      }
      const current = this.activeRecurringPurchaseEvidence(fromProductId);
      if (!current?.purchaseToken) {
        throw new SupportPurchaseError(
          "Your current Google Play subscription could not be prepared for a plan change. Refresh your status and try again.",
          "subscription_replacement_token_unavailable"
        );
      }
      const modes = this.global.CdvPurchase?.GooglePlay?.ReplacementMode || {};
      const replacementMode =
        Number(option.amount) > Number(context.currentMonthlyAmount)
          ? modes.CHARGE_PRORATED_PRICE || "IMMEDIATE_AND_CHARGE_PRORATED_PRICE"
          : modes.DEFERRED || "DEFERRED";
      return {
        googlePlay: {
          oldPurchaseToken: current.purchaseToken,
          replacementMode
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
        pending.productId === this.oneTimeSupportProductId() &&
        this.supporterCache.read().isSupporter &&
        ["confirmed-awaiting-finish", "finish-failed"].includes(
          pending.lastRegistrationAttemptStatus
        )
      ) {
        this.oneTimeRetryStore.clear();
        this.logTransaction(
          "stale-consumable-retry-resolved",
          {
            paymentSource: pending.provider === "apple" ? "ios" : "android",
            productIdentifier: pending.productId
          },
          {
            stage: "local-recovery",
            backendOutcome: "supporter-confirmed-transaction-absent",
            retryable: false
          }
        );
        return null;
      }
      this.notifyRecovery({
        pendingRegistration: true,
        productIdentifier: pending.productId,
        paymentSource: pending.provider === "apple" ? "ios" : "android"
      });
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

    async acknowledgeVerifiedPendingSubscription(
      verifiedPurchase,
      completion = {}
    ) {
      if (
        verifiedPurchase?.paymentSource !== "android" ||
        verifiedPurchase?.purchaseType !== "monthly"
      ) {
        return false;
      }
      const pending = this.subscriptionRetryStore.read();
      if (
        completion.backendVerified !== true ||
        completion.pendingPersisted !== true ||
        !pending ||
        !this.transactionMatchesPending(verifiedPurchase, pending)
      ) {
        throw new SupportPurchaseError(
          "Your verified monthly support must be saved before Google Play acknowledgment.",
          "subscription_acknowledgment_preconditions_not_met"
        );
      }
      const transactionKey = this.transactionKey(verifiedPurchase);
      if (
        this.finishedTransactionKeys.has(transactionKey) ||
        verifiedPurchase.acknowledged === true
      ) {
        this.finishedTransactionKeys.add(transactionKey);
        this.markPendingAttempt(
          verifiedPurchase,
          "verified-awaiting-registration"
        );
        this.logTransaction(
          "google-subscription-acknowledgment-deduplicated",
          verifiedPurchase,
          {
            stage: "store-acknowledgment",
            backendOutcome: "already-acknowledged",
            acknowledgmentAttempted: false,
            retryable: false
          }
        );
        return false;
      }
      if (typeof verifiedPurchase?.transaction?.finish !== "function") {
        throw new SupportPurchaseError(
          "Your monthly support is saved and acknowledgment will retry automatically.",
          "subscription_acknowledgment_unavailable"
        );
      }
      this.logTransaction(
        "google-subscription-acknowledgment-started",
        verifiedPurchase,
        {
          stage: "store-acknowledgment",
          acknowledgmentAttempted: true,
          retryable: true
        }
      );
      await verifiedPurchase.transaction.finish();
      this.finishedTransactionKeys.add(transactionKey);
      this.markPendingAttempt(
        verifiedPurchase,
        "verified-awaiting-registration"
      );
      this.logTransaction(
        "google-subscription-acknowledgment-completed",
        verifiedPurchase,
        {
          stage: "store-acknowledgment",
          backendOutcome: "success",
          acknowledgmentAttempted: true,
          retryable: false
        }
      );
      return true;
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
        signedTransaction: null,
        offerId: null,
        environment: result?.environment || null,
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

    async recoverUnfinishedConsumable({ automatic = false } = {}) {
      await this.initialize();
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
      if (plugin?.recoverUnfinishedConsumable) {
        try {
          const result = await plugin.recoverUnfinishedConsumable();
          if (result?.found === true) {
            return this.captureRecoverableConsumable(
              this.nativeRecoveryEvidence(result),
              "storekit2-transaction-unfinished"
            );
          }
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
        completion.backendVerified !== true ||
        completion.registrationSucceeded !== true ||
        completion.supporterCached !== true
      ) {
        throw new SupportPurchaseError(
          "Your Supporter status must be saved before setup can finish.",
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
        verifiedPurchase?.acknowledged === true
      ) {
        this.finishedTransactionKeys.add(transactionKey);
        this.clearPendingRegistration(verifiedPurchase);
        this.logTransaction(
          "google-subscription-acknowledgment-deduplicated",
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

  function renderSupportOptions(
    container,
    purchaseService,
    platform,
    onPurchase,
    state = {}
  ) {
    if (!container) return;
    const storePlatform = platform === "ios" ? "apple" : platform === "android" ? "google" : null;
    const options = purchaseService.getOptions(storePlatform);
    const pendingRecord = purchaseService.readPendingRegistration();
    const pendingProductId =
      state.isSupporter && pendingRecord?.productId ===
        purchaseService.oneTimeSupportProductId()
        ? purchaseService.readPendingSubscriptionRegistration()?.productId
        : pendingRecord?.productId;
    container.innerHTML = "";

    options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "support-option";
      const isPendingProduct = option.productId === pendingProductId;
      button.disabled = option.state !== "ready" || isPendingProduct;
      const label = document.createElement("span");
      label.className = "support-option-label";
      label.textContent =
        state.isSupporter && option.type === "one-time" && option.localizedPrice
          ? `Add One-Time Support — ${option.localizedPrice}`
          : option.label;
      button.appendChild(label);
      const availability = document.createElement("span");
      availability.className = "support-option-availability";
      availability.textContent =
        isPendingProduct
          ? "Finishing your support…"
          : option.state === "loading"
          ? "Loading price…"
          : option.state === "ready"
            ? "Purchase"
            : "Unavailable";
      button.appendChild(availability);
      button.classList.toggle("is-loading", option.state === "loading");
      button.classList.toggle("is-unavailable", option.state === "unavailable");
      button.addEventListener("click", async () => {
        const status = document.getElementById("supportPageStatus");
        if (button.dataset.purchasing === "true") return;
        let slowMessageTimer = null;
        try {
          button.dataset.purchasing = "true";
          button.disabled = true;
          slowMessageTimer = beginStoreProgress(
            status,
            getPlatform() === "ios"
              ? "Contacting the App Store…"
              : "Contacting Google Play…"
          );
          const pendingPurchase = await purchaseService.purchase(option);
          await onPurchase(pendingPurchase);
        } catch (error) {
          status.textContent = error.message;
        } finally {
          clearTimeout(slowMessageTimer);
          button.dataset.purchasing = "false";
          button.disabled = option.state !== "ready" || isPendingProduct;
        }
      });
      container.appendChild(button);
    });
  }

  function recurringOptionForState(options, contribution) {
    return options.find(option =>
      option.type === "monthly" &&
      (
        option.productId === contribution?.productId ||
        (
          !contribution?.productId &&
          Number(option.amount) === Number(contribution?.monthlyAmount)
        )
      )
    ) || null;
  }

  function renderManageSupportOptions(
    container,
    purchaseService,
    platform,
    state,
    onPurchase
  ) {
    if (!container) return;
    const storePlatform =
      platform === "ios" ? "apple" : platform === "android" ? "google" : null;
    const options = purchaseService.getOptions(storePlatform);
    const current = recurringOptionForState(options, state.contribution);
    const pendingProductId =
      purchaseService.readPendingSubscriptionRegistration()?.productId;
    const scheduledProductId = state.contribution?.pendingReplacementProductId;
    container.innerHTML = "";

    const monthlyOptions = options.filter(option =>
      option.type === "monthly" && option.productId !== current?.productId
    );
    monthlyOptions.forEach(option => {
      const isDowngrade = Number(option.amount) < Number(current?.amount);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "support-secondary-action";
      button.textContent = option.localizedPrice
        ? `Change to ${option.localizedPrice}/month`
        : "Change Monthly Support";
      button.disabled =
        option.state !== "ready" ||
        Boolean(scheduledProductId) ||
        option.productId === pendingProductId;
      button.addEventListener("click", async () => {
        if (button.dataset.purchasing === "true") return;
        const status = document.getElementById("supportPageStatus");
        let slowMessageTimer = null;
        button.dataset.purchasing = "true";
        button.disabled = true;
        slowMessageTimer = beginStoreProgress(
          status,
          isDowngrade
            ? "Opening store confirmation…"
            : "Confirming your monthly support…"
        );
        try {
          const pendingPurchase = await purchaseService.purchase(option, {
            currentRecurringProductId: current?.productId,
            currentMonthlyAmount: current?.amount
          });
          await onPurchase(pendingPurchase);
        } catch (error) {
          status.textContent = error.message;
        } finally {
          clearTimeout(slowMessageTimer);
          button.dataset.purchasing = "false";
          button.disabled =
            option.state !== "ready" ||
            Boolean(scheduledProductId) ||
            option.productId === pendingProductId;
        }
      });
      container.appendChild(button);
    });

    const oneTime = options.find(option => option.type === "one-time");
    if (oneTime) {
      const oneTimeHeading = document.createElement("h3");
      oneTimeHeading.textContent = "One-time support";
      container.appendChild(oneTimeHeading);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "support-secondary-action";
      button.textContent = oneTime.localizedPrice
        ? `Add One-Time Support — ${oneTime.localizedPrice}`
        : "Add One-Time Support";
      button.disabled =
        oneTime.state !== "ready" ||
        oneTime.productId === pendingProductId;
      button.addEventListener("click", async () => {
        if (button.dataset.purchasing === "true") return;
        const status = document.getElementById("supportPageStatus");
        let slowMessageTimer = null;
        button.dataset.purchasing = "true";
        button.disabled = true;
        slowMessageTimer = beginStoreProgress(
          status,
          getPlatform() === "ios"
            ? "Contacting the App Store…"
            : "Contacting Google Play…"
        );
        try {
          const pendingPurchase = await purchaseService.purchase(oneTime);
          await onPurchase(pendingPurchase);
        } catch (error) {
          status.textContent = error.message;
        } finally {
          clearTimeout(slowMessageTimer);
          button.dataset.purchasing = "false";
          button.disabled =
            oneTime.state !== "ready" ||
            oneTime.productId === pendingProductId;
        }
      });
      container.appendChild(button);
    }
  }

  function renderSupportPage(cache, registryService, purchaseService) {
    const page = document.getElementById("supportPage");
    if (!page) return;

    const runtimeState = getRuntimeState(cache);
    const presentation = purchaseService.observeSupporterState(runtimeState);
    const { state, action } = renderSharedSupportUi(
      cache,
      presentation.state,
      presentation.action
    );
    const requestedAction = new URLSearchParams(global.location.search).get("action");
    const safeAction = requestedAction === action ? requestedAction : action;
    const title = document.getElementById("supportPageTitle");
    const intro = document.getElementById("supportPageIntro");
    const claimSection = document.getElementById("legacyClaimSection");
    const manageSection = document.getElementById("manageSupportSection");
    const optionsSection = document.getElementById("supportOptionsSection");
    const optionsKicker = document.getElementById("supportOptionsKicker");
    const optionsTitle = document.getElementById("supportOptionsTitle");
    const pageStatus = document.getElementById("supportPageStatus");
    const cacheStatus = document.getElementById("supportCacheStatus");
    if (cacheStatus) {
      cacheStatus.textContent = state.isSupporter && state.lastVerifiedAt
        ? `Last confirmed: ${new Date(state.lastVerifiedAt).toLocaleString()}.`
        : "";
    }
    const supporterRecoverySection = document.getElementById("recoverSupporterStatusSection");
    const pendingRecord = purchaseService.readPendingRegistration();
    const hasPendingRegistration = Boolean(pendingRecord) && !state.isSupporter;
    if (supporterRecoverySection) {
      supporterRecoverySection.hidden = state.isSupporter || hasPendingRegistration;
    }
    const legacyRecoverySection = document.getElementById("legacyRecoverySection");
    if (legacyRecoverySection) {
      legacyRecoverySection.hidden =
        hasPendingRegistration || safeAction === ACTIONS.CLAIM;
    }
    const benefitsSection = document.querySelector(".support-benefits-card");
    if (benefitsSection) benefitsSection.hidden = hasPendingRegistration;
    const registrationSection = document.getElementById("supportRegistrationSection");
    if (registrationSection) registrationSection.hidden = !hasPendingRegistration;

    title.textContent = "Support Reverse Flow";
    claimSection.hidden = hasPendingRegistration || safeAction !== ACTIONS.CLAIM;
    manageSection.hidden = hasPendingRegistration || safeAction !== ACTIONS.MANAGE;
    optionsSection.hidden = hasPendingRegistration ||
      safeAction === ACTIONS.CLAIM || safeAction === ACTIONS.MANAGE;
    if (optionsKicker) {
      optionsKicker.textContent = state.isSupporter
        ? "Reverse Flow Supporter"
        : "Community Supported";
    }
    if (optionsTitle) {
      optionsTitle.textContent = state.isSupporter
        ? "Continue Supporting"
        : "Help Build What Comes Next";
    }

    if (hasPendingRegistration) {
      intro.textContent = "Your support was received. Finish setting up your Supporter status below.";
    } else if (safeAction === ACTIONS.BECOME) {
      intro.textContent = "Join the firefighters helping Reverse Flow keep growing.";
    } else if (safeAction === ACTIONS.CONTINUE) {
      intro.textContent = "Thank you for helping build what comes next.";
    } else if (safeAction === ACTIONS.CLAIM) {
      intro.textContent = "Previous purchase found. Claim your permanent Supporter status below.";
    } else {
      intro.textContent = "Thank you for standing behind Reverse Flow.";
    }

    const contribution = state.contribution;
    const storePlatform =
      getPlatform() === "ios" ? "apple" : getPlatform() === "android" ? "google" : null;
    const supportOptions = purchaseService.getOptions(storePlatform);
    const currentRecurringOption = recurringOptionForState(
      supportOptions,
      contribution
    );
    document.getElementById("manageSupportDetails").textContent =
      state.hasActiveRecurringSupport
        ? `Current monthly support: ${
            currentRecurringOption?.localizedPrice ||
            "current store price"
          }/month`
        : "Current recurring contribution details are unavailable.";
    const handlePendingPurchase = async pendingPurchase =>
      purchaseService.reconcileTransaction(pendingPurchase, async () => {
      let pendingBackendVerified = false;
      let acknowledgmentAttempted = false;
      if (pendingPurchase?.transactionId || pendingPurchase?.purchaseToken) {
        global.reverseFlowPendingVerifiedSupportPurchase = pendingPurchase;
        purchaseService.markPendingAttempt(pendingPurchase, "verification-started");
        const localPendingStateWritten = Boolean(
          purchaseService.retryStoreForEvidence(pendingPurchase).read()
        );
        try {
          await registryService.verifyPendingPurchase(
            createPendingVerificationPayload(pendingPurchase),
            { localPendingStateWritten }
          );
          pendingBackendVerified = true;
          purchaseService.markPendingAttempt(
            pendingPurchase,
            "verification-succeeded"
          );
        } catch (error) {
          purchaseService.markPendingAttempt(pendingPurchase, "verification-failed");
          registryService.logRegistration("warn", {
            event: "pending-support-verification-deferred",
            provider:
              pendingPurchase.paymentSource === "ios" ? "apple" : "google",
            productId: pendingPurchase.productIdentifier,
            stage: "purchase-verification",
            routeName: "verifyPendingPurchase",
            path: registryService.config.routes.verifyPendingPurchase,
            httpStatus: Number(error?.status) || null,
            backendOutcome: "deferred",
            failureCategory: error?.code || "supporter_registry_error",
            retryable: true,
            verifiedPurchaseEvidencePresent: true,
            localPendingStateWritten,
            acknowledgmentAttempted: false
          });
        }
        if (
          pendingBackendVerified &&
          pendingPurchase.paymentSource === "android" &&
          pendingPurchase.purchaseType === "monthly"
        ) {
          try {
            acknowledgmentAttempted =
              await purchaseService.acknowledgeVerifiedPendingSubscription(
                pendingPurchase,
                {
                  backendVerified: true,
                  pendingPersisted: localPendingStateWritten
                }
              );
          } catch (error) {
            purchaseService.markPendingAttempt(
              pendingPurchase,
              "acknowledgment-failed"
            );
            registryService.logRegistration("warn", {
              event: "google-subscription-acknowledgment-deferred",
              provider: "google",
              productId: pendingPurchase.productIdentifier,
              stage: "store-acknowledgment",
              backendOutcome: "deferred",
              failureCategory:
                error?.code || "subscription_acknowledgment_failed",
              retryable: true,
              verifiedPurchaseEvidencePresent: true,
              localPendingStateWritten,
              acknowledgmentAttempted: true
            });
          }
        }
      }
      const cached = cache.read();
      if (
        cached.isSupporter &&
        cached.supporterEmail &&
        (pendingPurchase?.transactionId || pendingPurchase?.purchaseToken)
      ) {
        pageStatus.textContent = "Confirming your support…";
        purchaseService.markPendingAttempt(pendingPurchase, "registration-started");
        const payload = createPurchaseRegistrationPayload({
          name: "",
          email: cached.supporterEmail
        }, pendingPurchase);
        const confirmed = await registryService.registerVerifiedPurchase(payload, {
          existingSupporter: true,
          localPendingStateWritten: true,
          acknowledgmentAttempted
        });
        if (pendingPurchase?.recoverySource) {
          registryService.logRegistration("info", {
            event: "consumable-recovery-backend-verification-result",
            provider: payload.platform === "ios" ? "apple" : "google",
            productId: payload.productIdentifier,
            stage: "supporter-registration",
            httpStatus: 200,
            backendOutcome: "success",
            retryable: false,
            verifiedPurchaseEvidencePresent: true,
            localPendingStateWritten: true,
            acknowledgmentAttempted
          });
        }
        const cachedConfirmation = cache.writeConfirmed(confirmed, {
          email: cached.supporterEmail,
          platform: payload.platform
        });
        if (!cachedConfirmation.isSupporter || !cache.read().isSupporter) {
          throw new SupportPurchaseError(
            "Your Supporter status could not be saved on this device. Please try again.",
            "supporter_cache_confirmation_failed"
          );
        }
        try {
          purchaseService.markPendingAttempt(
            pendingPurchase,
            "confirmed-awaiting-finish"
          );
          await purchaseService.finishPurchase(pendingPurchase, {
            backendVerified: true,
            registrationSucceeded: true,
            supporterCached: true
          });
          global.reverseFlowPendingVerifiedSupportPurchase = null;
          pageStatus.textContent =
            "Thank you for continuing to support Reverse Flow.";
        } catch (finishError) {
          purchaseService.markPendingAttempt(pendingPurchase, "finish-failed");
          pageStatus.textContent =
            "Thank you for continuing to support Reverse Flow.";
          console.warn(
            `[Reverse Flow Support Purchase] ${JSON.stringify({
              event: "consumable-finish-deferred",
              failureCategory:
                finishError?.code || "storekit_finish_failed"
            })}`
          );
        }
        renderSupportPage(cache, registryService, purchaseService);
        return;
      }

      if (pendingPurchase?.transactionId || pendingPurchase?.purchaseToken) {
        global.reverseFlowPendingVerifiedSupportPurchase = pendingPurchase;
      }
      const registration = registrationSection;
      if (registration) {
        registration.hidden = false;
        pageStatus.textContent =
          "Your support was received. Add your name and email to finish setting up your Supporter status.";
        registration.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      renderSupportPage(cache, registryService, purchaseService);
      });

    renderSupportOptions(
      document.getElementById("supportOptions"),
      purchaseService,
      getPlatform(),
      handlePendingPurchase,
      state
    );
    if (state.hasActiveRecurringSupport) {
      renderManageSupportOptions(
        document.getElementById("manageSupportOptions"),
        purchaseService,
        getPlatform(),
        state,
        handlePendingPurchase
      );
    }
    if (page.dataset.purchaseRecoveryBound !== "true") {
      page.dataset.purchaseRecoveryBound = "true";
      purchaseService.onRecovery(pendingPurchase => {
        void handlePendingPurchase(pendingPurchase).catch(error => {
          pageStatus.textContent = error?.message ||
            "We couldn’t resume your Supporter setup automatically. Please try again.";
        });
      });
    }

    const optionStates = purchaseService.getOptions(
      getPlatform() === "ios" ? "apple" : getPlatform() === "android" ? "google" : null
    );
    const productsNote = document.getElementById("supportProductsUnavailable");
    if (productsNote) {
      const readyCount = optionStates.filter(option => option.state === "ready").length;
      const loadingCount = optionStates.filter(option => option.state === "loading").length;
      productsNote.hidden = readyCount === optionStates.length;
      productsNote.textContent = loadingCount
        ? "Loading localized prices from the store…"
        : readyCount
          ? "Some support options are temporarily unavailable."
          : "Store support options are temporarily unavailable. Please try again later.";
    }

    const manageButton = document.getElementById("manageSubscriptionButton");
    if (manageButton && manageButton.dataset.bound !== "true") {
      manageButton.dataset.bound = "true";
      manageButton.addEventListener("click", async () => {
        try {
          await purchaseService.openNativeSubscriptionManagement();
          await purchaseService.refreshConfirmedSupporter(() =>
            refreshSupporterStatus(cache, registryService)
          );
          renderSupportPage(cache, registryService, purchaseService);
        } catch (error) {
          pageStatus.textContent = error.message;
        }
      });
    }

    const subscriptionRefreshButton = document.getElementById("refreshSupportSubscriptionsButton");
    if (subscriptionRefreshButton && subscriptionRefreshButton.dataset.bound !== "true") {
      subscriptionRefreshButton.dataset.bound = "true";
      subscriptionRefreshButton.addEventListener("click", async () => {
        if (subscriptionRefreshButton.dataset.refreshing === "true") return;
        subscriptionRefreshButton.dataset.refreshing = "true";
        subscriptionRefreshButton.disabled = true;
        pageStatus.textContent =
          getPlatform() === "ios"
            ? "Refreshing Apple subscription status…"
            : "Refreshing Google Play subscription status…";
        try {
          await purchaseService.refreshConfirmedSupporter(() =>
            refreshSupporterStatus(cache, registryService)
          );
          renderSupportPage(cache, registryService, purchaseService);
          pageStatus.textContent = "Support status refreshed.";
        } catch (error) {
          pageStatus.textContent = error.message;
        } finally {
          subscriptionRefreshButton.dataset.refreshing = "false";
          subscriptionRefreshButton.disabled = false;
        }
      });
    }

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
          recoveryButton.textContent = "Check Previous PRO Purchase";
        }
      });
    }

    const supporterRecoveryForm = document.getElementById("recoverSupporterStatusForm");
    if (supporterRecoveryForm && supporterRecoveryForm.dataset.bound !== "true") {
      supporterRecoveryForm.dataset.bound = "true";
      supporterRecoveryForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (supporterRecoveryForm.dataset.submitting === "true") return;
        const email = String(
          supporterRecoveryForm.elements.email.value || ""
        ).trim().toLowerCase();
        const message = document.getElementById("recoverSupporterStatusMessage");
        const submit = supporterRecoveryForm.querySelector("button[type='submit']");
        if (!isValidEmail(email)) {
          message.textContent = "Enter the email used to register your Supporter status.";
          return;
        }
        supporterRecoveryForm.dataset.submitting = "true";
        submit.disabled = true;
        message.textContent = "Checking your Supporter status…";
        try {
          const recovery = await recoverSupporterIdentity(
            cache,
            registryService,
            email,
            getPlatform()
          );
          if (!recovery.recovered) {
            message.textContent =
              "We couldn’t find Supporter status for that email.";
            return;
          }
          message.textContent = "Your Supporter status has been restored on this device.";
          await purchaseService.refreshConfirmedSupporter(() =>
            refreshSupporterStatus(cache, registryService)
          );
          renderSupportPage(cache, registryService, purchaseService);
        } catch (error) {
          message.textContent = error.message ||
            "We couldn’t recover your Supporter status. Please try again.";
        } finally {
          supporterRecoveryForm.dataset.submitting = "false";
          submit.disabled = false;
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
        const hasStoreEvidence =
          payload.platform === "ios"
            ? Boolean(
                payload.transactionEvidence.transactionId ||
                payload.transactionEvidence.originalTransactionId
              )
            : Boolean(payload.transactionEvidence.purchaseToken);
        if (!payload.productIdentifier || !hasStoreEvidence) {
          status.textContent = "Complete your support purchase before finishing setup.";
          return;
        }
        if (!navigator.onLine) {
          purchaseService.markPendingAttempt(verifiedPurchase, "registration-failed");
          status.textContent = "An internet connection is required to update your supporter status.";
          return;
        }

        submit.disabled = true;
        purchaseService.markPendingAttempt(verifiedPurchase, "registration-started");
        status.textContent = "Finishing your Supporter setup…";
        try {
          const pendingStateWritten = Boolean(
            purchaseService.retryStoreForEvidence(verifiedPurchase).read()
          );
          const confirmed = await registryService.registerVerifiedPurchase(
            payload,
            {
              localPendingStateWritten: pendingStateWritten,
              acknowledgmentAttempted:
                verifiedPurchase?.paymentSource === "android" &&
                verifiedPurchase?.purchaseType === "monthly" &&
                (
                  verifiedPurchase?.acknowledged === true ||
                  purchaseService.finishedTransactionKeys.has(
                    purchaseService.transactionKey(verifiedPurchase)
                  )
                )
            }
          );
          if (verifiedPurchase?.recoverySource) {
            registryService.logRegistration("info", {
              event: "consumable-recovery-backend-verification-result",
              provider: payload.platform === "ios" ? "apple" : "google",
              productId: payload.productIdentifier,
              stage: "supporter-registration",
              httpStatus: 200,
              backendOutcome: "success",
              retryable: false,
              verifiedPurchaseEvidencePresent: true,
              localPendingStateWritten: pendingStateWritten,
              acknowledgmentAttempted:
                verifiedPurchase?.paymentSource === "android" &&
                verifiedPurchase?.purchaseType === "monthly"
            });
          }
          const cachedConfirmation = cache.writeConfirmed(confirmed, {
            email: payload.email,
            platform: payload.platform
          });
          if (!cachedConfirmation.isSupporter || !cache.read().isSupporter) {
            throw new SupportPurchaseError(
              "Your Supporter status could not be saved on this device. Please try again.",
              "supporter_cache_confirmation_failed"
            );
          }
          try {
            purchaseService.markPendingAttempt(
              verifiedPurchase,
              "confirmed-awaiting-finish"
            );
            await purchaseService.finishPurchase(verifiedPurchase, {
              backendVerified: true,
              registrationSucceeded: true,
              supporterCached: true
            });
            global.reverseFlowPendingVerifiedSupportPurchase = null;
            status.textContent =
              "You’re officially a Reverse Flow Supporter. Thank you for helping build what comes next.";
          } catch (finishError) {
            purchaseService.markPendingAttempt(verifiedPurchase, "finish-failed");
            status.textContent =
              "You’re officially a Reverse Flow Supporter. Thank you for helping build what comes next.";
            console.warn(
              `[Reverse Flow Support Purchase] ${JSON.stringify({
                event: "consumable-finish-deferred",
                failureCategory:
                  finishError?.code || "storekit_finish_failed"
              })}`
            );
          }
          registrationForm.reset();
          renderSupportPage(cache, registryService, purchaseService);
        } catch (error) {
          purchaseService.markPendingAttempt(verifiedPurchase, "registration-failed");
          if (verifiedPurchase?.recoverySource) {
            registryService.logRegistration("info", {
              event: "consumable-recovery-backend-verification-result",
              provider: payload.platform === "ios" ? "apple" : "google",
              productId: payload.productIdentifier,
              stage: "supporter-registration",
              httpStatus: Number(error?.status) || null,
              backendOutcome: "failed",
              failureCategory: error?.code || "supporter_registry_error",
              retryable: true,
              verifiedPurchaseEvidencePresent: true,
              localPendingStateWritten: true,
              acknowledgmentAttempted:
                verifiedPurchase?.paymentSource === "android" &&
                verifiedPurchase?.purchaseType === "monthly"
            });
          }
          registryService.logRegistration("info", {
            event: "supporter-registration-retry-available",
            provider: payload.platform === "ios" ? "apple" : "google",
            productId: payload.productIdentifier,
            stage: "supporter-registration",
            httpStatus: Number(error?.status) || null,
            backendOutcome: "retry-available",
            failureCategory: error?.code || "supporter_registry_error",
            retryable: true,
            verifiedPurchaseEvidencePresent: true,
            localPendingStateWritten: true,
            acknowledgmentAttempted:
              verifiedPurchase?.paymentSource === "android" &&
              verifiedPurchase?.purchaseType === "monthly"
          });
          status.textContent =
            verifiedPurchase?.purchaseType === "monthly"
              ? "Your monthly support was received, but Supporter setup could not be completed right now. Please try again."
              : "Your support was received, but Supporter setup could not be completed right now. Please try again.";
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
    if (document.getElementById("supportPage")) {
      void registry.runEnvironmentDiagnostic();
      purchases.onChange(() => {
        renderSupportPage(cache, registry, purchases);
      });
      void purchases.initialize().catch(error => {
        const status = document.getElementById("supportPageStatus");
        if (status && !status.textContent) {
          status.textContent =
            error?.message || "Store support options are temporarily unavailable.";
        }
      });
    }
    let lastRefreshStartedAt = 0;
    const requestStatusRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshStartedAt < 60000) return;
      lastRefreshStartedAt = now;
      void purchases.refreshConfirmedSupporter(() =>
        refreshSupporterStatus(cache, registry)
      ).then(() => {
        if (document.getElementById("supportPage")) {
          renderSupportPage(cache, registry, purchases);
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
      renderSharedSupportUi(cache);
      if (document.getElementById("supportPage")) {
        renderSupportPage(cache, registry, purchases);
      }
    });
  }

  const api = {
    ACTIONS,
    ACTION_CONTENT,
    SUPPORT_UI_STATES,
    resolveSupportAction,
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
