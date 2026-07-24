const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("native iOS and Android packages contain no Meta SDK integration", () => {
  const nativeConfiguration = [
    "ios/App/App/AppDelegate.swift",
    "ios/App/App/Info.plist",
    "ios/App/App.xcodeproj/project.pbxproj",
    "ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved",
    "android/app/build.gradle",
    "android/app/src/main/AndroidManifest.xml"
  ].map(read).join("\n");
  assert.doesNotMatch(
    nativeConfiguration,
    /FacebookCore|FBSDK|MetaAppEvents|FacebookAppID|FacebookClientToken|fb2518836595207186|facebook-ios-sdk/i
  );
  assert.equal(
    fs.existsSync(path.join(root, "ios/App/App/MetaAppEventsPlugin.swift")),
    false
  );
});

test("app JavaScript and privacy copy contain no Meta event bridge", () => {
  const appSources = [
    "www/js/app.js",
    "www/js/constants.js"
  ].map(read).join("\n");
  assert.doesNotMatch(
    appSources,
    /MetaAppEvents|FacebookCore|FacebookAppID|FacebookClientToken|logMetaProPurchaseEvent/i
  );
  const privacy = read("www/privacy.html");
  assert.match(privacy, /Calculator inputs and fireground calculations remain on your device/);
  assert.match(privacy, /Apple App Store and Google Play Billing/);
  assert.match(privacy, /Supabase/);
  assert.match(privacy, /Resend/);
  assert.match(privacy, /do not include the\s+Meta SDK/);
  assert.doesNotMatch(
    privacy,
    /Meta App Events|Facebook Analytics|mobile attribution|App Tracking Transparency/i
  );
});
