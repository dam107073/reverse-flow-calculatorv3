const fs = require("node:fs");
const path = require("node:path");

const pluginPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "cordova-plugin-purchase",
  "src",
  "android",
  "cc",
  "fovea",
  "PurchasePlugin.java"
);

if (!fs.existsSync(pluginPath)) {
  throw new Error(`cordova-plugin-purchase Android source not found: ${pluginPath}`);
}

let source = fs.readFileSync(pluginPath, "utf8");
if (source.includes('private static final String RF_BILLING_TAG = "ReverseFlowBilling";')) {
  console.log("Reverse Flow Android purchase diagnostics already applied.");
  process.exit(0);
}

const replacements = [
  [
    '  private final String mTag = "CdvPurchase";',
    '  private final String mTag = "CdvPurchase";\n' +
      '  private static final String RF_BILLING_TAG = "ReverseFlowBilling";'
  ],
  [
    '      } else if ("acknowledgePurchase".equals(action)) {\n' +
      '        final String purchaseToken = data.getString(0);\n' +
      '        acknowledgePurchase(purchaseToken);',
    '      } else if ("acknowledgePurchase".equals(action)) {\n' +
      '        final String purchaseToken = data.getString(0);\n' +
      '        Log.i(RF_BILLING_TAG, "finish requested action=acknowledgePurchase");\n' +
      '        acknowledgePurchase(purchaseToken);'
  ],
  [
    '    Log.d(mTag, "acknowledgePurchase(" + purchaseToken + ")");',
    '    Log.i(RF_BILLING_TAG, "acknowledgePurchase() invoked tokenPresent="\n' +
      '        + (purchaseToken != null && !purchaseToken.isEmpty()));'
  ],
  [
    '    if (result.getResponseCode() == BillingResponseCode.OK) {\n' +
      '      Log.d(mTag, "onAcknowledgePurchaseResponse() -> Success");\n' +
      '      callSuccess();\n' +
      '    }\n' +
      '    else {\n' +
      '      Log.d(mTag, "onAcknowledgePurchaseResponse() -> Failed: "\n' +
      '          + format(result));\n' +
      '      callError(Constants.ERR_FINISH, format(result));\n' +
      '    }',
    '    final int responseCode = result.getResponseCode();\n' +
      '    Log.i(RF_BILLING_TAG, "BillingClient acknowledgement responseCode="\n' +
      '        + responseCode + " debugMessage=" + result.getDebugMessage());\n' +
      '    if (responseCode == BillingResponseCode.OK) {\n' +
      '      Log.i(RF_BILLING_TAG, "acknowledgement success");\n' +
      '      callSuccess();\n' +
      '    }\n' +
      '    else {\n' +
      '      Log.e(RF_BILLING_TAG, "acknowledgement failure responseCode="\n' +
      '          + responseCode + " debugMessage=" + result.getDebugMessage());\n' +
      '      callError(Constants.ERR_FINISH, format(result));\n' +
      '    }'
  ]
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Expected cordova-plugin-purchase source fragment was not found:\n${before}`);
  }
  source = source.replace(before, after);
}

fs.writeFileSync(pluginPath, source);
console.log("Applied Reverse Flow Android purchase diagnostics.");
