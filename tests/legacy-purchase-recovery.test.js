const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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

function createRecoveryContext(options = {}) {
  const values = new Map();
  if (options.storedEntitlement) {
    values.set(
      "reverse-flow-pro-entitlement-v1",
      JSON.stringify(options.storedEntitlement)
    );
  }

  let owned = options.ownedInitially === true;
  let restoreCalls = 0;
  let initializeCalls = 0;
  let registerCalls = 0;
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
    console: { info() {}, warn() {}, log() {} },
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
    Capacitor: { getPlatform: () => "ios" },
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
    counts: () => ({ restoreCalls, initializeCalls, registerCalls }),
    entitlement: () =>
      JSON.parse(values.get("reverse-flow-pro-entitlement-v1") || "null")
  };
}

test("fresh install initializes the store, restores history, and records exact legacy ownership", async () => {
  const recovery = createRecoveryContext({ restoreFindsPurchase: true });
  const result = await recovery.context.recoverLegacyProPurchase({
    trigger: "test-fresh-install"
  });

  assert.equal(result.found, true);
  assert.deepEqual(recovery.counts(), {
    restoreCalls: 1,
    initializeCalls: 1,
    registerCalls: 1
  });
  assert.equal(
    recovery.entitlement().productId,
    "reverse_flow_pro_lifetime"
  );
});

test("upgraded install retains stored legacy eligibility while offline", async () => {
  const recovery = createRecoveryContext({
    online: false,
    storedEntitlement: {
      access: "pro",
      source: "purchase",
      productId: "reverse_flow_pro_lifetime",
      verifiedAt: "2026-07-23T12:00:00.000Z"
    }
  });
  const result = await recovery.context.recoverLegacyProPurchase();

  assert.equal(result.found, true);
  assert.equal(result.offline, true);
  assert.equal(recovery.counts().restoreCalls, 0);
});

test("manual purchase recovery coalesces duplicate taps into one store refresh", async () => {
  const recovery = createRecoveryContext({
    deferRestore: true,
    restoreFindsPurchase: true
  });
  const first = recovery.context.recoverLegacyProPurchase();
  const second = recovery.context.recoverLegacyProPurchase();
  assert.equal(recovery.counts().restoreCalls, 0);

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(recovery.counts().restoreCalls, 1);
  recovery.releaseRestore();
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(firstResult.found, true);
  assert.equal(secondResult.found, true);
  assert.equal(recovery.counts().restoreCalls, 1);
});

test("startup recovery is non-blocking and performs one cross-platform history refresh", () => {
  assert.match(
    appSource,
    /void recoverLegacyPurchaseFromStore\(\{[\s\S]*startup: true/
  );
  assert.match(
    appSource,
    /if \(reverseFlowStartupRecoveryAttempted\) return;[\s\S]*store\.restorePurchases\(\)/
  );
  assert.match(
    appSource,
    /receiptsReady\(\(\) => \{[\s\S]*startLegacyPurchaseRecovery\(\)/
  );
});
