const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ACTIONS,
  resolveSupportAction,
  normalizeSupporterRecord,
  SupporterCache,
  isValidEmail
} = require("../www/js/services/supporter.js");

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
    supporterSince: "2026-07-23T00:00:00.000Z",
    source: "legacy-claim",
    contribution: { type: "none", status: "inactive" },
    lastVerifiedAt: "2026-07-23T00:00:01.000Z"
  });

  global.navigator = { onLine: false };
  const retained = cache.retainAfterSyncFailure();
  assert.equal(retained.isSupporter, true);
  assert.equal(retained.syncStatus, "offline");
});

test("claim email validation rejects malformed addresses", () => {
  assert.equal(isValidEmail(" firefighter@example.org "), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(""), false);
});
