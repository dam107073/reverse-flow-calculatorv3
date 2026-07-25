const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  SupporterCache,
  SupporterRegistryService,
  PendingSupportRegistrationStore,
  SupportPurchaseService,
  SupportPurchaseRetryStore,
  createPurchaseRegistrationPayload
} = require("../www/js/services/supporter.js");
const supportPageSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "support.html"),
  "utf8"
);
const supporterServiceSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "js", "services", "supporter.js"),
  "utf8"
);
const analyticsSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "js", "analytics.js"),
  "utf8"
);
const appSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "js", "app.js"),
  "utf8"
);

const constantsSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "js", "constants.js"),
  "utf8"
);
const iosProjectSource = fs.readFileSync(
  path.join(__dirname, "..", "ios", "App", "App.xcodeproj", "project.pbxproj"),
  "utf8"
);
const androidBuildSource = fs.readFileSync(
  path.join(__dirname, "..", "android", "app", "build.gradle"),
  "utf8"
);
const iosAppSchemeSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "ios",
    "App",
    "App.xcodeproj",
    "xcshareddata",
    "xcschemes",
    "App.xcscheme"
  ),
  "utf8"
);
const iosRecoveryPluginSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "ios",
    "App",
    "App",
    "SupportPurchaseRecoveryPlugin.swift"
  ),
  "utf8"
);

const CONFIG = {
  apple: {
    oneTime5: {
      productId: "reverse_flow_support_one_time_5",
      productType: "consumable"
    },
    monthly3: {
      productId: "support_reverse_flow_monthly_3",
      productType: "paid subscription"
    },
    monthly10: {
      productId: "support_reverse_flow_monthly_10",
      productType: "paid subscription"
    }
  },
  google: {
    oneTime5: {
      productId: "reverse_flow_support_one_time_5",
      productType: "consumable",
      purchaseOptionId: "buy"
    },
    monthly3: {
      productId: "support_reverse_flow_subscription",
      productType: "paid subscription",
      basePlanId: "monthly-3"
    },
    monthly10: {
      productId: "support_reverse_flow_subscription",
      productType: "paid subscription",
      basePlanId: "monthly-10"
    }
  }
};

function createStore(platform, behavior = "approved") {
  const callbacks = {};
  const registered = [];
  let restoreCalls = 0;
  let manageCalls = 0;
  let finishCalls = 0;
  const orders = [];
  const storePlatform = platform === "ios" ? "ios-appstore" : "android-playstore";
  const productConfig = platform === "ios" ? CONFIG.apple : CONFIG.google;
  const products = new Map();
  const priceByKey = {
    oneTime5: "$4.99",
    monthly3: "$2.99",
    monthly10: "$9.99"
  };

  Object.entries(productConfig).forEach(([key, configured]) => {
    const offerId = platform === "android"
      ? `${configured.productId}@${configured.basePlanId || configured.purchaseOptionId}`
      : configured.productId;
    const offer = {
      id: offerId,
      pricingPhases: [{
        price: priceByKey[key],
        priceMicros: Number(priceByKey[key].replace(/\D/g, "")) * 10000,
        billingPeriod: key === "oneTime5" ? null : "P1M"
      }],
      async order(additionalData) {
        orders.push({
          productId: configured.productId,
          offerId,
          additionalData
        });
        if (behavior === "cancel") {
          return { isError: true, code: 6777006, productId: configured.productId };
        }
        const transaction = {
          platform: storePlatform,
          state: behavior === "pending" ? "pending" : "approved",
          isPending: behavior === "pending",
          products: [{ id: configured.productId, offerId }],
          transactionId: platform === "ios" ? "2000000123456789" : "GPA.123",
          originalTransactionId: platform === "ios" ? "1000000123456789" : null,
          purchaseId: platform === "android" ? "google-token" : null,
          purchaseDate: new Date("2026-07-24T12:00:00Z"),
          jwsRepresentation: platform === "ios" ? "header.payload.signature" : null,
          nativePurchase: platform === "android"
            ? { purchaseToken: "google-token" }
            : {},
          async finish() {
            finishCalls += 1;
          }
        };
        queueMicrotask(() => {
          callbacks[behavior === "pending" ? "pending" : "approved"]?.(transaction);
        });
        return undefined;
      }
    };
    const existing = products.get(configured.productId);
    if (existing) {
      existing.offers.push(offer);
      return;
    }
    const product = {
      id: configured.productId,
      owned: false,
      offers: [offer],
      getOffer(id) {
        if (!id) return this.offers[0];
        return this.offers.find(candidate => candidate.id === id);
      }
    };
    products.set(configured.productId, product);
  });

  const when = {
    productUpdated(callback) {
      callbacks.productUpdated = callback;
      return this;
    },
    approved(callback) {
      callbacks.approved = callback;
      return this;
    },
    pending(callback) {
      callbacks.pending = callback;
      return this;
    },
    receiptUpdated(callback) {
      callbacks.receiptUpdated = callback;
      return this;
    }
  };
  const store = {
    localTransactions: [],
    localReceipts: [],
    when: () => when,
    error(callback) {
      callbacks.error = callback;
    },
    register(items) {
      registered.push(...items);
    },
    async initialize() {
      return [];
    },
    get(productId) {
      return products.get(productId);
    },
    async restorePurchases() {
      restoreCalls += 1;
    },
    async manageSubscriptions() {
      manageCalls += 1;
      return undefined;
    }
  };

  return {
    store,
    callbacks,
    products,
    registered,
    orders,
    counts: () => ({ restoreCalls, manageCalls, finishCalls })
  };
}

function installPurchaseGlobals(platform, store) {
  global.Capacitor = { getPlatform: () => platform };
  global.CdvPurchase = {
    store,
    Platform: {
      APPLE_APPSTORE: "ios-appstore",
      GOOGLE_PLAY: "android-playstore"
    },
    ProductType: {
      CONSUMABLE: "consumable",
      NON_CONSUMABLE: "non consumable",
      PAID_SUBSCRIPTION: "paid subscription"
    },
    ErrorCode: {
      PAYMENT_CANCELLED: 6777006
    },
    GooglePlay: {
      ReplacementMode: {
        CHARGE_PRORATED_PRICE: "IMMEDIATE_AND_CHARGE_PRORATED_PRICE",
        DEFERRED: "DEFERRED"
      }
    }
  };
  global.APP_VERSION = "1.3.3";
  const localValues = new Map();
  Object.defineProperty(global, "localStorage", {
    configurable: true,
    value: {
      getItem: key => localValues.get(key) || null,
      setItem: (key, value) => localValues.set(key, value),
      removeItem: key => localValues.delete(key)
    }
  });
}

test("canonical Apple and Google product identifiers and plan IDs are configured", () => {
  assert.match(constantsSource, /reverse_flow_support_one_time_5/);
  assert.match(constantsSource, /support_reverse_flow_monthly_3/);
  assert.match(constantsSource, /support_reverse_flow_monthly_10/);
  assert.equal(
    (constantsSource.match(/productId:\s*"support_reverse_flow_subscription"/g) || [])
      .length,
    2
  );
  assert.match(constantsSource, /purchaseOptionId:\s*"buy"/);
  assert.match(constantsSource, /basePlanId:\s*"monthly-3"/);
  assert.match(constantsSource, /basePlanId:\s*"monthly-10"/);
  assert.equal(
    (constantsSource.match(/subscriptionGroupId:\s*"22260570"/g) || []).length,
    2
  );
  assert.match(constantsSource, /subscriptionLevel:\s*1/);
  assert.match(constantsSource, /subscriptionLevel:\s*2/);
  assert.equal(
    (constantsSource.match(/productType:\s*"consumable"/g) || []).length,
    2
  );
  assert.doesNotMatch(constantsSource, /Coming Soon/i);
});

test("mobile supporter APIs contain only the canonical Production host", () => {
  assert.match(
    constantsSource,
    /const SUPPORTER_API_ENVIRONMENT = "production"/
  );
  assert.match(
    constantsSource,
    /production:\s*"https:\/\/reverse-flow\.app"/
  );
  assert.doesNotMatch(constantsSource, /vercel\.app|localhost|127\.0\.0\.1/);
});

test("native Version 2.0 Release values are intentional", () => {
  assert.equal(
    (iosProjectSource.match(/CURRENT_PROJECT_VERSION = 7;/g) || []).length,
    6
  );
  assert.equal(
    (iosProjectSource.match(/MARKETING_VERSION = 2\.0;/g) || []).length,
    6
  );
  assert.match(constantsSource, /const APP_VERSION = "2\.0"/);
  assert.match(androidBuildSource, /versionCode 145/);
  assert.match(androidBuildSource, /versionName "2\.0"/);
});

test("every iOS build configuration packages Production", () => {
  assert.equal(
    (iosProjectSource.match(/SUPPORTER_API_ENVIRONMENT = preview;/g) || []).length,
    0
  );
  assert.equal(
    (iosProjectSource.match(/SUPPORTER_API_ENVIRONMENT = production;/g) || []).length,
    3
  );
  assert.match(iosProjectSource, /Configure Supporter Backend/);
  assert.equal(
    (iosProjectSource.match(/name = Production;/g) || []).length,
    3
  );
  assert.match(
    iosAppSchemeSource,
    /<ArchiveAction\s+buildConfiguration = "Production"/
  );
});

test("every Android device build packages Production", () => {
  assert.match(
    androidBuildSource,
    /registerSupporterBackendAssets\("debug", "production"\)/
  );
  assert.doesNotMatch(androidBuildSource, /registerSupporterBackendAssets\([^)]*"preview"\)/);
  assert.doesNotMatch(androidBuildSource, /preview\s*\{\s*initWith release/);
  assert.match(
    androidBuildSource,
    /registerSupporterBackendAssets\("release", "production"\)/
  );
  assert.match(
    androidBuildSource,
    /registerSupporterBackendAssets\("productionTest", "production"\)/
  );
  assert.match(androidBuildSource, /inputs\.file\(sourceConstants\)/);
  assert.match(
    androidBuildSource,
    /const SUPPORTER_API_ENVIRONMENT = \\"\$\{environment\}\\";/
  );
});

test("environment diagnostic reports only privacy-safe Production identity", async () => {
  const calls = [];
  global.APP_VERSION = "2.0";
  global.APP_BUILD_NUMBERS = { ios: "7", android: "145" };
  const service = new SupporterRegistryService({
    environment: "production",
    baseUrls: { production: "https://reverse-flow.app" },
    routes: {
      environment: "/api/supporters/environment",
      claimSupporter: "/api/supporters/claim-supporter",
      status: "/api/supporters/status"
    },
    timeoutsMs: {
      environment: 10000,
      claimSupporter: 15000,
      status: 10000
    }
  }, {
    platform: "android",
    console: { info: message => calls.push(message), warn: message => calls.push(message) },
    fetch: async url => ({
      ok: true,
      status: 200,
      async json() {
        return {
          environment: "production",
          deploymentId: "deployment-host.example",
          deployedCommit: "abc123",
          database: {
            project: "vbjhbqpvnfjfilntzdgk",
            migrationLevel: "202607240006"
          }
        };
      }
    })
  });

  const diagnostic = await service.runEnvironmentDiagnostic();
  assert.equal(diagnostic.resolvedApiOrigin, "https://reverse-flow.app");
  assert.equal(diagnostic.environmentCategory, "production");
  assert.equal(diagnostic.databaseEnvironmentIdentifier, "vbjhbqpvnfjfilntzdgk");
  assert.equal(diagnostic.buildNumber, "145");
  assert.equal(calls.length, 1);
  assert.doesNotMatch(calls[0], /token|receipt|signature|email|orderId/i);
});

test("Apple products load localized pricing and exact product types", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });

  assert.equal(service.getOptions("apple")[0].state, "loading");
  await service.initialize();
  const options = service.getOptions("apple");

  assert.deepEqual(options.map(option => option.label), [
    "One-Time Support — $4.99",
    "Monthly Support — $2.99/month",
    "Monthly Support — $9.99/month"
  ]);
  assert.ok(options.every(option => option.state === "ready"));
  assert.deepEqual(
    fixture.registered.map(item => [item.id, item.type]),
    [
      ["reverse_flow_support_one_time_5", "consumable"],
      ["support_reverse_flow_monthly_3", "paid subscription"],
      ["support_reverse_flow_monthly_10", "paid subscription"]
    ]
  );
});

test("Google selects the canonical purchase option and base-plan offers", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();

  assert.deepEqual(
    service.getOptions("google").map(option => option.offer.id),
    [
      "reverse_flow_support_one_time_5@buy",
      "support_reverse_flow_subscription@monthly-3",
      "support_reverse_flow_subscription@monthly-10"
    ]
  );
  assert.deepEqual(
    fixture.registered.map(item => item.id),
    [
      "reverse_flow_support_one_time_5",
      "support_reverse_flow_subscription"
    ]
  );
  assert.equal(
    fixture.registered.some(item =>
      [
        "support_reverse_flow_monthly_3",
        "support_reverse_flow_monthly_10"
      ].includes(item.id)
    ),
    false
  );
});

test("Google one-time support accepts the raw Play purchase-option ID", async () => {
  const fixture = createStore("android");
  const oneTime = fixture.products.get("reverse_flow_support_one_time_5");
  oneTime.offers[0].id = "buy";
  fixture.store.localTransactions.push({
    platform: "android-playstore",
    state: "approved",
    products: [{
      id: "support_reverse_flow_subscription",
      offerId: "support_reverse_flow_subscription@monthly-3"
    }],
    purchaseId: "active-subscription-token",
    nativePurchase: {
      purchaseToken: "active-subscription-token",
      acknowledged: false
    }
  });
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();

  const option = service.getOptions("google")[0];
  assert.equal(option.state, "ready");
  assert.equal(option.localizedPrice, "$4.99");
  assert.equal(option.offer.id, "buy");
});

test("verified pending Google subscription acknowledges exactly once", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  const evidence = {
    paymentSource: "android",
    productIdentifier: "support_reverse_flow_subscription",
    purchaseType: "monthly",
    basePlanId: "monthly-3",
    purchaseToken: "google-subscription-token",
    purchaseTimestamp: "2026-07-24T12:00:00Z",
    acknowledged: false,
    transaction: {
      async finish() {
        fixture.callbacks.finishCount =
          Number(fixture.callbacks.finishCount || 0) + 1;
      }
    }
  };
  service.persistPendingEvidence(evidence);

  assert.equal(await service.acknowledgeVerifiedPendingSubscription(evidence, {
    storeApproved: true,
    pendingPersisted: true
  }), true);
  assert.equal(fixture.callbacks.finishCount, 1);
  assert.equal(
    service.readPendingSubscriptionRegistration()
      .lastRegistrationAttemptStatus,
    "store-approved"
  );
  assert.equal(await service.acknowledgeVerifiedPendingSubscription(evidence, {
    storeApproved: true,
    pendingPersisted: true
  }), false);
  assert.equal(fixture.callbacks.finishCount, 1);

  await service.finishPurchase(evidence, {
    storeApproved: true,
    billingStatePersisted: true
  });
  assert.equal(service.readPendingSubscriptionRegistration(), null);
  assert.equal(fixture.callbacks.finishCount, 1);
});

test("verified Google one-time support is acknowledged once and consumed only during store completion", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  let acknowledgmentCalls = 0;
  const service = new SupportPurchaseService(CONFIG, {
    store: fixture.store,
    googlePurchaseAcknowledger: async () => {
      acknowledgmentCalls += 1;
    }
  });
  const diagnosticLines = [];
  const originalInfo = console.info;
  console.info = line => diagnosticLines.push(String(line));
  const evidence = {
    paymentSource: "android",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time",
    purchaseToken: "private-google-one-time-token",
    purchaseTimestamp: "2026-07-24T12:00:00Z",
    acknowledged: false,
    transaction: {
      async finish() {
        fixture.callbacks.finishCount =
          Number(fixture.callbacks.finishCount || 0) + 1;
      }
    }
  };

  try {
    service.persistPendingEvidence(evidence);
    assert.equal(await service.acknowledgeVerifiedGooglePurchase(evidence, {
      storeApproved: true,
      pendingPersisted: true
    }), true);
    assert.equal(evidence.acknowledged, true);
    assert.equal(acknowledgmentCalls, 1);
    assert.equal(fixture.callbacks.finishCount || 0, 0);
    assert.notEqual(service.readPendingOneTimeRegistration(), null);

    // A registration delay or retry cannot trigger another Play completion.
    assert.equal(await service.acknowledgeVerifiedGooglePurchase(evidence, {
      storeApproved: true,
      pendingPersisted: true
    }), false);
    assert.equal(acknowledgmentCalls, 1);
    assert.equal(fixture.callbacks.finishCount || 0, 0);

    await service.finishPurchase(evidence, {
      storeApproved: true,
      billingStatePersisted: true
    });
    assert.equal(fixture.callbacks.finishCount, 1);
    assert.equal(acknowledgmentCalls, 1);
    assert.equal(service.readPendingOneTimeRegistration(), null);
  } finally {
    console.info = originalInfo;
  }

  assert.ok(diagnosticLines.some(line =>
    line.includes('"event":"google-purchase-acknowledgment-attempted"')
  ));
  assert.ok(diagnosticLines.some(line =>
    line.includes('"event":"google-purchase-acknowledgment-succeeded"')
  ));
  assert.ok(diagnosticLines.some(line =>
    line.includes('"event":"google-purchase-acknowledgment-deduplicated"')
  ));
  assert.ok(diagnosticLines.some(line =>
    line.includes('"event":"google-consumable-consumption-succeeded"')
  ));
  assert.ok(diagnosticLines.every(line =>
    !line.includes("private-google-one-time-token")
  ));
});

test("Google one-time acknowledgment uses the native acknowledge action without consuming", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const nativeCalls = [];
  global.cordova = {
    exec(success, failure, service, action, args) {
      nativeCalls.push({ service, action, args });
      success();
    }
  };
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  const evidence = {
    paymentSource: "android",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time",
    purchaseToken: "private-native-token",
    acknowledged: false,
    transaction: {
      async finish() {
        fixture.callbacks.finishCount =
          Number(fixture.callbacks.finishCount || 0) + 1;
      }
    }
  };
  service.persistPendingEvidence(evidence);

  assert.equal(await service.acknowledgeVerifiedGooglePurchase(evidence, {
    storeApproved: true,
    pendingPersisted: true
  }), true);
  assert.deepEqual(nativeCalls, [{
    service: "InAppBillingPlugin",
    action: "acknowledgePurchase",
    args: ["private-native-token"]
  }]);
  assert.equal(fixture.callbacks.finishCount || 0, 0);
  delete global.cordova;
});

test("Google purchase stays unacknowledged only until store approval", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  const evidence = {
    paymentSource: "android",
    productIdentifier: "support_reverse_flow_subscription",
    purchaseType: "monthly",
    basePlanId: "monthly-3",
    purchaseToken: "google-outage-token",
    purchaseTimestamp: "2026-07-24T12:00:00Z",
    transaction: {
      async finish() {
        fixture.callbacks.finishCount =
          Number(fixture.callbacks.finishCount || 0) + 1;
      }
    }
  };
  service.persistPendingEvidence(evidence);

  await assert.rejects(
    service.acknowledgeVerifiedGooglePurchase(evidence, {
      storeApproved: false,
      pendingPersisted: true
    }),
    error =>
      error.code === "google_acknowledgment_preconditions_not_met"
  );
  assert.equal(fixture.callbacks.finishCount || 0, 0);
  assert.notEqual(service.readPendingSubscriptionRegistration(), null);
});

test("temporary Google subscription acknowledgment failure remains retryable", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  let attempts = 0;
  const evidence = {
    paymentSource: "android",
    productIdentifier: "support_reverse_flow_subscription",
    purchaseType: "monthly",
    basePlanId: "monthly-10",
    purchaseToken: "retryable-subscription-token",
    purchaseTimestamp: "2026-07-24T12:00:00Z",
    acknowledged: false,
    transaction: {
      async finish() {
        attempts += 1;
        if (attempts === 1) {
          throw Object.assign(new Error("temporary"), {
            code: "temporary_store_failure"
          });
        }
      }
    }
  };
  service.persistPendingEvidence(evidence);
  await assert.rejects(
    service.acknowledgeVerifiedGooglePurchase(evidence, {
      storeApproved: true,
      pendingPersisted: true
    }),
    error => error.code === "temporary_store_failure"
  );
  assert.notEqual(service.readPendingSubscriptionRegistration(), null);
  assert.equal(evidence.acknowledged, false);
  assert.equal(await service.acknowledgeVerifiedGooglePurchase(evidence, {
    storeApproved: true,
    pendingPersisted: true
  }), true);
  assert.equal(attempts, 2);
  await service.finishPurchase(evidence, {
    storeApproved: true,
    billingStatePersisted: true
  });
  assert.equal(service.readPendingSubscriptionRegistration(), null);
});

test("relaunch rediscovers and acknowledges an unfinished Google subscription once", async () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  let finishCalls = 0;
  const transaction = {
    platform: "android-playstore",
    state: "approved",
    products: [{
      id: "support_reverse_flow_subscription",
      offerId: "support_reverse_flow_subscription@monthly-3"
    }],
    purchaseId: "restart-subscription-token",
    purchaseDate: new Date("2026-07-24T12:00:00Z"),
    nativePurchase: {
      purchaseToken: "restart-subscription-token",
      acknowledged: false
    },
    async finish() {
      finishCalls += 1;
    }
  };
  const beforeRestart = new SupportPurchaseService(CONFIG, {
    store: fixture.store,
    storage
  });
  beforeRestart.persistPendingEvidence(
    beforeRestart.transactionEvidence(transaction)
  );
  fixture.store.localTransactions.push(transaction);

  const afterRestart = new SupportPurchaseService(CONFIG, {
    store: fixture.store,
    storage
  });
  const recoveredPromise = new Promise(resolve => {
    afterRestart.onRecovery(resolve);
  });
  await afterRestart.initialize();
  const recovered = await recoveredPromise;
  await afterRestart.completeApprovedPurchase(recovered);

  assert.equal(recovered.basePlanId, "monthly-3");
  assert.equal(finishCalls, 1);
  assert.equal(afterRestart.readPendingSubscriptionRegistration(), null);
  assert.equal(
    afterRestart.deriveBillingState("android"),
    require("../www/js/services/supporter.js").BILLING_STATES.ACTIVE_MONTHLY_3
  );
});

test("Google subscription acknowledgment does not depend on local retry storage", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  let finishCalls = 0;
  const service = new SupportPurchaseService(CONFIG, {
    store: fixture.store,
    subscriptionPendingStore: new PendingSupportRegistrationStore({
      getItem() {
        throw new Error("storage unavailable");
      },
      setItem() {
        throw new Error("storage unavailable");
      },
      removeItem() {
        throw new Error("storage unavailable");
      }
    }, "unavailable-subscription-storage")
  });
  const evidence = {
    paymentSource: "android",
    productIdentifier: "support_reverse_flow_subscription",
    purchaseType: "monthly",
    basePlanId: "monthly-3",
    purchaseToken: "storage-independent-token",
    purchaseTimestamp: "2026-07-24T12:00:00Z",
    acknowledged: false,
    transaction: {
      async finish() {
        finishCalls += 1;
      }
    }
  };

  assert.equal(await service.acknowledgeVerifiedGooglePurchase(evidence, {
    storeApproved: true
  }), true);
  assert.equal(finishCalls, 1);
  assert.equal(evidence.acknowledged, true);
});

test("Google reconciliation acknowledges every returned subscription token exactly once", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const finishCalls = new Map();
  const makeTransaction = (token, offerId) => ({
    platform: "android-playstore",
    state: "approved",
    products: [{
      id: "support_reverse_flow_subscription",
      offerId
    }],
    purchaseId: token,
    purchaseDate: new Date("2026-07-24T12:00:00Z"),
    nativePurchase: {
      purchaseToken: token,
      acknowledged: false
    },
    async finish() {
      finishCalls.set(token, (finishCalls.get(token) || 0) + 1);
    }
  });
  fixture.store.localTransactions.push(
    makeTransaction(
      "source-plan-token",
      "support_reverse_flow_subscription@monthly-3"
    ),
    makeTransaction(
      "replacement-plan-token",
      "support_reverse_flow_subscription@monthly-10"
    )
  );
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });

  await service.initialize();
  await service.reconcileGooglePlaySubscriptions();
  await service.reconcileGooglePlaySubscriptions();

  assert.deepEqual(
    [...finishCalls.entries()].sort(),
    [
      ["replacement-plan-token", 1],
      ["source-plan-token", 1]
    ]
  );
  assert.equal(service.hasUnacknowledgedGoogleSubscriptions(), false);
});

test("Google reconciliation never acknowledges a pending subscription", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  let finishCalls = 0;
  fixture.store.localTransactions.push({
    platform: "android-playstore",
    state: "pending",
    isPending: true,
    products: [{
      id: "support_reverse_flow_subscription",
      offerId: "support_reverse_flow_subscription@monthly-3"
    }],
    purchaseId: "pending-subscription-token",
    nativePurchase: {
      purchaseToken: "pending-subscription-token",
      purchaseState: 2,
      acknowledged: false
    },
    async finish() {
      finishCalls += 1;
    }
  });
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });

  await service.initialize();
  const result = await service.reconcileGooglePlaySubscriptions();

  assert.deepEqual(result, {
    discovered: 0,
    acknowledged: 0,
    unresolved: 0
  });
  assert.equal(finishCalls, 0);
});

test("Google reconciliation acknowledges legacy monthly product IDs without offering them", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const acknowledged = [];
  for (const [productId, token] of [
    ["support_reverse_flow_monthly_3", "legacy-monthly-3-token"],
    ["support_reverse_flow_monthly_10", "legacy-monthly-10-token"]
  ]) {
    fixture.store.localTransactions.push({
      platform: "android-playstore",
      state: "approved",
      products: [{ id: productId }],
      purchaseId: token,
      purchaseDate: new Date("2026-07-24T12:00:00Z"),
      nativePurchase: {
        purchaseToken: token,
        acknowledged: false
      },
      async finish() {
        acknowledged.push(productId);
      }
    });
  }
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });

  await service.initialize();
  await service.reconcileGooglePlaySubscriptions();

  assert.deepEqual(acknowledged.sort(), [
    "support_reverse_flow_monthly_10",
    "support_reverse_flow_monthly_3"
  ]);
  assert.equal(
    fixture.registered.some(item =>
      item.id === "support_reverse_flow_monthly_3" ||
      item.id === "support_reverse_flow_monthly_10"
    ),
    false
  );
});

test("duplicate Google subscription callbacks share one acknowledgment request", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  let finishCalls = 0;
  let releaseFinish;
  const finishGate = new Promise(resolve => {
    releaseFinish = resolve;
  });
  const evidence = {
    paymentSource: "android",
    productIdentifier: "support_reverse_flow_subscription",
    purchaseType: "monthly",
    basePlanId: "monthly-3",
    purchaseToken: "duplicate-callback-token",
    purchaseTimestamp: "2026-07-24T12:00:00Z",
    acknowledged: false,
    transaction: {
      async finish() {
        finishCalls += 1;
        await finishGate;
      }
    }
  };
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });

  const first = service.acknowledgeVerifiedGooglePurchase(evidence, {
    storeApproved: true
  });
  const duplicate = service.acknowledgeVerifiedGooglePurchase(evidence, {
    storeApproved: true
  });
  releaseFinish();

  assert.equal(await first, true);
  assert.equal(await duplicate, true);
  assert.equal(finishCalls, 1);
});

test("plan change remains blocked while a source Google subscription cannot be acknowledged", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  let acknowledgmentAttempts = 0;
  fixture.store.localTransactions.push({
    platform: "android-playstore",
    state: "approved",
    products: [{
      id: "support_reverse_flow_subscription",
      offerId: "support_reverse_flow_subscription@monthly-3"
    }],
    purchaseId: "unresolved-source-token",
    purchaseDate: new Date("2026-07-24T12:00:00Z"),
    nativePurchase: {
      purchaseToken: "unresolved-source-token",
      acknowledged: false
    },
    async finish() {
      acknowledgmentAttempts += 1;
      throw Object.assign(new Error("temporary Play failure"), {
        code: "temporary_store_failure"
      });
    }
  });
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const target = service.getOptions("google")
    .find(option => option.basePlanId === "monthly-10");

  await assert.rejects(
    service.purchase(target, {
      currentRecurringProductId: "support_reverse_flow_subscription",
      currentBasePlanId: "monthly-3",
      currentMonthlyAmount: 3
    }),
    error => error.code === "google_subscription_finalizing"
  );
  assert.ok(acknowledgmentAttempts >= 1);
  assert.equal(fixture.orders.length, 0);
});

test("approved Apple purchase completes after durable local store state", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const pending = await service.purchase(service.getOptions("apple")[0]);

  assert.equal(pending.productIdentifier, "reverse_flow_support_one_time_5");
  assert.equal(pending.transactionId, "2000000123456789");
  assert.equal(pending.originalTransactionId, "1000000123456789");
  assert.equal(fixture.counts().finishCalls, 0);
  const pendingRecord = service.readPendingRegistration();
  assert.deepEqual(
    Object.keys(pendingRecord).sort(),
    [
      "approvedAt",
      "basePlanId",
      "environmentCategory",
      "lastRegistrationAttemptAt",
      "lastRegistrationAttemptStatus",
      "productId",
      "provider",
      "state",
      "transactionReference",
      "version"
    ].sort()
  );
  assert.equal(pendingRecord.provider, "apple");
  assert.equal(pendingRecord.state, "store-completion-required");
  assert.equal(JSON.stringify(pendingRecord).includes("2000000123456789"), false);
  assert.equal(JSON.stringify(pendingRecord).includes("header.payload.signature"), false);

  await assert.rejects(
    service.finishPurchase(pending),
    error => error.code === "purchase_finish_preconditions_not_met"
  );
  assert.notEqual(service.readPendingRegistration(), null);
  await service.finishPurchase(pending, {
    storeApproved: true,
    billingStatePersisted: true
  });
  assert.equal(fixture.counts().finishCalls, 1);
  assert.equal(service.readPendingRegistration(), null);
});

test("pending registration survives restart and never grants Supporter identity", async () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  const first = new PendingSupportRegistrationStore(storage);
  first.write({
    paymentSource: "android",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseToken: "sensitive-google-token",
    purchaseTimestamp: "2026-07-24T12:00:00Z"
  });
  first.markAttempt("registration-failed");

  const afterRestart = new PendingSupportRegistrationStore(storage).read();
  assert.equal(afterRestart.provider, "google");
  assert.equal(afterRestart.productId, "reverse_flow_support_one_time_5");
  assert.equal(afterRestart.lastRegistrationAttemptStatus, "registration-failed");
  assert.equal(JSON.stringify(afterRestart).includes("sensitive-google-token"), false);
  assert.equal(new SupporterCache(storage).read().isSupporter, false);
});

test("failed store finish retains the pending marker for retry", async () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  installPurchaseGlobals("android", {});
  const service = new SupportPurchaseService(CONFIG, {
    store: {},
    pendingStore: new PendingSupportRegistrationStore(storage),
    googlePurchaseAcknowledger: async () => {}
  });
  const evidence = {
    paymentSource: "android",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time",
    purchaseToken: "google-token-for-finish-test",
    purchaseTimestamp: "2026-07-24T12:00:00Z",
    transaction: {
      async finish() {
        throw new Error("fixture finish failure");
      }
    }
  };
  service.retryStore.write(evidence);
  await assert.rejects(
    service.finishPurchase(evidence, {
      storeApproved: true,
      billingStatePersisted: true
    }),
    /fixture finish failure/
  );
  assert.equal(
    service.readPendingRegistration()?.state,
    "store-completion-required"
  );
});

test("V2 presentation keeps store billing and Supporter claims independent", () => {
  assert.match(supportPageSource, /Claim Supporter Status/);
  assert.match(
    supportPageSource,
    /profile is managed separately from your App Store or Google Play billing/
  );
  assert.doesNotMatch(
    supportPageSource,
    /publicRecognition|List my chosen name|type="checkbox"/
  );
  assert.match(
    supporterServiceSource,
    /claimSupporter\(\{\s*name,\s*email,\s*public: true\s*\}\)/
  );
  assert.match(supportPageSource, /Already a Supporter\?/);
  assert.match(supportPageSource, /Recover Your Supporter Status/);
  assert.match(supportPageSource, /Recover My Supporter Status/);
  assert.match(supportPageSource, /Purchased the original Reverse Flow PRO\?/);
  assert.match(supportPageSource, /Check Previous PRO Purchase/);
  assert.match(
    supportPageSource,
    /Having trouble with your subscription\? Refresh status/
  );
  assert.doesNotMatch(supportPageSource, /Restore Support Purchases/);
  assert.doesNotMatch(supportPageSource, />Refresh Subscription Status</);
  assert.match(
    supporterServiceSource,
    /function resolveSupporterV2State/
  );
  assert.match(
    supporterServiceSource,
    /document\.addEventListener\("resume", requestStatusRefresh\)/
  );
  assert.match(
    supporterServiceSource,
    /global\.addEventListener\?\.\("online", requestStatusRefresh\)/
  );
  assert.doesNotMatch(
    supporterServiceSource,
    /confirmed\.welcomeEmailConfirmed !== true/
  );
  assert.match(supporterServiceSource, /registryService\.claimSupporter/);
  assert.match(
    supporterServiceSource,
    /support-environment-migration-completed/
  );
  assert.match(
    supporterServiceSource,
    /previousEnvironment === "preview"[\s\S]{0,220}item\.store\.markEnvironment\(this\.apiEnvironment\)/
  );
  const v2Renderer = supporterServiceSource.slice(
    supporterServiceSource.indexOf("function renderSupportPageV2"),
    supporterServiceSource.indexOf("function initialize()")
  );
  assert.doesNotMatch(
    v2Renderer,
    /verifyPendingPurchase|registerVerifiedPurchase/
  );
  assert.match(analyticsSource, /Capacitor\?\.isNativePlatform/);
  assert.match(analyticsSource, /if \(!isNativeApp\)/);
});

test("Google acknowledgment is gated only by Google Play approval", () => {
  assert.match(
    supporterServiceSource,
    /async acknowledgeVerifiedGooglePurchase/
  );
  assert.match(
    supporterServiceSource,
    /if \(completion\.storeApproved !== true\)/
  );
  assert.doesNotMatch(
    supporterServiceSource,
    /completion\.pendingPersisted !== true|durable_pending_state_unavailable/
  );
  assert.doesNotMatch(
    supporterServiceSource,
    /acknowledgeVerifiedGooglePurchase[\s\S]{0,300}purchaseType !== "monthly"/
  );
  for (const event of [
    "purchase-discovered",
    "support-pending-state-written",
    "google-purchase-acknowledgment-attempted",
    "google-purchase-acknowledgment-succeeded",
    "google-purchase-acknowledgment-deferred",
    "google-consumable-consumption-attempted",
    "google-consumable-consumption-succeeded",
    "google-consumable-consumption-deferred",
    "store-purchase-completed"
  ]) {
    assert.match(supporterServiceSource, new RegExp(`"${event}"`));
  }
  assert.match(
    supporterServiceSource,
    /document\.addEventListener\("resume", requestStatusRefresh\)/
  );
  assert.match(
    supporterServiceSource,
    /const requestStatusRefresh = \(\) => \{[\s\S]{0,160}recoverPendingRegistration/
  );
});

test("welcome delivery never gates store completion after confirmed cache persistence", () => {
  assert.doesNotMatch(
    supporterServiceSource,
    /welcomeEmailConfirmed[\s\S]{0,500}finishPurchase/
  );
  assert.match(
    supporterServiceSource,
    /const cachedConfirmation = cache\.writeConfirmed[\s\S]*cache\.read\(\)\.isSupporter[\s\S]*finishPurchase/
  );
  assert.match(
    supporterServiceSource,
    /purchaseService\.markPendingAttempt\([\s\S]{0,100}"confirmed-awaiting-finish"/
  );
  assert.match(
    supporterServiceSource,
    /global\.reverseFlowPendingVerifiedSupportPurchase = null/
  );
});

test("cancel and pending outcomes never produce registration evidence", async () => {
  for (const [behavior, expectedCode] of [
    ["cancel", "purchase_cancelled"],
    ["pending", "purchase_pending"]
  ]) {
    const fixture = createStore("ios", behavior);
    installPurchaseGlobals("ios", fixture.store);
    const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
    await service.initialize();
    await assert.rejects(
      service.purchase(service.getOptions("apple")[0]),
      error => error.code === expectedCode
    );
    assert.equal(fixture.counts().finishCalls, 0);
  }
});

test("Google cancellation without a product ID immediately clears purchase state", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const option = service.getOptions("google")
    .find(item => item.key === "monthly3");
  option.offer.order = async () => {
    queueMicrotask(() => fixture.callbacks.error?.({ code: 6777006 }));
    return undefined;
  };

  await assert.rejects(
    service.purchase(option),
    error => error.code === "purchase_cancelled"
  );
  assert.equal(service.purchaseInFlight, null);
  assert.equal(service.supportUiState, "not-supporter");
});

test("Google receipt refresh resumes a durable pending registration", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  const transaction = {
    platform: "android-playstore",
    state: "approved",
    products: [{
      id: "support_reverse_flow_subscription",
      offerId: "support_reverse_flow_subscription@monthly-3"
    }],
    purchaseId: "google-recovery-token",
    nativePurchase: {
      purchaseToken: "google-recovery-token",
      acknowledged: false
    },
    purchaseDate: new Date("2026-07-24T12:00:00Z"),
    async finish() {}
  };
  service.subscriptionRetryStore.write(
    service.transactionEvidence(transaction)
  );
  await service.initialize();

  const recovered = [];
  service.onRecovery(evidence => recovered.push(evidence));
  fixture.store.localTransactions.push(transaction);
  fixture.callbacks.receiptUpdated?.({});
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(recovered.length, 1);
  assert.equal(
    recovered[0].productIdentifier,
    "support_reverse_flow_subscription"
  );
  assert.equal(recovered[0].recoverySource, "store-approved-redelivery");
});

test("unacknowledged Google redelivery recreates a missing pending marker after storage recovers", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const transaction = {
    platform: "android-playstore",
    state: "approved",
    products: [{
      id: "reverse_flow_support_one_time_5",
      offerId: "reverse_flow_support_one_time_5@buy"
    }],
    purchaseId: "private-redelivery-token",
    nativePurchase: {
      purchaseToken: "private-redelivery-token",
      acknowledged: false
    },
    async finish() {}
  };
  const recovered = [];
  service.onRecovery(evidence => recovered.push(evidence));
  const workingStorage = service.oneTimeRetryStore.storage;
  service.oneTimeRetryStore.storage = {
    getItem: () => null,
    setItem() {
      throw new Error("storage temporarily unavailable");
    },
    removeItem() {}
  };

  fixture.callbacks.approved(transaction);
  assert.equal(recovered.length, 0);
  assert.equal(
    service.receivedTransactionKeys.has(
      service.transactionKey(service.transactionEvidence(transaction))
    ),
    false
  );

  service.oneTimeRetryStore.storage = workingStorage;
  fixture.callbacks.approved(transaction);
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].recoverySource, "store-approved-redelivery");
  assert.equal(
    service.readPendingOneTimeRegistration()?.productId,
    "reverse_flow_support_one_time_5"
  );
});

test("Google approved purchase survives restart, retries, acknowledges once, and clears after registration", async () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const transaction = {
    platform: "android-playstore",
    state: "approved",
    products: [{
      id: "reverse_flow_support_one_time_5",
      offerId: "reverse_flow_support_one_time_5@buy"
    }],
    purchaseId: "private-restart-token",
    nativePurchase: {
      purchaseToken: "private-restart-token",
      acknowledged: false
    },
    purchaseDate: new Date("2026-07-24T12:00:00Z"),
    async finish() {
      fixture.callbacks.finishCount =
        Number(fixture.callbacks.finishCount || 0) + 1;
    }
  };
  const beforeRestart = new SupportPurchaseService(CONFIG, {
    store: fixture.store,
    storage
  });
  beforeRestart.persistPendingEvidence(
    beforeRestart.transactionEvidence(transaction)
  );

  fixture.store.localTransactions.push(transaction);
  let acknowledgmentCalls = 0;
  const afterRestart = new SupportPurchaseService(CONFIG, {
    store: fixture.store,
    storage,
    googlePurchaseAcknowledger: async () => {
      acknowledgmentCalls += 1;
    }
  });
  const recoveredPromise = new Promise(resolve => {
    afterRestart.onRecovery(resolve);
  });
  await afterRestart.initialize();
  const recovered = await recoveredPromise;

  assert.equal(recovered.recoverySource, "store-approved-redelivery");
  assert.equal(recovered.productIdentifier, "reverse_flow_support_one_time_5");
  assert.equal(await afterRestart.acknowledgeVerifiedGooglePurchase(recovered, {
    storeApproved: true,
    pendingPersisted: true
  }), true);
  assert.equal(acknowledgmentCalls, 1);
  assert.equal(fixture.callbacks.finishCount || 0, 0);
  assert.notEqual(afterRestart.readPendingOneTimeRegistration(), null);

  await afterRestart.finishPurchase(recovered, {
    storeApproved: true,
    billingStatePersisted: true
  });
  assert.equal(fixture.callbacks.finishCount, 1);
  assert.equal(acknowledgmentCalls, 1);
  assert.equal(afterRestart.readPendingOneTimeRegistration(), null);
});

test("duplicate taps cannot start a second native purchase", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const firstPurchase = service.purchase(service.getOptions("apple")[0]);

  await assert.rejects(
    service.purchase(service.getOptions("apple")[0]),
    error => error.code === "purchase_in_progress"
  );
  await firstPurchase;
});

test("restored subscription callbacks create only subscription pending state", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  fixture.callbacks.approved({
    platform: "ios-appstore",
    products: [{ id: "support_reverse_flow_monthly_3" }],
    transactionId: "historical-subscription-transaction",
    originalTransactionId: "historical-subscription-original",
    purchaseDate: new Date("2026-07-01T12:00:00Z"),
    state: "approved"
  });

  assert.equal(service.oneTimeRetryStore.read(), null);
  assert.equal(
    service.subscriptionRetryStore.read()?.productId,
    "support_reverse_flow_monthly_3"
  );
  assert.equal(
    service.readPendingRegistration()?.productId,
    "support_reverse_flow_monthly_3"
  );
});

test("subscription and consumable pending records are product-specific", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  installPurchaseGlobals("android", {});
  const service = new SupportPurchaseService(CONFIG, { store: {}, storage });
  service.persistPendingEvidence({
    paymentSource: "android",
    productIdentifier: "support_reverse_flow_subscription",
    purchaseType: "monthly",
    basePlanId: "monthly-10",
    purchaseToken: "subscription-token"
  });
  assert.equal(service.oneTimeRetryStore.read(), null);
  assert.equal(
    service.subscriptionRetryStore.read()?.productId,
    "support_reverse_flow_subscription"
  );
  service.persistPendingEvidence({
    paymentSource: "android",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time",
    purchaseToken: "one-time-token"
  });
  assert.equal(
    service.oneTimeRetryStore.read()?.productId,
    "reverse_flow_support_one_time_5"
  );
});

test("duplicate transaction reconciliation runs backend work once", async () => {
  installPurchaseGlobals("android", {});
  const service = new SupportPurchaseService(CONFIG, { store: {} });
  const evidence = {
    paymentSource: "android",
    productIdentifier: "support_reverse_flow_subscription",
    purchaseType: "monthly",
    basePlanId: "monthly-10",
    purchaseToken: "stable-reconciliation-token"
  };
  let calls = 0;
  const reconcile = () => service.reconcileTransaction(evidence, async () => {
    calls += 1;
    await Promise.resolve();
    return "confirmed";
  });
  const [first, second] = await Promise.all([reconcile(), reconcile()]);
  assert.equal(first, "confirmed");
  assert.equal(second, "confirmed");
  assert.equal(calls, 1);
  assert.equal(await reconcile(), null);
});

test("StoreKit no-match clears a stale completion marker even for a claimed Supporter", async () => {
  const fixture = createStore("ios");
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  installPurchaseGlobals("ios", fixture.store);
  const cache = new SupporterCache(storage);
  cache.writeConfirmed({
    isSupporter: true,
    supporterSince: "2026-07-24",
    source: "apple",
    recurringStatus: "inactive",
    hasActiveRecurringSupport: false,
    lastVerifiedAt: "2026-07-24T12:00:00Z"
  }, { email: "supporter@example.com", platform: "ios" });
  const pendingStore = new PendingSupportRegistrationStore(storage);
  pendingStore.write({
    paymentSource: "ios",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time",
    transactionId: "stale-finished-transaction"
  });
  pendingStore.markAttempt("confirmed-awaiting-finish");
  global.Capacitor.Plugins = {
    SupportPurchaseRecovery: {
      async addListener() {},
      async recoverUnfinishedConsumable() {
        return { found: false };
      }
    }
  };
  const service = new SupportPurchaseService(CONFIG, {
    store: fixture.store,
    storage,
    pendingStore,
    supporterCache: cache
  });
  await service.initialize();
  await service.recoverUnfinishedConsumable({ automatic: true });
  assert.equal(service.oneTimeRetryStore.read(), null);
  assert.equal(cache.read().isSupporter, true);
});

test("stale Apple monthly recovery and its premature billing history are cleared", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  const staleEvidence = {
    paymentSource: "ios",
    productIdentifier: "support_reverse_flow_monthly_10",
    purchaseType: "monthly",
    transactionId: "stale-monthly-transaction",
    purchaseTimestamp: "2026-07-24T12:00:00Z"
  };
  service.persistPendingEvidence(staleEvidence);
  service.recordBillingHistory(staleEvidence);

  assert.equal(
    service.deriveBillingState("ios"),
    require("../www/js/services/supporter.js").BILLING_STATES.NEVER_PURCHASED
  );
  await service.initialize();

  assert.equal(service.readPendingSubscriptionRegistration(), null);
  assert.equal(service.readBillingHistory().previouslySupported, false);
  assert.equal(
    service.deriveBillingState("ios"),
    require("../www/js/services/supporter.js").BILLING_STATES.NEVER_PURCHASED
  );
  assert.ok(
    service.getOptions("apple")
      .filter(option => option.type === "monthly")
      .every(option => option.state === "ready")
  );
});

test("non-product and application-receipt callbacks never enter Supporter recovery", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  const recovered = [];
  service.onRecovery(evidence => recovered.push(evidence));
  await service.initialize();

  fixture.callbacks.approved({
    platform: "ios-appstore",
    state: "approved",
    products: [],
    transactionId: "application-receipt-callback"
  });
  fixture.callbacks.approved({
    platform: "ios-appstore",
    state: "approved",
    products: [{ id: "app.reverseflow.mobile" }],
    transactionId: "bundle-identifier-callback"
  });

  assert.equal(recovered.length, 0);
  assert.equal(service.readPendingRegistration(), null);
  assert.equal(service.receivedTransactionKeys.size, 0);
  assert.equal(
    service.deriveBillingState("ios"),
    require("../www/js/services/supporter.js").BILLING_STATES.NEVER_PURCHASED
  );
  assert.match(
    appSource,
    /if \(!approvedProductIds\.includes\(REVERSE_FLOW_PRO_PRODUCT_ID\)\)[\s\S]{0,500}transaction-approved-ignored[\s\S]{0,500}return;[\s\S]{0,120}transaction\.verify\(\)/
  );
});

test("a matching unfinished Apple consumable preserves recovery without finishing it", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  let nativeFinishCalls = 0;
  global.Capacitor.Plugins = {
    SupportPurchaseRecovery: {
      async addListener() {},
      async recoverUnfinishedConsumable() {
        return {
          found: true,
          productId: "reverse_flow_support_one_time_5",
          transactionId: "recoverable-consumable-transaction",
          originalTransactionId: "recoverable-consumable-original",
          purchaseDate: "2026-07-24T12:00:00Z",
          environment: "Sandbox"
        };
      },
      async finishRecoveredConsumable() {
        nativeFinishCalls += 1;
      }
    }
  };
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  service.persistPendingEvidence({
    paymentSource: "ios",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time",
    transactionId: "recoverable-consumable-transaction",
    originalTransactionId: "recoverable-consumable-original",
    purchaseTimestamp: "2026-07-24T12:00:00Z"
  });

  await service.initialize();

  assert.notEqual(service.readPendingOneTimeRegistration(), null);
  assert.equal(nativeFinishCalls, 0);
});

test("Supporter service initialization and listener binding are idempotent", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });

  await Promise.all([
    service.initialize(),
    service.initialize(),
    service.initialize()
  ]);

  assert.equal(service.bound, true);
  assert.equal(fixture.registered.length, 3);
  assert.match(
    supporterServiceSource,
    /if \(global\.__reverseFlowSupporterV2Initialized === true\) return;/
  );
});

test("subscription refresh returns only recurring support and management opens natively", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const option = service.getOptions("google")[1];
  const transaction = {
    platform: "android-playstore",
    products: [{ id: option.productId, offerId: option.offer.id }],
    purchaseId: "restored-google-token",
    purchaseDate: new Date("2026-07-24T11:00:00Z"),
    state: "approved"
  };
  fixture.store.localTransactions.push(transaction);

  const restored = await service.refreshSubscriptionPurchases();
  assert.equal(restored.productIdentifier, "support_reverse_flow_subscription");
  assert.equal(restored.purchaseToken, "restored-google-token");
  await service.openNativeSubscriptionManagement();
  assert.deepEqual(fixture.counts(), {
    restoreCalls: 1,
    manageCalls: 1,
    finishCalls: 0
  });
});

test("fresh-install restored subscriptions use registration recovery only on iOS", async () => {
  for (const platform of ["ios", "android"]) {
    const fixture = createStore(platform);
    installPurchaseGlobals(platform, fixture.store);
    const service = new SupportPurchaseService(CONFIG, {
      store: fixture.store
    });
    const recovered = [];
    service.onRecovery(evidence => recovered.push(evidence));
    await service.initialize();
    await new Promise(resolve => setImmediate(resolve));
    const option = service.getOptions(platform === "ios" ? "apple" : "google")[1];
    const transaction = {
      platform: platform === "ios" ? "ios-appstore" : "android-playstore",
      products: [{ id: option.productId, offerId: option.offer.id }],
      transactionId: platform === "ios" ? "2000000123456789" : "GPA.123",
      originalTransactionId:
        platform === "ios" ? "1000000123456789" : null,
      purchaseId: platform === "android" ? "restored-google-token" : null,
      purchaseDate: new Date("2026-07-24T11:00:00Z"),
      expirationDate: new Date("2099-08-24T11:00:00Z"),
      environment: platform === "ios" ? "Sandbox" : null,
      state: "finished",
      nativePurchase:
        platform === "android"
          ? {
              purchaseToken: "restored-google-token",
              acknowledged: true
            }
          : {},
      async finish() {}
    };

    fixture.callbacks.approved(transaction);

    if (platform === "ios") {
      assert.equal(recovered.length, 1);
      assert.equal(recovered[0].recoverySource, "store-restored-subscription");
      assert.equal(
        service.readPendingSubscriptionRegistration().productId,
        option.productId
      );
    } else {
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(recovered.length, 0);
      assert.equal(service.readPendingSubscriptionRegistration(), null);
    }
  }
});

test("restored ownership and pending profile setup do not globally lock contribution options", async () => {
  for (const platform of ["ios", "android"]) {
    const fixture = createStore(platform);
    installPurchaseGlobals(platform, fixture.store);
    const monthly3 = fixture.products.get(
      platform === "ios"
        ? "support_reverse_flow_monthly_3"
        : "support_reverse_flow_subscription"
    );
    monthly3.owned = true;
    const service = new SupportPurchaseService(CONFIG, {
      store: fixture.store
    });
    await service.initialize();
    await new Promise(resolve => setImmediate(resolve));
    const options = service.getOptions(platform === "ios" ? "apple" : "google");

    assert.equal(options.find(option => option.key === "monthly3").owned, true);
    assert.equal(
      options.find(option => option.key === "monthly10").owned,
      platform === "android"
    );
    assert.equal(
      options.find(option => option.key === "oneTime5").repurchaseRestricted,
      false
    );
  }
  assert.doesNotMatch(
    supporterServiceSource,
    /optionsSection\.hidden = hasPendingRegistration/
  );
  assert.match(
    supporterServiceSource,
    /safeAction === ACTIONS\.CLAIM && !hasPendingRegistration/
  );
  assert.match(supporterServiceSource, /Current monthly support/);
  assert.match(
    supporterServiceSource,
    /currentRecurringProductId:[\s\S]*currentMonthlyOption\?\.productId/
  );
});

test("only an owned non-consumable is represented as store-restricted", () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const config = structuredClone(CONFIG);
  config.apple.oneTime5.productType = "non-consumable";
  fixture.products.get("reverse_flow_support_one_time_5").owned = true;
  const service = new SupportPurchaseService(config, { store: fixture.store });
  service.storePlatform = global.CdvPurchase.Platform.APPLE_APPSTORE;
  service.initialized = true;

  const option = service.getOptions("apple").find(entry => entry.key === "oneTime5");
  assert.equal(option.owned, true);
  assert.equal(option.repurchaseRestricted, true);
});

test("Apple monthly changes use the alternate subscription product in-app", async () => {
  for (const [fromKey, toKey] of [[1, 2], [2, 1]]) {
    const fixture = createStore("ios");
    installPurchaseGlobals("ios", fixture.store);
    const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
    await service.initialize();
    const options = service.getOptions("apple");
    await service.purchase(options[toKey], {
      currentRecurringProductId: options[fromKey].productId,
      currentMonthlyAmount: options[fromKey].amount
    });
    assert.equal(fixture.orders.at(-1).productId, options[toKey].productId);
    assert.equal(fixture.orders.at(-1).additionalData, undefined);
  }
});

test("Google monthly changes replace the active purchase with deliberate modes", async () => {
  for (const [fromKey, toKey, expectedMode] of [
    [1, 2, "IMMEDIATE_AND_CHARGE_PRORATED_PRICE"],
    [2, 1, "DEFERRED"]
  ]) {
    const fixture = createStore("android");
    installPurchaseGlobals("android", fixture.store);
    const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
    await service.initialize();
    const options = service.getOptions("google");
    fixture.store.localTransactions.push({
      platform: "android-playstore",
      products: [{
        id: options[fromKey].productId,
        offerId: options[fromKey].offer.id
      }],
      purchaseId: `current-token-${fromKey}`,
      purchaseDate: new Date("2026-07-24T10:00:00Z"),
      state: "finished"
    });
    await service.purchase(options[toKey], {
      currentRecurringProductId: options[fromKey].productId,
      currentBasePlanId: options[fromKey].basePlanId,
      currentMonthlyAmount: options[fromKey].amount
    });
    assert.deepEqual(fixture.orders.at(-1).additionalData, {
      googlePlay: {
        oldPurchaseToken: `current-token-${fromKey}`,
        replacementMode: expectedMode,
        replacementRequired: true,
        oldProductId: options[fromKey].productId,
        oldBasePlanId: options[fromKey].basePlanId,
        targetBasePlanId: options[toKey].basePlanId
      }
    });
    assert.equal(fixture.counts().restoreCalls, 1);
  }
});

test("Google Change requires current ownership and ignores older same-product tokens", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const options = service.getOptions("google");

  await assert.rejects(
    service.purchase(options[2], {
      currentRecurringProductId: options[1].productId,
      currentBasePlanId: options[1].basePlanId,
      currentMonthlyAmount: options[1].amount
    }),
    error => error.code === "subscription_replacement_token_unavailable"
  );
  assert.equal(fixture.orders.length, 0);

  fixture.store.localTransactions.push(
    {
      platform: "android-playstore",
      products: [{
        id: options[1].productId,
        offerId: options[1].offer.id
      }],
      purchaseId: "active-three-token",
      purchaseDate: new Date("2026-07-24T10:00:00Z"),
      state: "finished"
    },
    {
      platform: "android-playstore",
      products: [{
        id: options[2].productId,
        offerId: options[2].offer.id
      }],
      purchaseId: "active-ten-token",
      purchaseDate: new Date("2026-07-24T11:00:00Z"),
      state: "finished"
    }
  );
  await service.purchase(options[1], {
    currentRecurringProductId: options[2].productId,
    currentBasePlanId: options[2].basePlanId,
    currentMonthlyAmount: options[2].amount
  });
  assert.equal(
    fixture.orders.at(-1).additionalData.googlePlay.oldPurchaseToken,
    "active-ten-token"
  );
  assert.equal(
    fixture.orders.at(-1).additionalData.googlePlay.replacementRequired,
    true
  );
});

test("Google initial monthly support remains a normal purchase", async () => {
  const fixture = createStore("android");
  installPurchaseGlobals("android", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const option = service.getOptions("google")
    .find(item => item.key === "monthly3");
  await service.purchase(option);
  assert.equal(fixture.orders.at(-1).additionalData, undefined);
  assert.equal(fixture.counts().restoreCalls, 0);
});

test("native Google replacement guard is packaged", () => {
  assert.match(
    fs.readFileSync(
      path.join(__dirname, "..", "scripts", "patch-android-purchase-plugin.js"),
      "utf8"
    ),
    /subscription replacement configured/
  );
});

test("active Supporter management keeps billing secondary and offers repeat support", () => {
  assert.match(supportPageSource, /Manage Your Support/);
  assert.match(supportPageSource, /Manage Billing or Cancel/);
  assert.match(supporterServiceSource, /Change to \$\{option\.localizedPrice\}\/month/);
  assert.match(supporterServiceSource, /Add One-Time Support — \$\{oneTime\.localizedPrice\}/);
  assert.match(
    supporterServiceSource,
    /option\.key !== current\?\.key/
  );
  assert.doesNotMatch(
    `${supportPageSource}\n${supporterServiceSource}`,
    /Your monthly support will change to|scheduledSupportChange|support-plan-change-note/
  );
  assert.match(supportPageSource, /id="supportOptionsTitle">Help Build What Comes Next/);
  assert.match(
    supporterServiceSource,
    /optionsTitle\.textContent = hasPendingRegistration[\s\S]*"Continue Supporting"/
  );
  assert.match(
    supporterServiceSource,
    /Thank you for continuing to support Reverse Flow\./
  );
});

test("iOS consumable recovery uses Transaction.unfinished without restore semantics", async () => {
  const fixture = createStore("ios");
  const storageValues = new Map();
  const storage = {
    getItem: key => storageValues.get(key) || null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: key => storageValues.delete(key)
  };
  let recoverCalls = 0;
  let nativeFinishCalls = 0;
  installPurchaseGlobals("ios", fixture.store);
  global.Capacitor.Plugins = {
    SupportPurchaseRecovery: {
      async addListener() {},
      async recoverUnfinishedConsumable() {
        recoverCalls += 1;
        return {
          found: true,
          productId: "reverse_flow_support_one_time_5",
          transactionId: "2000000123456789",
          originalTransactionId: "2000000123456789",
          signedTransaction: "header.payload.signature",
          purchaseDate: "2026-07-24T12:00:00Z",
          environment: "Sandbox"
        };
      },
      async finishRecoveredConsumable({ transactionId }) {
        assert.equal(transactionId, "2000000123456789");
        nativeFinishCalls += 1;
      }
    }
  };
  const service = new SupportPurchaseService(CONFIG, {
    store: fixture.store,
    retryStore: new SupportPurchaseRetryStore(storage)
  });
  await service.initialize();
  const recovered = await service.recoverUnfinishedConsumable();

  assert.equal(recovered.nativeRecovery, true);
  assert.equal(recovered.productIdentifier, "reverse_flow_support_one_time_5");
  assert.equal(recovered.signedTransaction, "header.payload.signature");
  assert.equal(recovered.environment, "sandbox");
  assert.equal(recoverCalls >= 1, true);
  assert.equal(fixture.counts().restoreCalls, 0);
  assert.equal(storageValues.size, 1);
  assert.equal(new SupporterCache(storage).read().isSupporter, false);

  await service.finishPurchase(recovered, {
    storeApproved: true,
    billingStatePersisted: true
  });
  assert.equal(nativeFinishCalls, 1);
  assert.equal(storageValues.size, 0);
});

test("native recovery bridge scans updates and unfinished transactions and never syncs", () => {
  assert.match(iosRecoveryPluginSource, /Transaction\.updates/);
  assert.match(iosRecoveryPluginSource, /Transaction\.unfinished/);
  assert.match(iosRecoveryPluginSource, /unfinished-transaction-found/);
  assert.match(iosRecoveryPluginSource, /no-recoverable-transaction-found/);
  assert.match(iosRecoveryPluginSource, /result\.jwsRepresentation/);
  assert.doesNotMatch(iosRecoveryPluginSource, /AppStore\.sync/);
  assert.doesNotMatch(iosRecoveryPluginSource, /restoreCompletedTransactions/);
  assert.match(
    iosProjectSource,
    /SupportPurchaseRecoveryPlugin\.swift in Sources/
  );
});

test("registration payload sends store evidence in the POST body only", () => {
  installPurchaseGlobals("ios", {});
  const payload = createPurchaseRegistrationPayload({
    name: " Firefighter Name ",
    email: " Firefighter@Example.com "
  }, {
    paymentSource: "ios",
    productIdentifier: "support_reverse_flow_monthly_3",
    purchaseType: "monthly",
    monthlyAmount: 3,
    transactionId: "2000000123456789",
    originalTransactionId: "1000000123456789",
    signedTransaction: "header.payload.signature",
    environment: "Sandbox",
    purchaseTimestamp: "2026-07-24T12:00:00Z"
  });

  assert.equal(payload.name, "Firefighter Name");
  assert.equal(payload.email, "firefighter@example.com");
  assert.deepEqual(payload.transactionEvidence, {
    transactionId: "2000000123456789",
    originalTransactionId: "1000000123456789",
    signedTransaction: "header.payload.signature",
    environment: "sandbox"
  });
  assert.equal("transaction" in payload, false);
});
