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
    '      Log.d(mTag, "            data -> " + data.toString());',
    '      Log.d(RF_BILLING_TAG, "listener payload type=" + type\n' +
      '          + " payloadPresent=" + (data != null));'
  ],
  [
    '                    Log.d(mTag, "getAvailableProducts() -> productDetails: " + product.toString());',
    '                    Log.d(RF_BILLING_TAG, "product loaded productId=" + product.getProductId());'
  ],
  [
    '        Log.d(mTag, "Product details id@token: " + productIdAndOfferIndexArray + " === " + productId + "@" + offerToken + " ... " + productDetails.toString());',
    '        Log.d(RF_BILLING_TAG, "purchase offer selected productId=" + productId\n' +
      '            + " offerPresent=" + (offerToken != null));'
  ],
  [
    '    String oldPurchaseToken = null;\n' +
      '    if (additionalData.has("oldPurchaseToken")) {\n' +
      '      oldPurchaseToken = additionalData.getString("oldPurchaseToken");\n' +
      '    }',
    '    String oldPurchaseToken = null;\n' +
      '    if (additionalData.has("oldPurchaseToken")) {\n' +
      '      oldPurchaseToken = additionalData.getString("oldPurchaseToken");\n' +
      '    }\n' +
      '    final boolean replacementRequired = additionalData.optBoolean(\n' +
      '        "replacementRequired", false);\n' +
      '    final String oldProductId = additionalData.optString(\n' +
      '        "oldProductId", "unknown");'
  ],
  [
    '    if (hasSubscriptionUpdateParams) {\n' +
      '      params.setSubscriptionUpdateParams(subscriptionUpdateParams.build());\n' +
      '    }',
    '    if (replacementRequired && (oldPurchaseToken == null\n' +
      '        || oldPurchaseToken.isEmpty() || replacementMode == null)) {\n' +
      '      Log.e(RF_BILLING_TAG, "subscription replacement blocked oldProductId="\n' +
      '          + oldProductId + " targetProductId=" + productId\n' +
      '          + " tokenPresent=" + (oldPurchaseToken != null\n' +
      '          && !oldPurchaseToken.isEmpty()) + " modePresent="\n' +
      '          + (replacementMode != null));\n' +
      '      callError(Constants.ERR_PURCHASE,\n' +
      '          "Subscription replacement parameters are incomplete.");\n' +
      '      return null;\n' +
      '    }\n' +
      '    if (hasSubscriptionUpdateParams) {\n' +
      '      params.setSubscriptionUpdateParams(subscriptionUpdateParams.build());\n' +
      '      Log.i(RF_BILLING_TAG, "subscription replacement configured oldProductId="\n' +
      '          + oldProductId + " targetProductId=" + productId\n' +
      '          + " replacementMode=" + replacementMode\n' +
      '          + " tokenPresent=true");\n' +
      '    }'
  ],
  [
    '    Log.d(mTag, "consumePurchase(" + purchaseToken + ")");',
    '    Log.i(RF_BILLING_TAG, "consumePurchase() invoked tokenPresent="\n' +
      '        + (purchaseToken != null && !purchaseToken.isEmpty()));'
  ],
  [
    '        mPurchases.clear();\n' +
      '        mPurchases.addAll(purchases);\n' +
      '        sendToListener("setPurchases", new JSONObject()',
    '        mPurchases.clear();\n' +
      '        mPurchases.addAll(purchases);\n' +
      '        logPurchaseState("query", purchases);\n' +
      '        sendToListener("setPurchases", new JSONObject()'
  ],
  [
    '        for (Purchase p : purchases) {\n' +
      '          mPurchases.add(0, p);\n' +
      '        }\n' +
      '        callSuccess();',
    '        for (Purchase p : purchases) {\n' +
      '          mPurchases.add(0, p);\n' +
      '        }\n' +
      '        logPurchaseState("update", purchases);\n' +
      '        callSuccess();'
  ],
  [
    '  // Convert list of purchases to JSON\n' +
      '  private JSONArray toJSON(final List<Purchase> purchaseList) throws JSONException {',
    '  private void logPurchaseState(final String stage,\n' +
      '      final List<Purchase> purchases) {\n' +
      '    Log.i(RF_BILLING_TAG, "purchase state stage=" + stage\n' +
      '        + " count=" + purchases.size());\n' +
      '    for (Purchase purchase : purchases) {\n' +
      '      for (String productId : purchase.getProducts()) {\n' +
      '        Log.i(RF_BILLING_TAG, "purchase state stage=" + stage\n' +
      '            + " productId=" + productId\n' +
      '            + " state=" + purchase.getPurchaseState()\n' +
      '            + " acknowledged=" + purchase.isAcknowledged()\n' +
      '            + " autoRenewing=" + purchase.isAutoRenewing());\n' +
      '      }\n' +
      '    }\n' +
      '  }\n\n' +
      '  // Convert list of purchases to JSON\n' +
      '  private JSONArray toJSON(final List<Purchase> purchaseList) throws JSONException {'
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
  if (source.includes(after)) continue;
  if (!source.includes(before)) {
    throw new Error(`Expected cordova-plugin-purchase source fragment was not found:\n${before}`);
  }
  source = source.replace(before, after);
}

fs.writeFileSync(pluginPath, source);
console.log("Applied privacy-safe Reverse Flow Android purchase diagnostics.");
