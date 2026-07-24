const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ACTIONS,
  SUPPORT_UI_STATES,
  resolveSupportAction,
  resolveSupporterUiPresentation,
  normalizeSupporterRecord,
  SupporterCache,
  SupportPurchaseService,
  recoverSupporterIdentity,
  isValidEmail
} = require("../www/js/services/supporter.js");

const confirmedSubscriber = {
  isSupporter: true,
  hasActiveRecurringSupport: true,
  supporterSince: "2026-07-23",
  lastVerifiedAt: "2026-07-24T00:00:00.000Z",
  contribution: {
    type: "monthly",
    status: "active",
    monthlyAmount: 10,
    productId: "support_reverse_flow_monthly_10"
  }
};

test("support action resolver returns exactly one action for every v1 state", () => {
  const cases = [
    [{}, ACTIONS.BECOME],
    [{ hasLegacyProEntitlement: true }, ACTIONS.CLAIM],
    [{ isSupporter: true }, ACTIONS.CONTINUE],
    [
      { isSupporter: true, hasActiveRecurringSupport: true, hasLegacyProEntitlement: true },
      ACTIONS.MANAGE
    ]
  ];

  for (const [state, expected] of cases) {
    const action = resolveSupportAction(state);
    assert.equal(action, expected);
    assert.equal(typeof action, "string");
    assert.ok(Object.values(ACTIONS).includes(action));
  }
});

test("confirmed Supporter takes precedence over unclaimed legacy eligibility", () => {
  assert.equal(
    resolveSupportAction({
      isSupporter: true,
      hasActiveRecurringSupport: false,
      hasLegacyProEntitlement: true
    }),
    ACTIONS.CONTINUE
  );
});

test("confirmed subscriber presentation remains Manage during refresh and purchase", () => {
  for (const phase of [
    SUPPORT_UI_STATES.SUPPORTER_REFRESHING,
    SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
  ]) {
    const presentation = resolveSupporterUiPresentation(
      confirmedSubscriber,
      {
        phase,
        lastConfirmedState: confirmedSubscriber,
        lastConfirmedAction: ACTIONS.MANAGE
      }
    );
    assert.equal(presentation.uiState, phase);
    assert.equal(presentation.state.isSupporter, true);
    assert.equal(presentation.action, ACTIONS.MANAGE);
  }
});

test("transient unknown state cannot replace a confirmed Supporter presentation", () => {
  const presentation = resolveSupporterUiPresentation(
    normalizeSupporterRecord(null),
    {
      phase: SUPPORT_UI_STATES.SUPPORTER_REFRESHING,
      lastConfirmedState: confirmedSubscriber,
      lastConfirmedAction: ACTIONS.MANAGE
    }
  );
  assert.equal(presentation.uiState, SUPPORT_UI_STATES.SUPPORTER_REFRESHING);
  assert.equal(presentation.state.isSupporter, true);
  assert.equal(presentation.action, ACTIONS.MANAGE);
});

test("clean user and purchase-in-progress remain distinct non-Supporter states", () => {
  const cleanState = normalizeSupporterRecord(null);
  assert.equal(
    resolveSupporterUiPresentation(cleanState).uiState,
    SUPPORT_UI_STATES.NOT_SUPPORTER
  );
  assert.equal(
    resolveSupporterUiPresentation(cleanState, {
      phase: SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
    }).uiState,
    SUPPORT_UI_STATES.PURCHASE_IN_PROGRESS
  );
});

test("slow reconciliation keeps a cached subscriber on Manage until it settles", async () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  const cache = new SupporterCache(storage);
  cache.writeConfirmed(confirmedSubscriber, {
    email: "firefighter@example.com",
    platform: "android"
  });
  const service = new SupportPurchaseService({}, {
    storage,
    supporterCache: cache
  });
  assert.equal(
    service.observeSupporterState(cache.read()).action,
    ACTIONS.MANAGE
  );

  let finishRefresh;
  const refresh = service.refreshConfirmedSupporter(() =>
    new Promise(resolve => {
      finishRefresh = resolve;
    })
  );
  const whileSlow = service.observeSupporterState(cache.read());
  assert.equal(whileSlow.uiState, SUPPORT_UI_STATES.SUPPORTER_REFRESHING);
  assert.equal(whileSlow.action, ACTIONS.MANAGE);
  assert.equal(whileSlow.state.isSupporter, true);

  finishRefresh();
  await refresh;
  const settled = service.observeSupporterState(cache.read());
  assert.equal(settled.uiState, SUPPORT_UI_STATES.SUPPORTER);
  assert.equal(settled.action, ACTIONS.MANAGE);
});

test("ended recurring support retains Supporter status and continues supporting", () => {
  const state = normalizeSupporterRecord({
    isSupporter: true,
    supporterSince: "2026-07-23T00:00:00.000Z",
    contribution: { type: "monthly", status: "expired", monthlyAmount: 3 }
  });
  assert.equal(state.isSupporter, true);
  assert.equal(state.hasActiveRecurringSupport, false);
  assert.equal(resolveSupportAction(state), ACTIONS.CONTINUE);
});

test("cache accepts only confirmed records and survives sync failure", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const cache = new SupporterCache(storage, "test-supporter-cache");

  assert.throws(
    () => cache.writeConfirmed({ isSupporter: true }),
    /registry-confirmed/
  );

  cache.writeConfirmed({
    isSupporter: true,
    supporterSince: "2026-07-23",
    source: "legacy-claim",
    contribution: { type: "none", status: "inactive" },
    lastVerifiedAt: "2026-07-23T00:00:01.000Z"
  });

  const retained = cache.retainAfterSyncFailure(false);
  assert.equal(retained.isSupporter, true);
  assert.equal(retained.syncStatus, "offline");
});

test("cache keeps the newest confirmed response and supporter identity survives restart", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const cache = new SupporterCache(storage, "test-supporter-cache");
  cache.writeConfirmed({
    isSupporter: true,
    supporterSince: "2021-04-08",
    source: "legacy_apple",
    hasActiveRecurringSupport: false,
    recurringStatus: "inactive",
    emailHash: "a".repeat(64),
    lastVerifiedAt: "2026-07-23T18:00:02.000Z"
  }, { email: " Firefighter@Example.org ", platform: "ios" });
  cache.writeConfirmed({
    isSupporter: true,
    supporterSince: "2026-07-23",
    source: "legacy_apple",
    hasActiveRecurringSupport: false,
    recurringStatus: "inactive",
    lastVerifiedAt: "2026-07-23T18:00:01.000Z"
  });

  const restarted = new SupporterCache(storage, "test-supporter-cache").read();
  assert.equal(restarted.supporterSince, "2021-04-08");
  assert.equal(restarted.supporterEmail, "firefighter@example.org");
  assert.equal(restarted.emailHash, "a".repeat(64));
  assert.equal(restarted.platform, "ios");
});

test("claim email validation rejects malformed addresses", () => {
  assert.equal(isValidEmail(" firefighter@example.org "), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(""), false);
});

test("Supporter identity recovery is provider-agnostic across app platforms", async () => {
  const cases = [
    ["stripe", "ios", "2024-01-02"],
    ["apple", "android", "2024-02-03"],
    ["google", "android", "2024-03-04"],
    ["legacy_apple", "ios", "2020-04-05"]
  ];

  for (const [source, currentPlatform, supporterSince] of cases) {
    const values = new Map();
    const cache = new SupporterCache({
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value)
    }, `provider-neutral-${source}-${currentPlatform}`);
    let lookupEmail = null;
    const recovery = await recoverSupporterIdentity(
      cache,
      {
        async getStatus(email) {
          lookupEmail = email;
          return {
            isSupporter: true,
            supporterSince,
            source,
            hasActiveRecurringSupport: false,
            recurringStatus: "inactive",
            contribution: {
              type: "none",
              status: "inactive",
              platform: source
            },
            lastVerifiedAt: "2026-07-24T17:00:00.000Z"
          };
        }
      },
      " Supporter@Example.com ",
      currentPlatform
    );

    assert.equal(lookupEmail, "supporter@example.com");
    assert.equal(recovery.recovered, true);
    assert.equal(recovery.record.isSupporter, true);
    assert.equal(recovery.record.source, source);
    assert.equal(recovery.record.platform, currentPlatform);
  }
});

test("expired monthly support retains permanent identity after recovery", async () => {
  const values = new Map();
  const cache = new SupporterCache({
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  }, "expired-provider-neutral");
  const recovery = await recoverSupporterIdentity(
    cache,
    {
      async getStatus() {
        return {
          isSupporter: true,
          supporterSince: "2024-01-02",
          source: "stripe",
          hasActiveRecurringSupport: false,
          recurringStatus: "expired",
          contribution: {
            type: "monthly",
            status: "expired",
            platform: "stripe"
          },
          lastVerifiedAt: "2026-07-24T17:00:00.000Z"
        };
      }
    },
    "supporter@example.com",
    "android"
  );

  assert.equal(recovery.record.isSupporter, true);
  assert.equal(recovery.record.hasActiveRecurringSupport, false);
  assert.equal(recovery.record.recurringStatus, "expired");
  assert.equal(resolveSupportAction(recovery.record), ACTIONS.CONTINUE);
});
