const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  SupporterCache,
  SupportPurchaseService,
  SupportPurchaseRetryStore,
  createPurchaseRegistrationPayload
} = require("../www/js/services/supporter.js");

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
      productId: "support_reverse_flow_monthly_3",
      productType: "paid subscription",
      basePlanId: "monthly-3"
    },
    monthly10: {
      productId: "support_reverse_flow_monthly_10",
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
      async order() {
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
    products.set(configured.productId, {
      id: configured.productId,
      offers: [offer],
      getOffer(id) {
        if (!id) return offer;
        return id === offer.id ? offer : undefined;
      }
    });
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
    products,
    registered,
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
  assert.match(constantsSource, /purchaseOptionId:\s*"buy"/);
  assert.match(constantsSource, /basePlanId:\s*"monthly-3"/);
  assert.match(constantsSource, /basePlanId:\s*"monthly-10"/);
  assert.equal(
    (constantsSource.match(/productType:\s*"consumable"/g) || []).length,
    2
  );
  assert.doesNotMatch(constantsSource, /Coming Soon/i);
});

test("supporter APIs use stable Preview and Production hosts", () => {
  assert.match(
    constantsSource,
    /preview:\s*"https:\/\/reverese-flow-website-dam107073-reverse-flow-llc\.vercel\.app"/
  );
  assert.match(
    constantsSource,
    /production:\s*"https:\/\/reverse-flow\.app"/
  );
  assert.equal(
    (constantsSource.match(/reverse-flow-llc\.vercel\.app/g) || []).length,
    1
  );
});

test("native versions are intentional and app/widget iOS builds are aligned", () => {
  assert.equal(
    (iosProjectSource.match(/CURRENT_PROJECT_VERSION = 3;/g) || []).length,
    6
  );
  assert.equal(
    (iosProjectSource.match(/MARKETING_VERSION = 1\.3\.3;/g) || []).length,
    6
  );
  assert.match(androidBuildSource, /versionCode 141/);
  assert.match(androidBuildSource, /versionName "1\.3\.3"/);
});

test("iOS Debug and Release package Preview while Production packages Production", () => {
  assert.equal(
    (iosProjectSource.match(/SUPPORTER_API_ENVIRONMENT = preview;/g) || []).length,
    2
  );
  assert.equal(
    (iosProjectSource.match(/SUPPORTER_API_ENVIRONMENT = production;/g) || []).length,
    1
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

test("Android Debug and Preview package Preview while Release packages Production", () => {
  assert.match(
    androidBuildSource,
    /registerSupporterBackendAssets\("debug", "preview"\)/
  );
  assert.match(
    androidBuildSource,
    /registerSupporterBackendAssets\("preview", "preview"\)/
  );
  assert.match(
    androidBuildSource,
    /registerSupporterBackendAssets\("release", "production"\)/
  );
  assert.match(androidBuildSource, /inputs\.file\(sourceConstants\)/);
  assert.match(
    androidBuildSource,
    /const SUPPORTER_API_ENVIRONMENT = \\"\$\{environment\}\\";/
  );
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
      "support_reverse_flow_monthly_3@monthly-3",
      "support_reverse_flow_monthly_10@monthly-10"
    ]
  );
});

test("approved Apple purchase stays unfinished until backend confirmation", async () => {
  const fixture = createStore("ios");
  installPurchaseGlobals("ios", fixture.store);
  const service = new SupportPurchaseService(CONFIG, { store: fixture.store });
  await service.initialize();
  const pending = await service.purchase(service.getOptions("apple")[0]);

  assert.equal(pending.productIdentifier, "reverse_flow_support_one_time_5");
  assert.equal(pending.transactionId, "2000000123456789");
  assert.equal(pending.originalTransactionId, "1000000123456789");
  assert.equal(fixture.counts().finishCalls, 0);

  await service.finishPurchase(pending);
  assert.equal(fixture.counts().finishCalls, 1);
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
  assert.equal(restored.productIdentifier, "support_reverse_flow_monthly_3");
  assert.equal(restored.purchaseToken, "restored-google-token");
  await service.openNativeSubscriptionManagement();
  assert.deepEqual(fixture.counts(), {
    restoreCalls: 1,
    manageCalls: 1,
    finishCalls: 0
  });
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
  assert.equal(recoverCalls >= 1, true);
  assert.equal(fixture.counts().restoreCalls, 0);
  assert.equal(storageValues.size, 1);
  assert.equal(new SupporterCache(storage).read().isSupporter, false);

  await service.finishPurchase(recovered);
  assert.equal(nativeFinishCalls, 1);
  assert.equal(storageValues.size, 0);
});

test("native recovery bridge scans updates and unfinished transactions and never syncs", () => {
  assert.match(iosRecoveryPluginSource, /Transaction\.updates/);
  assert.match(iosRecoveryPluginSource, /Transaction\.unfinished/);
  assert.match(iosRecoveryPluginSource, /unfinished-transaction-found/);
  assert.match(iosRecoveryPluginSource, /no-recoverable-transaction-found/);
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
    purchaseTimestamp: "2026-07-24T12:00:00Z"
  });

  assert.equal(payload.name, "Firefighter Name");
  assert.equal(payload.email, "firefighter@example.com");
  assert.deepEqual(payload.transactionEvidence, {
    transactionId: "2000000123456789",
    originalTransactionId: "1000000123456789",
    signedTransaction: "header.payload.signature"
  });
  assert.equal("transaction" in payload, false);
});
