const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const {
  ACTIONS,
  BILLING_STATES,
  SupportPurchaseService,
  normalizeApiResponse,
  projectSupportPresentation
} = require("../www/js/services/supporter.js");

const root = path.resolve(__dirname, "..");
const supporterSource = fs.readFileSync(
  path.join(root, "www/js/services/supporter.js"),
  "utf8"
);
const constantsSource = fs.readFileSync(
  path.join(root, "www/js/constants.js"),
  "utf8"
);

const claimed = {
  isSupporter: true,
  name: "Derek Murdock",
  supporterNumber: 42,
  supporterSince: "2026-07-24",
  isPubliclyListed: true,
  lastVerifiedAt: "2026-07-24T12:00:00.000Z"
};

const appleSubscriptionConfig = {
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
  }
};

function createAppleSubscriptionService({
  values = new Map(),
  activeProductId = null,
  pendingProductId = null,
  renewalDate = null,
  bridgeError = null
} = {}) {
  const products = new Map(
    Object.values(appleSubscriptionConfig.apple).map(item => [
      item.productId,
      {
        owned: false,
        pricing: { price: item.productId.endsWith("_10") ? "$9.99" : "$2.99" },
        offers: [{
          id: item.productId,
          pricingPhases: [{
            price: item.productId.endsWith("_10") ? "$9.99" : "$2.99"
          }]
        }],
        getOffer() {
          return this.offers[0];
        }
      }
    ])
  );
  global.Capacitor = {
    getPlatform: () => "ios",
    Plugins: {
      SupportPurchaseRecovery: {
        async currentSupportSubscriptions() {
          if (bridgeError) throw bridgeError;
          return {
            subscriptions: activeProductId
              ? [{
                  productId: activeProductId,
                  pendingProductId,
                  renewalDate
                }]
              : []
          };
        }
      }
    }
  };
  const service = new SupportPurchaseService(appleSubscriptionConfig, {
    store: {
      get: id => products.get(id),
      localTransactions: [],
      localReceipts: []
    },
    storage: {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key)
    }
  });
  service.storePlatform = "ios-appstore";
  service.initialized = true;
  return { service, values };
}

test("all billing states project into supportEligible independently from claimedSupporter", () => {
  const billingStates = [
    BILLING_STATES.NEVER_PURCHASED,
    BILLING_STATES.ACTIVE_MONTHLY_3,
    BILLING_STATES.ACTIVE_MONTHLY_10,
    BILLING_STATES.PREVIOUSLY_SUPPORTED,
    BILLING_STATES.BILLING_UNAVAILABLE
  ];
  for (const billingState of billingStates) {
    for (const backend of [null, claimed]) {
      const result = projectSupportPresentation(billingState, backend);
      const claimedState = backend === claimed;
      const supportEligible = [
        BILLING_STATES.ACTIVE_MONTHLY_3,
        BILLING_STATES.ACTIVE_MONTHLY_10,
        BILLING_STATES.PREVIOUSLY_SUPPORTED
      ].includes(billingState);
      assert.equal(result.supportEligible, supportEligible);
      assert.equal(result.claimedSupporter, claimedState);
      assert.equal(
        result.primaryAction,
        supportEligible ? ACTIONS.MANAGE : ACTIONS.BECOME
      );
    }
  }
});

test("backend claim response contains no billing authority", () => {
  const normalized = normalizeApiResponse(claimed);
  assert.equal(normalized.isSupporter, true);
  assert.equal(normalized.name, "Derek Murdock");
  assert.equal(normalized.supporterNumber, 42);
  assert.equal("contribution" in normalized, false);
  assert.equal("recurringStatus" in normalized, false);
  assert.equal("hasActiveRecurringSupport" in normalized, false);
});

test("Apple and Google product ownership alone derive active monthly tier", () => {
  const config = {
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
  for (const [platform, configKey, ownedId, expected] of [
    [
      "ios",
      "apple",
      "support_reverse_flow_monthly_3",
      BILLING_STATES.ACTIVE_MONTHLY_3
    ],
    [
      "android",
      "google",
      "support_reverse_flow_subscription",
      BILLING_STATES.ACTIVE_MONTHLY_10
    ]
  ]) {
    const products = new Map();
    Object.values(config[configKey]).forEach(item => {
      const offerSuffix = item.basePlanId || item.purchaseOptionId;
      const existing = products.get(item.productId);
      const product = existing || {
        owned: item.productId === ownedId,
        pricing: { price: "$2.99" },
        offers: [],
        getOffer(id) {
          return this.offers.find(offer => offer.id === id) || this.offers[0];
        }
      };
      product.offers.push({
          id: offerSuffix ? `${item.productId}@${offerSuffix}` : item.productId,
          pricingPhases: [{ price: "$2.99" }]
      });
      products.set(item.productId, product);
    });
    global.Capacitor = { getPlatform: () => platform };
    const service = new SupportPurchaseService(config, {
      store: {
        get: id => products.get(id),
    localTransactions: platform === "android" ? [{
      state: "approved",
      products: [{
        id: "support_reverse_flow_subscription",
        offerId: "support_reverse_flow_subscription@monthly-10"
      }],
      purchaseId: "google-token",
      purchaseDate: new Date("2026-07-24T12:00:00Z"),
      nativePurchase: {
        purchaseToken: "google-token",
        acknowledged: true
      }
    }] : [],
        localReceipts: []
      },
      storage: {
        getItem: () => null,
        setItem() {},
        removeItem() {}
      }
    });
    service.storePlatform =
      platform === "ios" ? "ios-appstore" : "android-playstore";
    service.initialized = true;
    assert.equal(service.deriveBillingState(platform), expected);
  }
});

test("active V2 client path contains no backend purchase verification", () => {
  assert.match(constantsSource, /claimSupporter: "\/api\/supporters\/claim-supporter"/);
  assert.doesNotMatch(constantsSource, /verify-purchase|verify-pending/);
  const v2Renderer = supporterSource.slice(
    supporterSource.indexOf("function renderSimplifiedSupportPage"),
    supporterSource.indexOf("function initialize()")
  );
  assert.doesNotMatch(
    v2Renderer,
    /verifyPendingPurchase|registerVerifiedPurchase|createPurchaseRegistrationPayload/
  );
  assert.match(v2Renderer, /completeApprovedPurchase/);
  assert.match(v2Renderer, /registryService\.claimSupporter/);
});

test("store completion succeeds without a Supporter claim or backend request", async () => {
  const values = new Map();
  let finishCalls = 0;
  global.Capacitor = { getPlatform: () => "ios", Plugins: {} };
  const service = new SupportPurchaseService({
    apple: {
      oneTime5: {
        productId: "reverse_flow_support_one_time_5",
        productType: "consumable"
      }
    }
  }, {
    store: { localTransactions: [], localReceipts: [] },
    storage: {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key)
    }
  });
  const evidence = {
    paymentSource: "ios",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time",
    transactionId: "2000000123456789",
    purchaseTimestamp: "2026-07-24T12:00:00.000Z",
    transaction: {
      async finish() {
        finishCalls += 1;
      }
    }
  };
  service.persistPendingEvidence(evidence);
  await service.completeApprovedPurchase(evidence);
  assert.equal(finishCalls, 1);
  assert.equal(service.readPendingRegistration(), null);
  assert.equal(
    service.deriveBillingState("ios"),
    BILLING_STATES.PREVIOUSLY_SUPPORTED
  );
});

test("cached store state preserves Manage while the store is still loading", () => {
  const values = new Map();
  values.set("reverse-flow-store-support-history-v2", JSON.stringify({
    previouslySupported: true,
    lastBillingState: BILLING_STATES.ACTIVE_MONTHLY_10,
    lastSupportedAt: "2026-07-24T12:00:00.000Z"
  }));
  global.Capacitor = { getPlatform: () => "android" };
  const service = new SupportPurchaseService({
    google: {
      monthly10: {
        productId: "support_reverse_flow_subscription",
        productType: "paid subscription",
        basePlanId: "monthly-10"
      }
    }
  }, {
    store: {
      get: () => null,
      localTransactions: [],
      localReceipts: []
    },
    storage: {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key)
    }
  });
  service.storePlatform = "android-playstore";
  assert.equal(
    service.deriveBillingState("android"),
    BILLING_STATES.ACTIVE_MONTHLY_10
  );
  assert.equal(
    projectSupportPresentation(
      service.deriveBillingState("android"),
      claimed
    ).primaryAction,
    ACTIONS.MANAGE
  );
});

test("StoreKit 2 active $9.99 entitlement outranks historical support", async () => {
  const values = new Map([[
    "reverse-flow-store-support-history-v2",
    JSON.stringify({
      previouslySupported: true,
      lastBillingState: BILLING_STATES.PREVIOUSLY_SUPPORTED,
      lastProductId: "reverse_flow_support_one_time_5"
    })
  ]]);
  const { service } = createAppleSubscriptionService({
    values,
    activeProductId: "support_reverse_flow_monthly_10"
  });

  await service.refreshAppleCurrentSubscriptions();
  assert.equal(
    service.deriveBillingState("ios"),
    BILLING_STATES.ACTIVE_MONTHLY_10
  );
  assert.equal(
    projectSupportPresentation(
      service.deriveBillingState("ios"),
      claimed
    ).primaryAction,
    ACTIONS.MANAGE
  );
  assert.equal(service.readBillingHistory().previouslySupported, true);
  assert.equal(service.purchaseInFlight, null);

  service.recordBillingHistory({
    paymentSource: "ios",
    productIdentifier: "reverse_flow_support_one_time_5",
    purchaseType: "one-time"
  });
  assert.equal(
    service.deriveBillingState("ios"),
    BILLING_STATES.ACTIVE_MONTHLY_10
  );
  assert.equal(
    service.readBillingHistory().lastBillingState,
    BILLING_STATES.ACTIVE_MONTHLY_10
  );
});

test("StoreKit 2 active $2.99 entitlement survives delayed history callbacks", async () => {
  const { service } = createAppleSubscriptionService({
    activeProductId: "support_reverse_flow_monthly_3"
  });
  await service.refreshAppleCurrentSubscriptions();

  service.recordBillingState(BILLING_STATES.PREVIOUSLY_SUPPORTED);
  assert.equal(
    service.deriveBillingState("ios"),
    BILLING_STATES.ACTIVE_MONTHLY_3
  );
});

test("authoritative no-active result permits historical Continue Supporting", async () => {
  const values = new Map([[
    "reverse-flow-store-support-history-v2",
    JSON.stringify({
      previouslySupported: true,
      lastBillingState: BILLING_STATES.ACTIVE_MONTHLY_10,
      lastProductId: "support_reverse_flow_monthly_10"
    })
  ]]);
  const { service } = createAppleSubscriptionService({ values });

  await service.refreshAppleCurrentSubscriptions();
  assert.equal(
    service.deriveBillingState("ios"),
    BILLING_STATES.PREVIOUSLY_SUPPORTED
  );
});

test("StoreKit reconciliation failure preserves last active tier", async () => {
  const values = new Map([[
    "reverse-flow-store-support-history-v2",
    JSON.stringify({
      previouslySupported: true,
      lastBillingState: BILLING_STATES.ACTIVE_MONTHLY_10,
      lastProductId: "support_reverse_flow_monthly_10"
    })
  ]]);
  const { service } = createAppleSubscriptionService({
    values,
    bridgeError: new Error("native callback failed")
  });

  await service.refreshAppleCurrentSubscriptions();
  assert.equal(
    service.deriveBillingState("ios"),
    BILLING_STATES.ACTIVE_MONTHLY_10
  );
});

test("restart restores Manage while StoreKit refresh is pending", async () => {
  const values = new Map();
  const first = createAppleSubscriptionService({
    values,
    activeProductId: "support_reverse_flow_monthly_10"
  }).service;
  await first.refreshAppleCurrentSubscriptions();
  assert.equal(
    first.deriveBillingState("ios"),
    BILLING_STATES.ACTIVE_MONTHLY_10
  );

  const restarted = createAppleSubscriptionService({ values }).service;
  restarted.initialized = false;
  assert.equal(
    restarted.deriveBillingState("ios"),
    BILLING_STATES.ACTIVE_MONTHLY_10
  );
  assert.equal(
    projectSupportPresentation(
      restarted.deriveBillingState("ios"),
      claimed
    ).primaryAction,
    ACTIONS.MANAGE
  );
});

test("simplified Manage renderer hides provider billing detail and raw exceptions", () => {
  const manageRenderer = supporterSource.slice(
    supporterSource.indexOf("function renderSimplifiedSupportActions"),
    supporterSource.indexOf("function renderSimplifiedSupportPage")
  );
  assert.match(manageRenderer, /"Manage Subscription"/);
  assert.match(
    manageRenderer,
    /appendPurchaseButton\(oneTime, oneTime\?\.label \|\| "Keep Reverse Flow Free"\)/
  );
  assert.match(
    manageRenderer,
    /monthly3\?\.label \|\| "Become a Monthly Supporter"/
  );
  assert.match(
    manageRenderer,
    /monthly10\?\.label \|\| "Become a Monthly Supporter"/
  );
  assert.doesNotMatch(
    manageRenderer,
    /presentation|supportEligible|billingState|BILLING_STATES|visibility/
  );
  assert.match(manageRenderer, /openNativeSubscriptionManagement/);
  assert.doesNotMatch(
    manageRenderer,
    /basePlanId|pendingSubscription|upgrade|downgrade/i
  );
  assert.doesNotMatch(manageRenderer, /textContent\s*=\s*error\.message/);
  assert.match(manageRenderer, /safeStoreErrorMessage/);
});

test("native subscription bridge queries current StoreKit entitlements", () => {
  const nativeSource = fs.readFileSync(
    path.join(root, "ios/App/App/SupportPurchaseRecoveryPlugin.swift"),
    "utf8"
  );
  assert.match(nativeSource, /name: "currentSupportSubscriptions"/);
  assert.match(nativeSource, /Transaction\.currentEntitlements/);
  assert.match(nativeSource, /renewalInfo\.autoRenewPreference/);
  assert.match(nativeSource, /renewalInfo\.renewalDate/);
  assert.match(nativeSource, /support_reverse_flow_monthly_10/);
  assert.match(nativeSource, /no-active-support-subscriptions/);
});

test("Apple pending change uses only StoreKit renewal information", async () => {
  const { service } = createAppleSubscriptionService({
    activeProductId: "support_reverse_flow_monthly_10",
    pendingProductId: "support_reverse_flow_monthly_3",
    renewalDate: "2026-07-28T12:00:00.000Z"
  });
  await service.refreshAppleCurrentSubscriptions();

  assert.deepEqual(
    service.getStoreReportedPendingSubscriptionChange("ios"),
    {
      storeReported: true,
      provider: "apple",
      currentProductId: "support_reverse_flow_monthly_10",
      targetProductId: "support_reverse_flow_monthly_3",
      targetBasePlanId: null,
      effectiveDate: "2026-07-28T12:00:00.000Z"
    }
  );
  assert.equal(
    service.deriveBillingState("ios"),
    BILLING_STATES.ACTIVE_MONTHLY_10
  );
});

test("Apple approval is not completed when StoreKit keeps the old product active", async () => {
  const values = new Map();
  const { service } = createAppleSubscriptionService({
    values,
    activeProductId: "support_reverse_flow_monthly_3"
  });
  let finishCalls = 0;
  const evidence = {
    paymentSource: "ios",
    productIdentifier: "support_reverse_flow_monthly_10",
    purchaseType: "monthly",
    monthlyAmount: 10,
    transactionId: "stale-approved-ten",
    purchaseTimestamp: new Date().toISOString(),
    transaction: {
      async finish() {
        finishCalls += 1;
      }
    }
  };

  await assert.rejects(
    service.completeApprovedPurchase(evidence),
    error => error.code === "apple_subscription_not_reconciled"
  );

  assert.equal(finishCalls, 0);
  assert.equal(
    service.authoritativeActiveMonthlyProductId,
    "support_reverse_flow_monthly_3"
  );
  assert.equal(service.completedTransactionKeys.size, 0);
  assert.equal(service.supporterCache.read().isSupporter, false);
  assert.equal(
    JSON.parse(
      values.get("reverse-flow-store-support-history-v2")
    ).lastProductId,
    "support_reverse_flow_monthly_3"
  );
});

test("Apple approval completes only when StoreKit confirms the target active or pending", async () => {
  for (const confirmation of ["active", "pending"]) {
    const target = "support_reverse_flow_monthly_10";
    const { service } = createAppleSubscriptionService({
      activeProductId:
        confirmation === "active"
          ? target
          : "support_reverse_flow_monthly_3",
      pendingProductId: confirmation === "pending" ? target : null,
      renewalDate:
        confirmation === "pending"
          ? "2026-07-28T12:00:00.000Z"
          : null
    });
    let finishCalls = 0;
    const evidence = {
      paymentSource: "ios",
      productIdentifier: target,
      purchaseType: "monthly",
      monthlyAmount: 10,
      transactionId: `confirmed-ten-${confirmation}`,
      purchaseTimestamp: new Date().toISOString(),
      transaction: {
        async finish() {
          finishCalls += 1;
        }
      }
    };

    await service.completeApprovedPurchase(evidence);
    assert.equal(finishCalls, 1);
    assert.equal(service.completedTransactionKeys.size, 1);
    assert.equal(service.supporterCache.read().isSupporter, false);
  }
});

test("pending subscription changes remain internal and are absent from presentation", () => {
  const renderer = supporterSource.slice(
    supporterSource.indexOf("function renderSimplifiedSupportActions"),
    supporterSource.indexOf("function initialize()")
  );
  assert.doesNotMatch(
    renderer,
    /pendingSubscriptionChange|renewalDate|effectiveDate|scheduled/
  );
});

test("Google pending update remains generic for same-product base plans", () => {
  global.Capacitor = { getPlatform: () => "android" };
  const service = new SupportPurchaseService({
    google: {
      monthly3: {
        productId: "support_reverse_flow_subscription",
        basePlanId: "monthly-3"
      },
      monthly10: {
        productId: "support_reverse_flow_subscription",
        basePlanId: "monthly-10"
      }
    }
  }, {
    store: {
      localTransactions: [{
        platform: "android-playstore",
        state: "finished",
        products: [{
          id: "support_reverse_flow_subscription",
          offerId: "support_reverse_flow_subscription@monthly-3"
        }],
        purchaseId: "test-purchase-token",
        purchaseDate: new Date("2026-07-24T12:00:00.000Z"),
        nativePurchase: {
          purchaseToken: "test-purchase-token",
          acknowledged: true,
          autoRenewing: true,
          pendingPurchaseUpdate: {
            productIds: ["support_reverse_flow_subscription"]
          }
        }
      }],
      localReceipts: []
    }
  });
  service.storePlatform = "android-playstore";
  service.initialized = true;

  const change =
    service.getStoreReportedPendingSubscriptionChange("android");
  assert.equal(change.storeReported, true);
  assert.equal(change.currentProductId, "support_reverse_flow_subscription");
  assert.equal(change.targetBasePlanId, null);
  assert.equal(change.effectiveDate, null);
  const presentation = projectSupportPresentation(
    service.deriveBillingState("android"),
    null
  );
  assert.equal(presentation.supportEligible, true);
});
