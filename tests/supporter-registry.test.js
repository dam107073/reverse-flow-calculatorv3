const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const {
  SupporterCache,
  SupporterRegistryError,
  SupporterRegistryService,
  createLegacyClaimPayload,
  normalizeApiResponse,
  refreshSupporterStatus
} = require("../www/js/services/supporter.js");

const API_CONFIG = {
  environment: "preview",
  baseUrls: {
    preview: "https://preview.example.test",
    production: "https://reverse-flow.app"
  },
  routes: {
    claimLegacy: "/api/supporters/claim-legacy",
    verifyPurchase: "/api/supporters/verify-purchase",
    status: "/api/supporters/status"
  },
  timeoutsMs: {
    claimLegacy: 25,
    verifyPurchase: 25,
    status: 25
  }
};

const confirmedResponse = {
  isSupporter: true,
  supporterSince: "2021-04-08",
  hasActiveRecurringSupport: false,
  recurringStatus: "inactive",
  source: "legacy_apple",
  lastVerifiedAt: "2026-07-23T18:00:00.000Z"
};

function response(status, payload, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => headers[name] ?? null },
    text: async () => typeof payload === "string" ? payload : JSON.stringify(payload)
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
}

const entitlementSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "js", "services", "entitlement.js"),
  "utf8"
);

function extractEntitlementFunction(name) {
  const marker = `function ${name}(`;
  const start = entitlementSource.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = entitlementSource.indexOf("{", entitlementSource.indexOf(") {", start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < entitlementSource.length; index += 1) {
    const character = entitlementSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return entitlementSource.slice(start, index + 1);
    }
  }
  throw new Error(`Unable to extract ${name}`);
}

function extractEvidence(platform, transactions, stored = {}) {
  const context = {
    REVERSE_FLOW_PRO_PRODUCT_ID: "reverse_flow_pro_lifetime",
    window: {
      Capacitor: { getPlatform: () => platform },
      CdvPurchase: {
        store: {
          localTransactions: transactions,
          localReceipts: [],
          verifiedReceipts: []
        }
      }
    },
    getLegacyProEntitlementEvidence: () => stored,
    hasLegacyProEntitlement: () => true
  };
  vm.createContext(context);
  vm.runInContext(
    `${extractEntitlementFunction("getLegacyProStoreTransactions")};` +
    `${extractEntitlementFunction("transactionContainsLegacyProduct")};` +
    `${extractEntitlementFunction("toIsoTimestamp")};` +
    `${extractEntitlementFunction("collectLegacyProEntitlementEvidence")};` +
    "this.result = collectLegacyProEntitlementEvidence();",
    context
  );
  return context.result;
}

test("claim client uses the exact route, JSON headers, body, and no sensitive URL data", async () => {
  const calls = [];
  const service = new SupporterRegistryService(API_CONFIG, {
    platform: "ios",
    navigator: { onLine: true },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return response(200, confirmedResponse);
    }
  });
  const payload = {
    name: "Firefighter Name",
    email: "firefighter@example.com",
    platform: "ios",
    legacyProductIdentifier: "reverse_flow_pro_lifetime",
    entitlementEvidence: { originalTransactionId: "apple-secret-reference" },
    originalTransactionId: "apple-secret-reference"
  };

  const result = await service.submitLegacyClaim(payload);
  assert.equal(result.isSupporter, true);
  assert.equal(calls[0].url, "https://preview.example.test/api/supporters/claim-legacy");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Accept, "application/json");
  assert.equal(calls[0].options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].options.body), payload);
  assert.doesNotMatch(calls[0].url, /apple-secret-reference|firefighter%40/i);
});

test("status client normalizes email and uses privacy-safe GET header", async () => {
  const calls = [];
  const service = new SupporterRegistryService(API_CONFIG, {
    navigator: { onLine: true },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return response(200, confirmedResponse);
    }
  });
  await service.getStatus(" Firefighter@Example.COM ");
  assert.equal(calls[0].url, "https://preview.example.test/api/supporters/status");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers["X-Supporter-Email"], "firefighter@example.com");
  assert.equal(calls[0].options.body, undefined);
  assert.doesNotMatch(calls[0].url, /firefighter/i);
});

test("status lookup temporarily falls back to POST for an older Preview backend", async () => {
  const calls = [];
  const service = new SupporterRegistryService(API_CONFIG, {
    navigator: { onLine: true },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1
        ? response(405, { code: "method_not_allowed", error: "Method not allowed." })
        : response(200, confirmedResponse);
    }
  });
  const result = await service.getStatus("firefighter@example.com");
  assert.equal(result.isSupporter, true);
  assert.deepEqual(calls.map(call => call.options.method), ["GET", "POST"]);
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    email: "firefighter@example.com"
  });
});

test("native purchase registration uses the public verification route without secrets", async () => {
  const calls = [];
  const logs = [];
  const service = new SupporterRegistryService(API_CONFIG, {
    platform: "ios",
    navigator: { onLine: true },
    console: {
      info: (label, details) => logs.push({ level: "info", label, details }),
      warn: (label, details) => logs.push({ level: "warn", label, details })
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return response(200, {
        ...confirmedResponse,
        source: "apple"
      });
    }
  });
  const payload = {
    name: "Firefighter Name",
    email: "firefighter@example.com",
    platform: "ios",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time",
    transactionEvidence: {
      transactionId: "2000000123456789"
    }
  };

  const result = await service.registerVerifiedPurchase(payload);
  assert.equal(result.isSupporter, true);
  assert.equal(
    calls[0].url,
    "https://preview.example.test/api/supporters/verify-purchase"
  );
  assert.deepEqual(JSON.parse(calls[0].options.body), payload);
  assert.equal("x-supporter-registration-token" in calls[0].options.headers, false);
  assert.doesNotMatch(calls[0].url, /2000000123456789/);
  assert.deepEqual(logs.map(entry => entry.details), [
    {
      event: "supporter-registration-request-started",
      backendHost: "preview.example.test",
      environment: "preview",
      platform: "ios"
    },
    {
      event: "supporter-registration-response",
      backendHost: "preview.example.test",
      environment: "preview",
      platform: "ios",
      responseStatus: 200
    },
    {
      event: "supporter-registration-request-completed",
      backendHost: "preview.example.test",
      environment: "preview",
      platform: "ios",
      responseStatus: 200,
      outcome: "success"
    }
  ]);
  assert.doesNotMatch(
    JSON.stringify(logs),
    /firefighter@example\.com|2000000123456789/i
  );
});

test("registration network failures log only host and normalized category", async () => {
  const logs = [];
  const service = new SupporterRegistryService(API_CONFIG, {
    platform: "ios",
    navigator: { onLine: true },
    console: {
      info: (label, details) => logs.push({ level: "info", label, details }),
      warn: (label, details) => logs.push({ level: "warn", label, details })
    },
    fetch: async () => {
      throw new TypeError("Load failed for a sensitive request");
    }
  });

  await assert.rejects(
    service.registerVerifiedPurchase({
      email: "private@example.com",
      transactionEvidence: { transactionId: "sensitive-transaction" }
    }),
    error => error.code === "network_error"
  );
  assert.deepEqual(logs.map(entry => entry.details), [
    {
      event: "supporter-registration-request-started",
      backendHost: "preview.example.test",
      environment: "preview",
      platform: "ios"
    },
    {
      event: "supporter-registration-failed",
      backendHost: "preview.example.test",
      environment: "preview",
      platform: "ios",
      failureCategory: "network_exception"
    }
  ]);
  assert.doesNotMatch(
    JSON.stringify(logs),
    /private@example\.com|sensitive-transaction|Load failed/i
  );
});

test("Apple and Google claims use only the contract evidence fields", () => {
  global.REVERSE_FLOW_PRO_PRODUCT_ID = "reverse_flow_pro_lifetime";
  global.APP_VERSION = "1.3.3";

  global.Capacitor = { getPlatform: () => "ios" };
  const apple = createLegacyClaimPayload({
    name: "  Firefighter Name ",
    email: " Firefighter@Example.com "
  }, {
    productId: "reverse_flow_pro_lifetime",
    originalTransactionId: "apple-original",
    transactionId: "apple-current",
    originalPurchaseTimestamp: 1617879600000,
    signedTransaction: "not-sent"
  });
  assert.equal(apple.name, "Firefighter Name");
  assert.equal(apple.email, "firefighter@example.com");
  assert.deepEqual(apple.entitlementEvidence, {
    originalTransactionId: "apple-original"
  });
  assert.equal(apple.originalTransactionId, "apple-original");
  assert.equal(apple.originalPurchaseTimestamp, "2021-04-08T11:00:00.000Z");
  assert.equal("signedTransaction" in apple, false);

  global.Capacitor = { getPlatform: () => "android" };
  const google = createLegacyClaimPayload({
    name: "Firefighter Name",
    email: "firefighter@example.com"
  }, {
    productId: "reverse_flow_pro_lifetime",
    purchaseToken: "google-token",
    transactionId: "GPA.123",
    purchaseTimestamp: "2021-04-08T11:00:00Z"
  });
  assert.deepEqual(google.entitlementEvidence, {
    purchaseToken: "google-token"
  });
  assert.equal(google.purchaseToken, "google-token");
  assert.equal("transactionId" in google, false);
});

test("cordova-plugin-purchase Apple and Google transaction shapes map to claim evidence", () => {
  const apple = extractEvidence("ios", [{
    platform: "ios-appstore",
    products: [{ id: "reverse_flow_pro_lifetime" }],
    originalTransactionId: "apple-original",
    transactionId: "apple-current",
    purchaseDate: new Date("2021-04-08T11:00:00Z"),
    jwsRepresentation: "signed-transaction"
  }]);
  assert.equal(apple.originalTransactionId, "apple-original");
  assert.equal(apple.transactionId, "apple-current");
  assert.equal(apple.originalPurchaseTimestamp, "2021-04-08T11:00:00.000Z");
  assert.equal(apple.signedTransaction, "signed-transaction");

  const google = extractEvidence("android", [{
    platform: "android-playstore",
    products: [{ id: "reverse_flow_pro_lifetime" }],
    transactionId: "GPA.1234",
    purchaseId: "google-purchase-token",
    purchaseDate: new Date("2021-04-08T11:00:00Z"),
    isAcknowledged: true,
    state: "approved",
    nativePurchase: {
      purchaseToken: "google-purchase-token",
      orderId: "GPA.1234",
      packageName: "app.reverseflow.mobile",
      getPurchaseState: 1,
      accountId: "obfuscated-account",
      profileId: "obfuscated-profile"
    }
  }]);
  assert.equal(google.purchaseToken, "google-purchase-token");
  assert.equal(google.orderId, "GPA.1234");
  assert.equal(google.packageName, "app.reverseflow.mobile");
  assert.equal(google.isAcknowledged, true);
  assert.equal(google.originalPurchaseTimestamp, "2021-04-08T11:00:00.000Z");
});

test("offline, malformed JSON, timeout, rate limit, and verification unavailable remain failures", async () => {
  const offline = new SupporterRegistryService(API_CONFIG, {
    navigator: { onLine: false },
    fetch: async () => response(200, confirmedResponse)
  });
  await assert.rejects(
    offline.getStatus("firefighter@example.com"),
    error => error instanceof SupporterRegistryError && error.code === "offline"
  );

  const malformed = new SupporterRegistryService(API_CONFIG, {
    navigator: { onLine: true },
    fetch: async () => response(200, "{bad-json")
  });
  await assert.rejects(
    malformed.getStatus("firefighter@example.com"),
    error => error.code === "malformed_response"
  );

  const rateLimited = new SupporterRegistryService(API_CONFIG, {
    navigator: { onLine: true },
    fetch: async () => response(
      429,
      { error: "Slow down.", code: "supporter_rate_limited" },
      { "Retry-After": "30" }
    )
  });
  await assert.rejects(
    rateLimited.getStatus("firefighter@example.com"),
    error => error.code === "supporter_rate_limited" &&
      error.retryAfterSeconds === 30
  );

  const unavailable = new SupporterRegistryService(API_CONFIG, {
    navigator: { onLine: true },
    fetch: async () => response(503, {
      error: "Verifier unavailable.",
      code: "legacy_verification_unavailable"
    })
  });
  await assert.rejects(
    unavailable.submitLegacyClaim({}),
    error => error.code === "legacy_verification_unavailable" &&
      /every tool is already available/i.test(error.message)
  );

  class AbortControllerStub {
    constructor() {
      this.signal = {
        addEventListener: (event, listener) => {
          if (event === "abort") this.listener = listener;
        }
      };
    }
    abort() {
      this.listener?.();
    }
  }
  const timedOut = new SupporterRegistryService(API_CONFIG, {
    navigator: { onLine: true },
    AbortController: AbortControllerStub,
    fetch: (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    })
  });
  await assert.rejects(
    timedOut.getStatus("firefighter@example.com"),
    error => error.code === "timeout"
  );
});

test("malformed server records cannot become confirmed cache entries", () => {
  assert.throws(
    () => normalizeApiResponse({
      ...confirmedResponse,
      lastVerifiedAt: null
    }),
    error => error.code === "malformed_response"
  );
  assert.throws(
    () => normalizeApiResponse({
      ...confirmedResponse,
      supporterSince: null
    }),
    error => error.code === "malformed_response"
  );
});

test("failed and negative status refreshes retain a confirmed Supporter", async () => {
  global.navigator = { onLine: true };
  const cache = new SupporterCache(memoryStorage(), "supporter-test");
  cache.writeConfirmed(confirmedResponse, {
    email: "firefighter@example.com",
    platform: "ios"
  });
  const failed = await refreshSupporterStatus(cache, {
    getStatus: async () => {
      throw new Error("network failed");
    }
  });
  assert.equal(failed.isSupporter, true);
  assert.equal(failed.syncStatus, "stale");

  const negative = await refreshSupporterStatus(cache, {
    getStatus: async () => normalizeApiResponse({
      isSupporter: false,
      supporterSince: null,
      hasActiveRecurringSupport: false,
      recurringStatus: "inactive",
      source: null,
      lastVerifiedAt: "2026-07-23T18:01:00.000Z"
    })
  });
  assert.equal(negative.isSupporter, true);
  assert.equal(cache.read().isSupporter, true);
});

test("bundled web assets contain no privileged backend credential names", () => {
  const root = path.join(__dirname, "..", "www");
  const files = [];
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(target);
      else files.push(target);
    }
  }
  collect(root);
  const bundledText = files
    .filter(file => /\.(?:html|js|json)$/i.test(file))
    .map(file => fs.readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(
    bundledText,
    /SUPABASE_SERVICE_ROLE_KEY|SUPPORTER_REGISTRATION_TOKEN|SUPPORTER_LEGACY_VERIFIER_TOKEN|STRIPE_SECRET_KEY/
  );
});

test("claim UI has explicit duplicate-submit protection and entitlement refresh", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "www", "js", "services", "supporter.js"),
    "utf8"
  );
  assert.match(source, /form\.dataset\.submitting === "true"/);
  assert.match(source, /refreshLegacyProEntitlementEvidence/);
  assert.match(source, /cache\.writeConfirmed\(confirmed/);
});

test("store diagnostics redact transaction and receipt evidence", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "www", "js", "app.js"),
    "utf8"
  );
  assert.match(
    source,
    /transactionRef:\s*androidAssessment\.isGooglePlay[\s\S]*redactStoreReference\(transaction\?\.transactionId\)/
  );
  assert.doesNotMatch(source, /rawReceipt|rawTransaction/);
  assert.doesNotMatch(source, /latestReceipt:\s*receipt\.latestReceipt/);
});
