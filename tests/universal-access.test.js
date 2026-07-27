const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("feature resolver and Tools guard always allow production functionality", () => {
  const entitlement = read("www/js/services/entitlement.js");
  assert.match(entitlement, /function canAccessFeature[\s\S]*return true;/);
  assert.match(entitlement, /function guardToolsAccess[\s\S]*setToolsContentLocked\(false\);[\s\S]*return true;/);
});

test("production save, load, and export paths do not check legacy eligibility", () => {
  const app = read("www/js/app.js");
  const guardedOperationalPath =
    /(?:function\s+|window\.)(savePresets|savePumpCharts|submitPumpChartSaveForm|updateActivePumpChartSetup|saveCurrentSetupAsPreset|openSavePumpChartSheet|loadPumpChartSetup|exportPumpChart)[\s\S]{0,240}if\s*\(!isProUser\(\)\)/;
  assert.doesNotMatch(app, guardedOperationalPath);
});

test("main app exposes one centralized support action and no access ribbons", () => {
  const html = read("www/index.html");
  const settings = read("www/settings.html");
  assert.equal((html.match(/data-support-action/g) || []).length, 1);
  assert.equal((html.match(/data-support-card/g) || []).length, 1);
  assert.match(html, /<\/header>\s*<a[\s\S]*class="support-action-bar"[\s\S]*<\/a>\s*<main>/);
  assert.doesNotMatch(html, /data-support-message|support-eyebrow|support-card-message/);
  assert.doesNotMatch(html, /mode-card-pro|Upgrade to Pro|Restore Purchase|Buy Pro|Go Pro/i);
  for (const surface of [html, settings]) {
    assert.match(
      surface,
      /Reverse Flow is a community project built by firefighters, with firefighters, for firefighters\./
    );
    assert.match(surface, /This app is one outcome of that project/);
  }
});

test("support UI uses one compact action, live store options, and approved copy", () => {
  const supporter = read("www/js/services/supporter.js");
  const supportHtml = read("www/support.html");
  const supportCss = read("www/css/support.css");
  const bundledSupportSources = [
    supporter,
    supportHtml,
    supportCss,
    read("www/index.html")
  ].join("\n");

  assert.match(supporter, /oneTime\?\.label \|\| "One-Time Support"/);
  assert.match(supporter, /monthly3\?\.label \|\| "Monthly Support"/);
  assert.match(supporter, /monthly10\?\.label \|\| "Monthly Support"/);
  assert.match(supporter, /"Manage Subscription"/);
  assert.match(
    supporter,
    /button\.className = "support-primary-action support-purchase-action"/
  );
  assert.match(
    supportHtml,
    /Subscriptions automatically renew unless canceled at least 24 hours before the end of the current billing period\./
  );
  assert.match(supportHtml, /href="https:\/\/reverse-flow\.app\/privacy\.html"[\s\S]*>Privacy Policy<\/a>/);
  assert.match(supportHtml, /href="https:\/\/www\.apple\.com\/legal\/internet-services\/itunes\/dev\/stdeula\/"[\s\S]*>Terms of Use<\/a>/);
  assert.match(supportHtml, /name="publicRecognition" type="checkbox" checked/);
  assert.match(supporter, /supportTitle\.textContent = "Support the Project"/);
  assert.match(
    supporter,
    /supportCopy\.textContent =\s*"If Reverse Flow has helped you, your support helps keep every tool available to the fire service\."/
  );
  assert.doesNotMatch(supporter, /Coming Soon/);
  assert.match(supportHtml, /Be Recognized as a Supporter/);
  assert.match(supportHtml, /Department \/ Organization/);
  assert.match(
    supportHtml,
    /A community project built by firefighters, with firefighters, for firefighters\./
  );
  assert.match(supportHtml, /Community Recognition/);
  assert.match(supportHtml, /View Supporter Registry/);
  assert.match(
    supporter,
    /Join the community helping shape and sustain what Reverse Flow becomes next\./
  );
  assert.doesNotMatch(
    bundledSupportSources,
    /help fund continued development|help fund what comes next|opportunities to influence development|The stores own billing/i
  );
  assert.doesNotMatch(
    `${supportHtml}\n${supporter.slice(
      supporter.indexOf("function renderSimplifiedSupportActions"),
      supporter.indexOf("function initialize()")
    )}`,
    /Continue Supporting|current plan|current support|upgrade|downgrade|scheduled|expiration/i
  );
  assert.doesNotMatch(supporter, /confirmed\.welcomeEmailConfirmed !== true/);
  assert.doesNotMatch(
    supporter,
    /welcome email delivery is not yet confirmed|transaction remains unfinished|StoreKit completion is temporarily unavailable|pending registration could not be saved|recovered purchase could not be prepared/i
  );
  assert.match(supporter, /completeApprovedPurchase/);
  assert.doesNotMatch(
    supporter.slice(
      supporter.indexOf("function renderSimplifiedSupportPage"),
      supporter.indexOf("function initialize()")
    ),
    /registerVerifiedPurchase|verifyPendingPurchase/
  );
  assert.match(supportHtml, /Recognize My Support/);
  assert.match(supportCss, /\.support-action-bar\s*\{[\s\S]*min-height:\s*46px/);
  assert.match(
    supportCss,
    /#supportPage \.page-nav \.nav-button-link\s*\{[\s\S]*min-height:\s*44px/
  );
  assert.match(supportCss, /\.support-primary-action:focus-visible/);
  const retiredAccessPhrase = new RegExp(
    ["production", "tools?"].join("\\s+"),
    "i"
  );
  assert.doesNotMatch(bundledSupportSources, retiredAccessPhrase);
});

test("legacy eligibility alone never renders a Supporter badge", () => {
  const supporter = read("www/js/services/supporter.js");
  assert.match(
    supporter,
    /badge\.hidden = !state\.isSupporter;[\s\S]*if \(state\.isSupporter\)/
  );
  assert.doesNotMatch(
    supporter,
    /badge\.hidden\s*=\s*!state\.hasLegacyProEntitlement/
  );
});

test("Supporter recognition is quiet, non-interactive, and backend-cache gated", () => {
  const supporter = read("www/js/services/supporter.js");
  const supportCss = read("www/css/support.css");
  const headers = [
    read("www/index.html"),
    read("www/support.html"),
    read("www/settings.html"),
    read("www/tools.html")
  ].join("\n");

  assert.match(headers, /<span class="supporter-badge" data-supporter-badge hidden>❤️ Supporter<\/span>/);
  assert.doesNotMatch(headers, /<a class="supporter-badge"/);
  assert.match(supporter, /badge\.hidden = !state\.isSupporter/);
  assert.match(supporter, /badge\.textContent = "❤️ Supporter"/);
  assert.match(supportCss, /\.supporter-badge\s*\{[\s\S]*color:\s*#fff/);
  assert.match(supportCss, /\.supporter-badge\s*\{[\s\S]*border:\s*0/);
  assert.match(supportCss, /\.supporter-badge\s*\{[\s\S]*background:\s*none/);
  assert.match(supportCss, /\.supporter-badge\s*\{[\s\S]*box-shadow:\s*none/);
  assert.match(supportCss, /\.supporter-badge\s*\{[\s\S]*border-radius:\s*0/);
  assert.match(supportCss, /\.app-title-row\s*\{[\s\S]*justify-content:\s*space-between/);
});
