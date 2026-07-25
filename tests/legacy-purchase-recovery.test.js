const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const {
  ACTIONS,
  resolveSupportAction
} = require("../www/js/services/supporter.js");

const root = path.resolve(__dirname, "..");
const constantsSource = fs.readFileSync(
  path.join(root, "www/js/constants.js"),
  "utf8"
);
const entitlementSource = fs.readFileSync(
  path.join(root, "www/js/services/entitlement.js"),
  "utf8"
);
const appSource = fs.readFileSync(path.join(root, "www/js/app.js"), "utf8");
const iosPluginSource = fs.readFileSync(
  path.join(root, "ios/App/App/LegacyEntitlementPlugin.swift"),
  "utf8"
);
const mainViewControllerSource = fs.readFileSync(
  path.join(root, "ios/App/App/MainViewController.swift"),
  "utf8"
);
const storyboardSource = fs.readFileSync(
  path.join(root, "ios/App/App/Base.lproj/Main.storyboard"),
  "utf8"
);
const xcodeProjectSource = fs.readFileSync(
  path.join(root, "ios/App/App.xcodeproj/project.pbxproj"),
  "utf8"
);

function createRecoveryContext(options = {}) {
  const values = new Map();
  const logs = [];
  if (options.storedEntitlement) {
    values.set(
      "reverse-flow-pro-entitlement-v1",
      JSON.stringify(options.storedEntitlement)
    );
  }
  if (options.storedAccessLevel) {
    values.set("reverse-flow-access-level", options.storedAccessLevel);
  }

  let owned = options.ownedInitially === true;
  let restoreCalls = 0;
  let initializeCalls = 0;
  let registerCalls = 0;
  let nativeCheckCalls = 0;
  const nativeCheckOptions = [];
  let releaseRestore;
  const restoreGate = options.deferRestore
    ? new Promise(resolve => {
        releaseRestore = resolve;
      })
    : Promise.resolve();
  const transaction = {
    platform: "ios-appstore",
    state: "finished",
    transactionId: "TEST_TRANSACTION",
    originalTransactionId: "TEST_ORIGINAL_TRANSACTION",
    purchaseDate: "2021-04-08T12:00:00.000Z",
    products: [{ id: "reverse_flow_pro_lifetime" }]
  };
  const store = {
    isReady: options.storeReady === true,
    localTransactions: [transaction],
    localReceipts: [],
    verifiedReceipts: [],
    register() {
      registerCalls += 1;
    },
    async initialize() {
      initializeCalls += 1;
      this.isReady = true;
      return [];
    },
    async restorePurchases() {
      restoreCalls += 1;
      await restoreGate;
      owned = options.restoreFindsPurchase !== false;
    },
    owned(productId) {
      return productId === "reverse_flow_pro_lifetime" && owned;
    },
    get(productId) {
      return {
        id: productId,
        owned: productId === "reverse_flow_pro_lifetime" && owned
      };
    }
  };
  const document = {
    body: { classList: { toggle() {} } },
    dispatchEvent() {},
    getElementById() {
      return null;
    }
  };
  const context = {
    console: {
      info: (...args) => logs.push(["info", ...args]),
      warn: (...args) => logs.push(["warn", ...args]),
      log: (...args) => logs.push(["log", ...args])
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    Date,
    JSON,
    Map,
    Number,
    Promise,
    setTimeout,
    clearTimeout,
    document,
    navigator: { onLine: options.online !== false },
    localStorage: {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key)
    },
    Capacitor: {
      getPlatform: () => options.platform || "ios",
      isPluginAvailable: name =>
        name === "LegacyEntitlement" &&
        options.nativeEntitlement !== undefined,
      Plugins: options.nativeEntitlement === undefined
        ? {}
        : {
            LegacyEntitlement: {
              async checkEntitlement(callOptions) {
                nativeCheckCalls += 1;
                nativeCheckOptions.push(callOptions);
                if (options.nativeError) throw new Error(options.nativeError);
                return options.nativeEntitlement;
              }
            }
          }
    },
    CdvPurchase: {
      store,
      ProductType: { NON_CONSUMABLE: "non-consumable" },
      Platform: {
        APPLE_APPSTORE: "ios-appstore",
        GOOGLE_PLAY: "android-playstore"
      }
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(constantsSource, context);
  vm.runInContext(entitlementSource, context);
  return {
    context,
    releaseRestore,
    counts: () => ({
      restoreCalls,
      initializeCalls,
      registerCalls,
      nativeCheckCalls
    }),
    nativeCheckOptions,
    logs,
    entitlement: () =>
      JSON.parse(values.get("reverse-flow-pro-entitlement-v1") || "null")
  };
}

function legacyStateChangeLogs(recovery) {
  const entries = recovery.logs
    .map(entry => entry[2])
    .filter(payload => payload?.event === "legacy-entitlement-state-changed");
  return JSON.parse(JSON.stringify(entries));
}

test("fresh iOS install uses verified currentEntitlements without prompting for sync", async () => {
  const recovery = createRecoveryContext({
    nativeEntitlement: {
      owned: true,
      productId: "reverse_flow_pro_lifetime",
      transactionId: "2000001234567890",
      originalTransactionId: "1000001234567890",
      purchaseDate: "2021-04-08T12:00:00.000Z"
    }
  });
  const result = await recovery.context.recoverLegacyProPurchase({
    trigger: "test-fresh-install",
    startup: true
  });

  assert.equal(result.found, true);
  assert.deepEqual(recovery.counts(), {
    restoreCalls: 0,
    initializeCalls: 0,
    registerCalls: 0,
    nativeCheckCalls: 1
  });
  assert.equal(recovery.nativeCheckOptions.length, 1);
  assert.equal(recovery.nativeCheckOptions[0].synchronize, false);
  assert.equal(
    recovery.entitlement().productId,
    "reverse_flow_pro_lifetime"
  );
  assert.equal(
    recovery.entitlement().originalTransactionId,
    "1000001234567890"
  );
  assert.deepEqual(
    legacyStateChangeLogs(recovery),
    [{
      event: "legacy-entitlement-state-changed",
      eligible: true,
      source: "storekit2-current-entitlements",
      productId: "reverse_flow_pro_lifetime"
    }]
  );
});

test("upgraded install retains stored legacy eligibility while offline", async () => {
  const recovery = createRecoveryContext({
    online: false,
    nativeEntitlement: {
      owned: false,
      productId: "reverse_flow_pro_lifetime"
    },
    storedEntitlement: {
      access: "pro",
      source: "purchase",
      productId: "reverse_flow_pro_lifetime",
      verifiedAt: "2026-07-23T12:00:00.000Z"
    }
  });
  const result = await recovery.context.recoverLegacyProPurchase();

  assert.equal(result.found, true);
  assert.equal(recovery.counts().restoreCalls, 0);
  assert.equal(recovery.counts().nativeCheckCalls, 1);
  assert.equal(
    legacyStateChangeLogs(recovery)[0].source,
    "persisted-verified-legacy-cache"
  );
});

test("online StoreKit no-entitlement response clears stale verified legacy cache", async () => {
  const recovery = createRecoveryContext({
    online: true,
    nativeEntitlement: {
      owned: false,
      productId: "reverse_flow_pro_lifetime"
    },
    storedEntitlement: {
      access: "pro",
      source: "purchase",
      productId: "reverse_flow_pro_lifetime",
      verifiedAt: "2026-07-23T12:00:00.000Z"
    }
  });

  const result = await recovery.context.recoverLegacyProPurchase({
    trigger: "clean-sandbox-startup",
    startup: true
  });

  assert.equal(result.found, false);
  assert.equal(recovery.context.hasLegacyProEntitlement(), false);
  assert.equal(recovery.entitlement(), null);
  assert.equal(
    legacyStateChangeLogs(recovery).at(-1).eligible,
    false
  );
  assert.equal(
    legacyStateChangeLogs(recovery).at(-1).source,
    "storekit2-current-entitlements"
  );
});

test("manual iOS recovery synchronizes once and coalesces duplicate taps", async () => {
  const recovery = createRecoveryContext({
    nativeEntitlement: {
      owned: true,
      productId: "reverse_flow_pro_lifetime",
      originalTransactionId: "1000001234567890"
    }
  });
  const first = recovery.context.recoverLegacyProPurchase();
  const second = recovery.context.recoverLegacyProPurchase();
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(firstResult.found, true);
  assert.equal(secondResult.found, true);
  assert.equal(recovery.counts().nativeCheckCalls, 1);
  assert.equal(recovery.nativeCheckOptions.length, 1);
  assert.equal(recovery.nativeCheckOptions[0].synchronize, true);
  assert.equal(
    legacyStateChangeLogs(recovery)[0].source,
    "manual-store-sync"
  );
});

test("claim evidence refresh rechecks currentEntitlements without App Store sync", async () => {
  const recovery = createRecoveryContext({
    nativeEntitlement: {
      owned: true,
      productId: "reverse_flow_pro_lifetime",
      originalTransactionId: "1000001234567890"
    }
  });
  const evidence = await recovery.context.refreshLegacyProEntitlementEvidence();

  assert.equal(evidence.productId, "reverse_flow_pro_lifetime");
  assert.equal(
    recovery.entitlement().originalTransactionId,
    "1000001234567890"
  );
  assert.equal(recovery.counts().nativeCheckCalls, 1);
  assert.equal(recovery.nativeCheckOptions[0].synchronize, false);
});

test("unrelated StoreKit entitlement cannot establish legacy eligibility", async () => {
  const recovery = createRecoveryContext({
    nativeEntitlement: {
      owned: true,
      productId: "app.reverseflow.mobile",
      originalTransactionId: "APP_TRANSACTION"
    }
  });
  const result = await recovery.context.recoverLegacyProPurchase({
    startup: true
  });

  assert.equal(result.found, false);
  assert.equal(recovery.entitlement(), null);
  assert.deepEqual(legacyStateChangeLogs(recovery), []);
});

test("completely clean user with no purchase remains Become a Supporter", async () => {
  const recovery = createRecoveryContext({
    nativeEntitlement: {
      owned: false,
      productId: null
    }
  });
  const result = await recovery.context.recoverLegacyProPurchase({
    trigger: "clean-user-startup",
    startup: true
  });

  assert.equal(result.found, false);
  assert.equal(recovery.context.hasLegacyProEntitlement(), false);
  assert.equal(recovery.entitlement(), null);
  assert.deepEqual(legacyStateChangeLogs(recovery), []);
  assert.equal(
    resolveSupportAction({
      isSupporter: false,
      hasLegacyProEntitlement: recovery.context.hasLegacyProEntitlement()
    }),
    ACTIONS.BECOME
  );
});

test("product availability without ownership cannot establish legacy eligibility", async () => {
  const recovery = createRecoveryContext({
    nativeEntitlement: {
      owned: false,
      productId: "reverse_flow_pro_lifetime"
    }
  });
  const result = await recovery.context.recoverLegacyProPurchase({
    startup: true
  });

  assert.equal(result.found, false);
  assert.equal(recovery.entitlement(), null);
  assert.deepEqual(legacyStateChangeLogs(recovery), []);
});

test("bare old Pro compatibility storage is ignored without verified evidence", () => {
  const recovery = createRecoveryContext({
    storedAccessLevel: "pro",
    nativeEntitlement: {
      owned: false,
      productId: null
    }
  });

  assert.equal(recovery.context.hasLegacyProEntitlement(), false);
  assert.equal(recovery.entitlement(), null);
  assert.deepEqual(legacyStateChangeLogs(recovery), []);
  assert.equal(
    resolveSupportAction({ hasLegacyProEntitlement: false }),
    ACTIONS.BECOME
  );
});

test("legacy eligibility uses a closed privacy-safe provenance source list", () => {
  const expectedSources = [
    "storekit2-current-entitlements",
    "cordova-verified-receipt",
    "cordova-owned-product",
    "google-owned-purchase",
    "persisted-verified-legacy-cache",
    "old-pro-storage-migration",
    "manual-store-sync",
    "test-fixture"
  ];

  for (const source of expectedSources) {
    assert.match(entitlementSource, new RegExp(`"${source}"`));
  }
  assert.match(entitlementSource, /event: "legacy-entitlement-state-changed"/);
  assert.match(entitlementSource, /LEGACY_ENTITLEMENT_SOURCE_VALUES\.has\(provenanceSource\)/);
  assert.doesNotMatch(entitlementSource, /\blegacySupporterEligible\b/);
});

test("every production legacy grant is centralized and source-specific", () => {
  const productionSources = `${entitlementSource}\n${appSource}`;
  const grantCalls =
    productionSources.match(/setAccessLevel\(ACCESS_LEVELS\.PRO,\s*\{/g) || [];

  assert.equal(grantCalls.length, 5);
  assert.match(appSource, /LEGACY_ENTITLEMENT_SOURCES\.CORDOVA_VERIFIED_RECEIPT/);
  assert.match(appSource, /LEGACY_ENTITLEMENT_SOURCES\.CORDOVA_OWNED_PRODUCT/);
  assert.match(appSource, /LEGACY_ENTITLEMENT_SOURCES\.GOOGLE_OWNED_PURCHASE/);
  assert.match(entitlementSource, /LEGACY_ENTITLEMENT_SOURCES\.STOREKIT2_CURRENT_ENTITLEMENTS/);
  assert.match(entitlementSource, /LEGACY_ENTITLEMENT_SOURCES\.MANUAL_STORE_SYNC/);
  assert.doesNotMatch(
    appSource,
    /localStorage\.setItem\(\s*PRO_ENTITLEMENT_STORAGE_KEY/
  );
  assert.doesNotMatch(appSource, /userAccessLevel\s*=\s*ACCESS_LEVELS\.PRO/);
});

test("an unapproved generic provenance source cannot grant the exact product", () => {
  const recovery = createRecoveryContext({
    nativeEntitlement: {
      owned: false,
      productId: null
    }
  });
  const granted = recovery.context.setAccessLevel(
    "pro",
    {
      source: "purchase",
      provenanceSource: "generic-app-transaction",
      productId: "reverse_flow_pro_lifetime",
      trigger: "test-generic-source"
    }
  );

  assert.equal(granted, false);
  assert.equal(recovery.context.hasLegacyProEntitlement(), false);
  assert.equal(recovery.entitlement(), null);
  assert.deepEqual(legacyStateChangeLogs(recovery), []);
});

test("missing iOS native bridge fails visibly without Cordova restore fallback", async () => {
  const recovery = createRecoveryContext();
  const result = await recovery.context.recoverLegacyProPurchase();

  assert.equal(result.found, false);
  assert.match(result.error.message, /native bridge is unavailable/);
  assert.equal(recovery.counts().restoreCalls, 0);
  assert.equal(recovery.counts().initializeCalls, 0);
});

test("StoreKit bridge accepts only verified exact-product current entitlements", () => {
  assert.match(iosPluginSource, /Transaction\.currentEntitlements/);
  assert.match(
    iosPluginSource,
    /case \.verified\(let transaction\)/
  );
  assert.match(
    iosPluginSource,
    /guard transaction\.productID == legacyProductID/
  );
  assert.match(
    iosPluginSource,
    /if synchronize \{[\s\S]*try await AppStore\.sync\(\)/
  );
  assert.ok(
    iosPluginSource.indexOf("try await AppStore.sync()") <
      iosPluginSource.indexOf("Transaction.currentEntitlements")
  );
  assert.match(iosPluginSource, /entitlement-check-started/);
  assert.match(iosPluginSource, /entitlement-returned/);
  assert.match(iosPluginSource, /no-entitlements-returned/);
  assert.match(iosPluginSource, /bridge-invocation-failed/);
  assert.match(iosPluginSource, /exact-legacy-product-match/);
});

test("App target registers the exact LegacyEntitlement JavaScript plugin", () => {
  assert.match(
    mainViewControllerSource,
    /bridge\?\.registerPluginInstance\(LegacyEntitlementPlugin\(\)\)/
  );
  assert.match(iosPluginSource, /public let jsName = "LegacyEntitlement"/);
  assert.match(
    storyboardSource,
    /customClass="MainViewController"[\s\S]*customModuleProvider="target"/
  );
  assert.match(
    xcodeProjectSource,
    /LegacyEntitlementPlugin\.swift in Sources/
  );
  assert.match(
    xcodeProjectSource,
    /MainViewController\.swift in Sources/
  );
});

test("startup recovery is non-blocking and routes iOS through currentEntitlements", () => {
  assert.match(
    appSource,
    /void recoverLegacyPurchaseFromStore\(\{[\s\S]*startup: true/
  );
  assert.match(
    appSource,
    /recoverIosLegacyProEntitlement\(\{[\s\S]*synchronize: options\.synchronize !== false && !startup/
  );
  assert.match(
    appSource,
    /deviceready[\s\S]*getPlatform\?\.\(\) === "ios"[\s\S]*startLegacyPurchaseRecovery\(\)[\s\S]*initializeReverseFlowStore\(\)/
  );
});
