(function (global) {
  "use strict";

  const CACHE_VERSION = 1;
  const DEFAULT_CACHE_KEY = "reverse-flow-supporter-cache-v1";
  const PURCHASE_RETRY_CACHE_KEY = "reverse-flow-support-pending-registration-v2";
  const LEGACY_PURCHASE_RETRY_CACHE_KEY = "reverse-flow-support-purchase-retry-v1";
  const PENDING_REGISTRATION_STATUSES = new Set([
    "not-attempted",
    "verification-started",
    "verification-failed",
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
      this.console = dependencies.console || global.console;
      this.platform = dependencies.platform || getPlatform();
    }

    logRegistration(level, details) {
      const logger = this.console?.[level] || this.console?.log;
      if (typeof logger !== "function") return;
      logger.call(this.console, "[Reverse Flow Supporter Registration]", {
        ...details
      });
    }

    async request(routeKey, body, timeoutKey, options = {}) {
      const route = this.config.routes[routeKey];
      const url = `${this.config.baseUrl}${route}`;
      const backendHost = new URL(url).host;
      const isRegistration = routeKey === "verifyPurchase";
      if (isRegistration) {
        this.logRegistration("info", {
          event: "supporter-registration-request-started",
          backendHost,
          environment: this.config.environment,
          platform: this.platform
        });
      }
      if (this.navigator?.onLine === false) {
        if (isRegistration) {
          this.logRegistration("warn", {
            event: "supporter-registration-failed",
            backendHost,
            environment: this.config.environment,
            platform: this.platform,
            failureCategory: "offline"
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
            event: "supporter-registration-failed",
            backendHost,
            environment: this.config.environment,
            platform: this.platform,
            failureCategory: "transport_unavailable"
          });
        }
        throw new SupporterRegistryError(
          "The Supporter Directory is unavailable on this device.",
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
            event: "supporter-registration-failed",
            backendHost,
            environment: this.config.environment,
            platform: this.platform,
            failureCategory: timedOut ? "timeout" : "network_exception"
          });
        }
        throw new SupporterRegistryError(
          timedOut
            ? "The Supporter Directory request timed out. Please try again."
            : "The Supporter Directory could not be reached. Check your connection and try again.",
          { code: timedOut ? "timeout" : "network_error" }
        );
      } finally {
        if (timeout) clearTimeout(timeout);
      }

      if (isRegistration) {
        this.logRegistration("info", {
          event: "supporter-registration-response",
          backendHost,
          environment: this.config.environment,
          platform: this.platform,
          responseStatus: response.status
        });
      }

      let payload;
      try {
        const text = await response.text();
        payload = text ? JSON.parse(text) : null;
      } catch {
        if (isRegistration) {
          this.logRegistration("warn", {
            event: "supporter-registration-failed",
            backendHost,
            environment: this.config.environment,
            platform: this.platform,
            responseStatus: response.status,
            failureCategory: "malformed_response"
          });
        }
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
        if (isRegistration) {
          this.logRegistration("warn", {
            event: "supporter-registration-failed",
            backendHost,
            environment: this.config.environment,
            platform: this.platform,
            responseStatus: response.status,
            failureCategory:
              response.status === 429
                ? "rate_limited"
                : response.status >= 500
                  ? "backend_server_error"
                  : "backend_rejected"
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
          event: "supporter-registration-request-completed",
          backendHost,
          environment: this.config.environment,
          platform: this.platform,
          responseStatus: response.status,
          outcome: "success"
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

    async registerVerifiedPurchase(payload) {
      return this.request("verifyPurchase", payload, "verifyPurchase");
    }

    async verifyPendingPurchase(payload) {
      return this.request(
        "verifyPendingPurchase",
        payload,
        "verifyPendingPurchase",
        { normalize: false }
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
          "The pending registration could not be saved on this device.",
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
  }

  const SupportPurchaseRetryStore = PendingSupportRegistrationStore;

  class SupportPurchaseService {
    constructor(config, dependencies = {}) {
      this.config = config || {};
      this.global = dependencies.global || global;
      this.store = dependencies.store || this.global.CdvPurchase?.store || null;
      this.retryStore = dependencies.pendingStore || dependencies.retryStore ||
        new PendingSupportRegistrationStore(
        dependencies.storage || this.global.localStorage
      );
      this.initialization = null;
      this.initialized = false;
      this.initializeError = null;
      this.purchaseInFlight = null;
      this.waiters = new Map();
      this.listeners = new Set();
      this.recoveryListeners = new Set();
      this.bound = false;
      this.nativeRecoveryBound = false;
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
          return product.getOffer?.(`${configured.productId}@${suffix}`) || null;
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
          console.warn("[Reverse Flow Support Purchase]", {
            event: "consumable-recovery-listener-failed",
            failureCategory: error?.code || "listener_error"
          });
        }
      });
    }

    notify() {
      this.listeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          console.warn("[Reverse Flow Support Purchase]", {
            event: "support-purchase-listener-failed",
            message: error?.message || String(error)
          });
        }
      });
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
        transaction
      };
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
        try {
          this.retryStore.write(evidence);
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
      this.retryStore.write(evidence);
      const recoverable = {
        ...evidence,
        recoverySource: source,
        transaction: evidence.transaction || null
      };
      console.info("[Reverse Flow Support Purchase]", {
        event: "unfinished-transaction-found",
        productId: recoverable.productIdentifier,
        source
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
      this.store.when()
        .productUpdated(product => {
          if (this.supportProductIds().has(product?.id)) this.notify();
        }, "reverseFlowSupportProducts")
        .approved(transaction => {
          const settled = this.settleTransaction(transaction, "approved");
          if (!settled) {
            const evidence = this.transactionEvidence(transaction);
            try {
              this.retryStore.write(evidence);
            } catch (error) {
              console.error("[Reverse Flow Support Purchase]", {
                event: "pending-registration-persistence-failed",
                productId: evidence.productIdentifier,
                failureCategory: error?.code || "storage_error"
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
      this.store.error?.(error => {
        const productId = error?.productId;
        const waiter = productId ? this.waiters.get(productId) : null;
        if (!waiter) return;
        this.waiters.delete(productId);
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

    async purchase(option) {
      if (this.purchaseInFlight) {
        throw new SupportPurchaseError(
          "A store purchase is already in progress.",
          "purchase_in_progress"
        );
      }
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
        const orderError = await current.offer.order();
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
        return transactionPromise;
      })();
      try {
        return await this.purchaseInFlight;
      } finally {
        this.purchaseInFlight = null;
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

    readPendingRegistration() {
      return this.retryStore.read();
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
      const pending = this.retryStore.read();
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
      this.notifyRecovery({
        pendingRegistration: true,
        productIdentifier: pending.productId,
        paymentSource: pending.provider === "apple" ? "ios" : "android"
      });
      return null;
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
      console.info("[Reverse Flow Support Purchase]", {
        event: "consumable-recovery-attempted",
        productId: this.oneTimeSupportProductId(),
        automatic
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
          console.warn("[Reverse Flow Support Purchase]", {
            event: "consumable-recovery-bridge-failed",
            failureCategory: error?.code || "native_bridge_error"
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

      const persisted = this.retryStore.read();
      if (persisted) {
        console.info("[Reverse Flow Support Purchase]", {
          event: "persisted-consumable-retry-found",
          productId: persisted.productId
        });
        this.notifyRecovery({
          pendingRegistration: true,
          productIdentifier: persisted.productId,
          paymentSource: "ios"
        });
        return null;
      }

      console.info("[Reverse Flow Support Purchase]", {
        event: "no-recoverable-transaction-found",
        productId: this.oneTimeSupportProductId()
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
          "Supporter confirmation must be saved before the store transaction can finish.",
          "purchase_finish_preconditions_not_met"
        );
      }
      const isAppleConsumable =
        verifiedPurchase?.paymentSource === "ios" &&
        verifiedPurchase?.productIdentifier === this.oneTimeSupportProductId() &&
        Boolean(verifiedPurchase?.transactionId);
      if (isAppleConsumable) {
        const plugin = this.global.Capacitor?.Plugins?.SupportPurchaseRecovery;
        if (plugin?.finishRecoveredConsumable) {
          await plugin.finishRecoveredConsumable({
            transactionId: verifiedPurchase.transactionId
          });
          this.retryStore.clear();
          return;
        }
        if (typeof verifiedPurchase?.transaction?.finish === "function") {
          await verifiedPurchase.transaction.finish();
          this.retryStore.clear();
          return;
        }
        throw new SupportPurchaseError(
          "StoreKit completion is temporarily unavailable. The verified purchase remains recoverable.",
          "consumable_finish_unavailable"
        );
      }
      const transaction = verifiedPurchase?.transaction;
      if (typeof transaction?.finish !== "function") {
        throw new SupportPurchaseError(
          "Store completion is temporarily unavailable. Registration remains saved for retry.",
          "purchase_finish_unavailable"
        );
      }
      await transaction.finish();
      this.retryStore.clear();
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

  function renderSupportOptions(container, purchaseService, platform, onPurchase) {
    if (!container) return;
    const storePlatform = platform === "ios" ? "apple" : platform === "android" ? "google" : null;
    const options = purchaseService.getOptions(storePlatform);
    container.innerHTML = "";

    options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "support-option";
      button.disabled = option.state !== "ready";
      const label = document.createElement("span");
      label.className = "support-option-label";
      label.textContent = option.label;
      button.appendChild(label);
      const availability = document.createElement("span");
      availability.className = "support-option-availability";
      availability.textContent =
        option.state === "loading"
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
        try {
          button.dataset.purchasing = "true";
          button.disabled = true;
          status.textContent = "Connecting to the store…";
          const pendingPurchase = await purchaseService.purchase(option);
          await onPurchase(pendingPurchase);
        } catch (error) {
          status.textContent = error.message;
        } finally {
          button.dataset.purchasing = "false";
          button.disabled = option.state !== "ready";
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
    const pageStatus = document.getElementById("supportPageStatus");
    const cacheStatus = document.getElementById("supportCacheStatus");
    if (cacheStatus) {
      cacheStatus.textContent = state.isSupporter && state.lastVerifiedAt
        ? `Last confirmed by the Supporter Directory: ${new Date(state.lastVerifiedAt).toLocaleString()}.`
        : "";
    }
    const supporterRecoverySection = document.getElementById("recoverSupporterStatusSection");
    const pendingRecord = purchaseService.readPendingRegistration();
    const hasPendingRegistration = Boolean(pendingRecord);
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
    document.getElementById("manageSupportDetails").textContent =
      state.hasActiveRecurringSupport
        ? `$${contribution.monthlyAmount || "—"} monthly · ${contribution.platform || "platform unavailable"} · ${contribution.status}`
        : "Current recurring contribution details are unavailable.";

    const handlePendingPurchase = async pendingPurchase => {
      if (pendingPurchase?.transactionId || pendingPurchase?.purchaseToken) {
        global.reverseFlowPendingVerifiedSupportPurchase = pendingPurchase;
        purchaseService.retryStore.markAttempt("verification-started");
        try {
          await registryService.verifyPendingPurchase(
            createPendingVerificationPayload(pendingPurchase)
          );
        } catch (error) {
          purchaseService.retryStore.markAttempt("verification-failed");
          registryService.logRegistration("warn", {
            event: "pending-support-verification-deferred",
            backendHost: new URL(registryService.config.baseUrl).host,
            environment: registryService.config.environment,
            platform: pendingPurchase.paymentSource,
            failureCategory: error?.code || "supporter_registry_error"
          });
        }
      }
      const cached = cache.read();
      if (
        cached.isSupporter &&
        cached.supporterEmail &&
        (pendingPurchase?.transactionId || pendingPurchase?.purchaseToken)
      ) {
        pageStatus.textContent = "Verifying the purchase with the store…";
        purchaseService.retryStore.markAttempt("registration-started");
        const payload = createPurchaseRegistrationPayload({
          name: "",
          email: cached.supporterEmail
        }, pendingPurchase);
        const confirmed = await registryService.registerVerifiedPurchase(payload);
        if (pendingPurchase?.recoverySource) {
          registryService.logRegistration("info", {
            event: "consumable-recovery-backend-verification-result",
            backendHost: new URL(registryService.config.baseUrl).host,
            environment: registryService.config.environment,
            platform: payload.platform,
            responseStatus: 200,
            outcome: "success"
          });
        }
        cache.writeConfirmed(confirmed, {
          email: cached.supporterEmail,
          platform: payload.platform
        });
        if (confirmed.welcomeEmailConfirmed !== true) {
          global.reverseFlowPendingVerifiedSupportPurchase = pendingPurchase;
          pageStatus.textContent =
            "Supporter status is confirmed, but welcome email delivery is not yet confirmed. The StoreKit transaction remains unfinished for retry.";
          renderSupportPage(cache, registryService, purchaseService);
          return;
        }
        try {
          purchaseService.retryStore.markAttempt("confirmed-awaiting-finish");
          await purchaseService.finishPurchase(pendingPurchase, {
            backendVerified: true,
            registrationSucceeded: true,
            supporterCached: true
          });
          global.reverseFlowPendingVerifiedSupportPurchase = null;
          pageStatus.textContent = "Supporter status updated. Thank you.";
        } catch (finishError) {
          purchaseService.retryStore.markAttempt("finish-failed");
          pageStatus.textContent =
            "Supporter status is confirmed. StoreKit completion remains pending and will be retried.";
          console.warn("[Reverse Flow Support Purchase]", {
            event: "consumable-finish-deferred",
            failureCategory: finishError?.code || "storekit_finish_failed"
          });
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
    };

    renderSupportOptions(
      document.getElementById("supportOptions"),
      purchaseService,
      getPlatform(),
      handlePendingPurchase
    );
    if (page.dataset.purchaseRecoveryBound !== "true") {
      page.dataset.purchaseRecoveryBound = "true";
      purchaseService.onRecovery(pendingPurchase => {
        void handlePendingPurchase(pendingPurchase).catch(error => {
          pageStatus.textContent = error?.message ||
            "The recovered purchase could not be prepared for registration.";
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
          await refreshSupporterStatus(cache, registryService);
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
          await refreshSupporterStatus(cache, registryService);
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
        message.textContent = "Checking the Supporter Directory…";
        try {
          const recovery = await recoverSupporterIdentity(
            cache,
            registryService,
            email,
            getPlatform()
          );
          if (!recovery.recovered) {
            message.textContent =
              "No registered Supporter was found for that email. No local status was changed.";
            return;
          }
          message.textContent = "Supporter status recovered from the Supporter Directory.";
          await refreshSupporterStatus(cache, registryService);
          renderSupportPage(cache, registryService, purchaseService);
        } catch (error) {
          message.textContent = error.message ||
            "The Supporter Directory could not complete recovery.";
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
          status.textContent = "A verified store transaction is required before registration.";
          return;
        }
        if (!navigator.onLine) {
          purchaseService.retryStore.markAttempt("registration-failed");
          status.textContent = "An internet connection is required to update your supporter status.";
          return;
        }

        submit.disabled = true;
        purchaseService.retryStore.markAttempt("registration-started");
        status.textContent = "Finishing your Supporter setup…";
        try {
          const confirmed = await registryService.registerVerifiedPurchase(payload);
          if (verifiedPurchase?.recoverySource) {
            registryService.logRegistration("info", {
              event: "consumable-recovery-backend-verification-result",
              backendHost: new URL(registryService.config.baseUrl).host,
              environment: registryService.config.environment,
              platform: payload.platform,
              responseStatus: 200,
              outcome: "success"
            });
          }
          cache.writeConfirmed(confirmed, {
            email: payload.email,
            platform: payload.platform
          });
          if (confirmed.welcomeEmailConfirmed !== true) {
            status.textContent =
              "Supporter status is confirmed, but welcome email delivery is not yet confirmed. The StoreKit transaction remains unfinished for retry.";
            renderSupportPage(cache, registryService, purchaseService);
            return;
          }
          try {
            purchaseService.retryStore.markAttempt("confirmed-awaiting-finish");
            await purchaseService.finishPurchase(verifiedPurchase, {
              backendVerified: true,
              registrationSucceeded: true,
              supporterCached: true
            });
            global.reverseFlowPendingVerifiedSupportPurchase = null;
            status.textContent = "Supporter status confirmed. Welcome to the Reverse Flow community.";
          } catch (finishError) {
            purchaseService.retryStore.markAttempt("finish-failed");
            status.textContent =
              "Supporter status is confirmed. StoreKit completion remains pending and will be retried.";
            console.warn("[Reverse Flow Support Purchase]", {
              event: "consumable-finish-deferred",
              failureCategory: finishError?.code || "storekit_finish_failed"
            });
          }
          registrationForm.reset();
          renderSupportPage(cache, registryService, purchaseService);
        } catch (error) {
          purchaseService.retryStore.markAttempt("registration-failed");
          if (verifiedPurchase?.recoverySource) {
            registryService.logRegistration("info", {
              event: "consumable-recovery-backend-verification-result",
              backendHost: new URL(registryService.config.baseUrl).host,
              environment: registryService.config.environment,
              platform: payload.platform,
              responseStatus: Number(error?.status) || null,
              outcome: "failed",
              failureCategory: error?.code || "supporter_registry_error"
            });
          }
          registryService.logRegistration("info", {
            event: "supporter-registration-retry-available",
            backendHost: new URL(registryService.config.baseUrl).host,
            environment: registryService.config.environment,
            platform: payload.platform,
            failureCategory: error?.code || "supporter_registry_error"
          });
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
    if (document.getElementById("supportPage")) {
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
      void refreshSupporterStatus(cache, registry).then(() => {
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
