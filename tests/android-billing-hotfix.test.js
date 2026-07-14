const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appPath = path.join(__dirname, "..", "www", "js", "app.js");
const source = fs.readFileSync(appPath, "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(") {", start));
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
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
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unable to extract ${name}`);
}

function loadAssessment() {
  const context = {
    REVERSE_FLOW_PRO_PRODUCT_ID: "reverse_flow_pro_lifetime",
    window: {
      CdvPurchase: {
        Platform: { GOOGLE_PLAY: "android-playstore" },
        TransactionState: {
          APPROVED: "approved",
          PENDING: "pending",
          CANCELLED: "cancelled",
          FINISHED: "finished"
        }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(`${extractFunction("getAndroidProTransactionAssessment")}; this.assess = getAndroidProTransactionAssessment;`, context);
  return context.assess;
}

function makeTransaction(overrides = {}) {
  return {
    platform: "android-playstore",
    state: "approved",
    isPending: false,
    isAcknowledged: false,
    products: [{ id: "reverse_flow_pro_lifetime" }],
    transactionId: "GPA.1234-5678-9012-34567",
    ...overrides
  };
}

function loadProcessor(overrides = {}) {
  const calls = [];
  const context = {
    REVERSE_FLOW_PRO_PRODUCT_ID: "reverse_flow_pro_lifetime",
    reverseFlowPurchaseInProgress: true,
    reverseFlowRestoreInProgress: false,
    androidProAckInFlight: new Map(),
    androidProAckSessionAttempts: new Map(),
    window: {
      CdvPurchase: {
        Platform: { GOOGLE_PLAY: "android-playstore" },
        TransactionState: {
          APPROVED: "approved",
          PENDING: "pending",
          CANCELLED: "cancelled",
          FINISHED: "finished"
        }
      }
    },
    console: {
      info: (...args) => calls.push(["info", ...args]),
      warn: (...args) => calls.push(["warn", ...args])
    },
    isProUser: () => false,
    redactAndroidTransactionId: () => "...34567",
    getAndroidProTransactionKey: transaction => transaction.transactionId,
    persistAndroidProEntitlement: () => {
      calls.push(["persist"]);
      return true;
    },
    clearAndroidProAckRetryState: () => calls.push(["clear-retry"]),
    writeAndroidProAckRetryState: () => calls.push(["write-retry"]),
    scheduleAndroidProAckRetry: () => calls.push(["schedule-retry"]),
    waitForAndroidAcknowledgementConfirmation: async () => {
      calls.push(["wait-confirmation"]);
      return true;
    },
    completeAndroidProTransactionUi: () => calls.push(["complete-ui"]),
    syncAndroidProEntitlementUi: () => calls.push(["sync-ui"]),
    updateBuyProButtonState: state => calls.push(["button", state]),
    alert: message => calls.push(["alert", message]),
    Promise,
    Boolean,
    ...overrides
  };
  vm.createContext(context);
  const processorSource = extractFunction("processAndroidProTransaction")
    .replace(/^function /, "async function ");
  vm.runInContext(
    `${extractFunction("getAndroidProTransactionAssessment")};` +
    `${extractFunction("acknowledgeAndroidProDirectly")};` +
    `${processorSource};` +
    "this.process = processAndroidProTransaction;",
    context
  );
  return { process: context.process, calls, context };
}

test("only an exact approved unacknowledged Google Play purchase is finalized", () => {
  const assess = loadAssessment();
  assert.equal(assess(makeTransaction()).shouldAcknowledge, true);
  assert.equal(assess(makeTransaction({ products: [{ id: "wrong_product" }] })).shouldAcknowledge, false);
  assert.equal(assess(makeTransaction({ state: "pending", isPending: true })).shouldAcknowledge, false);
  assert.equal(assess(makeTransaction({ state: "cancelled" })).shouldAcknowledge, false);
  assert.equal(assess(makeTransaction({ isAcknowledged: true })).shouldAcknowledge, false);
  assert.equal(assess(makeTransaction({ state: "finished" })).shouldAcknowledge, false);
});

test("Android approved callback bypasses empty validator receipts and processes the exact transaction", () => {
  const approvedStart = source.indexOf(".approved(transaction => {");
  const verifiedStart = source.indexOf(".verified(receipt => {", approvedStart);
  const approvedHandler = source.slice(approvedStart, verifiedStart);
  assert.match(approvedHandler, /androidAssessment\.isGooglePlay/);
  assert.match(approvedHandler, /processAndroidProTransaction\(store, transaction/);
  assert.match(approvedHandler, /return;[\s\S]*transaction\.verify\(\)/);
});

test("entitlement is confirmed before exact transaction finalization and success UI", () => {
  const processor = extractFunction("processAndroidProTransaction");
  const persistIndex = processor.indexOf("persistAndroidProEntitlement(transaction, trigger)");
  const finishIndex = processor.indexOf("transaction.finish()");
  const confirmationIndex = processor.indexOf("waitForAndroidAcknowledgementConfirmation(transaction)");
  const successIndex = processor.lastIndexOf("completeAndroidProTransactionUi");
  assert.ok(persistIndex > -1);
  assert.ok(finishIndex > persistIndex);
  assert.ok(confirmationIndex > finishIndex);
  assert.ok(successIndex > confirmationIndex);
  assert.doesNotMatch(processor, /consumePurchase|\.consume\(/);
});

test("valid Android purchase persists, finishes, confirms, then completes UI", async () => {
  const { process, calls } = loadProcessor();
  const transaction = makeTransaction({
    finish: async () => calls.push(["finish"])
  });
  assert.equal(await process({}, transaction, { purchase: true }), true);
  const sequence = calls.map(call => call[0]);
  assert.ok(sequence.indexOf("persist") < sequence.indexOf("finish"));
  assert.ok(sequence.indexOf("finish") < sequence.indexOf("wait-confirmation"));
  assert.ok(sequence.indexOf("wait-confirmation") < sequence.indexOf("complete-ui"));
});

test("direct Android acknowledgement invokes the native Cordova action and waits for success", async () => {
  const nativeCalls = [];
  const { process, calls } = loadProcessor({
    window: {
      CdvPurchase: {
        Platform: { GOOGLE_PLAY: "android-playstore" },
        TransactionState: {
          APPROVED: "approved",
          PENDING: "pending",
          CANCELLED: "cancelled",
          FINISHED: "finished"
        }
      },
      cordova: {
        exec(success, _failure, service, action, args) {
          nativeCalls.push({ service, action, args });
          success();
        }
      }
    }
  });
  const transaction = makeTransaction({
    purchaseId: "test-purchase-token",
    finish: async () => calls.push(["abstract-finish"])
  });
  assert.equal(await process({}, transaction, { purchase: true }), true);
  assert.equal(nativeCalls.length, 1);
  assert.equal(nativeCalls[0].service, "InAppBillingPlugin");
  assert.equal(nativeCalls[0].action, "acknowledgePurchase");
  assert.equal(nativeCalls[0].args.length, 1);
  assert.equal(nativeCalls[0].args[0], "test-purchase-token");
  assert.equal(transaction.isAcknowledged, true);
  assert.equal(calls.some(call => call[0] === "abstract-finish"), false);
  assert.equal(calls.some(call => call[0] === "complete-ui"), true);
});

test("native acknowledgement failure is logged, remains retryable, and never shows success", async () => {
  const { process, calls } = loadProcessor({
    window: {
      CdvPurchase: {
        Platform: { GOOGLE_PLAY: "android-playstore" },
        TransactionState: {
          APPROVED: "approved",
          PENDING: "pending",
          CANCELLED: "cancelled",
          FINISHED: "finished"
        }
      },
      cordova: {
        exec(_success, failure) {
          failure({ code: 6777003, message: "BillingClient unavailable" });
        }
      }
    }
  });
  const transaction = makeTransaction({ purchaseId: "test-purchase-token" });
  assert.equal(await process({}, transaction, { purchase: true }), false);
  assert.equal(transaction.isAcknowledged, false);
  assert.equal(calls.some(call => call[0] === "schedule-retry"), true);
  assert.equal(calls.some(call => call[0] === "complete-ui"), false);
  assert.equal(
    calls.some(call => call[0] === "warn" && call[2]?.event === "android-native-acknowledgement-failed"),
    true
  );
});

test("persistence failure never finalizes and schedules recovery", async () => {
  const { process, calls } = loadProcessor({
    persistAndroidProEntitlement: () => {
      calls.push(["persist-failed"]);
      return false;
    }
  });
  const transaction = makeTransaction({
    finish: async () => calls.push(["finish"])
  });
  assert.equal(await process({}, transaction, { purchase: true }), false);
  assert.equal(calls.some(call => call[0] === "finish"), false);
  assert.equal(calls.some(call => call[0] === "schedule-retry"), true);
  assert.equal(calls.some(call => call[0] === "complete-ui"), false);
});

test("acknowledgement timeout retains Pro and schedules bounded retry", async () => {
  const { process, calls } = loadProcessor({
    waitForAndroidAcknowledgementConfirmation: async () => false
  });
  const transaction = makeTransaction({
    finish: async () => calls.push(["finish"])
  });
  assert.equal(await process({}, transaction, { purchase: true }), false);
  assert.equal(calls.some(call => call[0] === "finish"), true);
  assert.equal(calls.some(call => call[0] === "schedule-retry"), true);
  assert.equal(calls.some(call => call[0] === "complete-ui"), false);
  assert.equal(calls.some(call => call[0] === "button" && call[1] === "confirmationPending"), true);
});

test("already acknowledged restore grants without finishing again", async () => {
  const { process, calls } = loadProcessor({
    reverseFlowPurchaseInProgress: false,
    reverseFlowRestoreInProgress: true
  });
  const transaction = makeTransaction({
    isAcknowledged: true,
    finish: async () => calls.push(["finish"])
  });
  assert.equal(await process({}, transaction, { restore: true }), true);
  assert.equal(calls.some(call => call[0] === "persist"), true);
  assert.equal(calls.some(call => call[0] === "finish"), false);
  assert.equal(calls.some(call => call[0] === "complete-ui"), true);
});

test("failed persistence and acknowledgement timeout stay retryable without false success", () => {
  const processor = extractFunction("processAndroidProTransaction");
  assert.match(processor, /android-entitlement-persist-failed|persistAndroidProEntitlement/);
  assert.match(processor, /scheduleAndroidProAckRetry/);
  assert.match(processor, /android-acknowledgement-timeout/);
  assert.match(processor, /confirmationPending/);
});

test("startup, receipt refresh, restore, and resume all trigger Android recovery", () => {
  assert.match(source, /\.receiptsReady\(\(\) => \{[\s\S]*recoverAndroidProTransactions/);
  assert.match(source, /\.receiptUpdated\(receipt => \{[\s\S]*recoverAndroidProTransactions/);
  assert.match(source, /document\.addEventListener\("resume"[\s\S]*recoverAndroidProTransactions/);
  assert.match(source, /support-page-restore-complete[\s\S]*recoverAndroidProTransactions/);
  assert.match(source, /trigger: "restore-complete"[\s\S]*restore: true/);
});

test("iOS keeps the existing verify and receipt finish path", () => {
  assert.match(source, /transaction\.verify\(\)/);
  assert.match(source, /Promise\.resolve\(receipt\.finish\(\)\)/);
  assert.match(source, /platform !== "ios"/);
});

test("native plugin diagnostics are reproducibly patched", () => {
  const pluginSource = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "node_modules",
      "cordova-plugin-purchase",
      "src",
      "android",
      "cc",
      "fovea",
      "PurchasePlugin.java"
    ),
    "utf8"
  );
  assert.match(pluginSource, /ReverseFlowBilling/);
  assert.match(pluginSource, /finish requested action=acknowledgePurchase/);
  assert.match(pluginSource, /BillingClient acknowledgement responseCode=/);
  assert.match(pluginSource, /acknowledgement success/);
  assert.match(pluginSource, /acknowledgement failure responseCode=/);
  assert.doesNotMatch(pluginSource, /acknowledgePurchase\(" \+ purchaseToken/);
});
