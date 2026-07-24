const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const {
  ACTIONS,
  BILLING_STATES,
  CLAIM_STATES,
  SupportPurchaseService,
  normalizeApiResponse,
  resolveSupporterV2State
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
  supporterSince: "2026-07-24",
  isPubliclyListed: true,
  lastVerifiedAt: "2026-07-24T12:00:00.000Z"
};

test("all billing and claim combinations remain independent", () => {
  const billingStates = [
    BILLING_STATES.NEVER_PURCHASED,
    BILLING_STATES.ACTIVE_MONTHLY_3,
    BILLING_STATES.ACTIVE_MONTHLY_10,
    BILLING_STATES.PREVIOUSLY_SUPPORTED,
    BILLING_STATES.BILLING_UNAVAILABLE
  ];
  for (const billingState of billingStates) {
    for (const backend of [null, claimed]) {
      const result = resolveSupporterV2State(billingState, backend);
      const claimedState = backend === claimed;
      const active = [
        BILLING_STATES.ACTIVE_MONTHLY_3,
        BILLING_STATES.ACTIVE_MONTHLY_10
      ].includes(billingState);
      const previouslySupported =
        active || billingState === BILLING_STATES.PREVIOUSLY_SUPPORTED;
      assert.equal(result.billingState, billingState);
      assert.equal(
        result.claimState,
        claimedState ? CLAIM_STATES.CLAIMED : CLAIM_STATES.UNCLAIMED
      );
      assert.equal(result.showBadge, claimedState);
      assert.equal(result.showClaim, !claimedState && previouslySupported);
      assert.equal(result.showManageSupport, active);
      assert.equal(
        result.primaryAction,
        active
          ? ACTIONS.MANAGE
          : billingState === BILLING_STATES.PREVIOUSLY_SUPPORTED
            ? ACTIONS.CONTINUE
            : ACTIONS.BECOME
      );
    }
  }
});

test("backend claim response contains no billing authority", () => {
  const normalized = normalizeApiResponse(claimed);
  assert.equal(normalized.isSupporter, true);
  assert.equal(normalized.name, "Derek Murdock");
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
    supporterSource.indexOf("function renderSupportPageV2"),
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
    resolveSupporterV2State(
      service.deriveBillingState("android"),
      claimed
    ).primaryAction,
    ACTIONS.MANAGE
  );
});
