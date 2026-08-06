const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const supporter = require("../www/js/services/supporter.js");

function renderFor(state) {
  const attributes = {};
  const banner = {
    dataset: {},
    hidden: true,
    href: "",
    textContent: "",
    matches: selector => selector === "[data-support-action]",
    querySelector: () => null,
    setAttribute: (name, value) => { attributes[name] = value; }
  };
  const badge = {
    hidden: true,
    textContent: "",
    setAttribute() {}
  };
  global.document = {
    querySelectorAll(selector) {
      if (selector === "[data-support-card]") return [banner];
      if (selector === "[data-supporter-badge]") return [badge];
      return [];
    }
  };
  supporter.renderSharedSupportUi({ read: () => state }, state);
  delete global.document;
  return { banner, attributes };
}

const scenarios = [
  ["never joined", { isSupporter: false, supportEligible: false }],
  ["verified supporter", { isSupporter: true, supportEligible: true }],
  ["existing donor", { isSupporter: false, supportEligible: true }],
  ["unknown/loading", {}],
  ["offline", { isSupporter: false, stale: true, offline: true }],
  ["cached supporter", { isSupporter: true, source: "cache" }],
  ["fresh iOS install", { platform: "ios" }],
  ["fresh Android install", { platform: "android" }]
];

for (const [name, state] of scenarios) {
  test(`Supporters banner is state-free for ${name}`, () => {
    const { banner, attributes } = renderFor(state);
    assert.equal(banner.textContent, "The Supporter Community");
    assert.equal(banner.href, "support.html");
    assert.equal(banner.hidden, false);
    assert.equal(attributes["aria-label"], "The Supporter Community. Open the Supporters screen.");
    assert.deepEqual(banner.dataset, {});
  });
}

test("initial HTML renders the same banner before supporter JavaScript runs", () => {
  const html = fs.readFileSync(path.join(root, "www/index.html"), "utf8");
  const banner = html.match(/<a\s+[\s\S]*?class="support-action-bar"[\s\S]*?<\/a>/)?.[0] || "";
  assert.match(banner, /href="support\.html"/);
  assert.match(banner, />The Supporter Community<\/a>/);
  assert.doesNotMatch(banner, /hidden|Manage Support|Become a Supporter/);
});

test("the public Supporter Registry action is unconditional and canonical", () => {
  const html = fs.readFileSync(path.join(root, "www/support.html"), "utf8");
  const action = html.match(/<a\s+[\s\S]*?data-public-supporters-link[\s\S]*?<\/a>/)?.[0] || "";
  const unclaimedStart = html.indexOf('id="unclaimedSupporterState"');
  const claimedStart = html.indexOf('id="claimedSupporterState"');

  assert.ok(action, "the public Supporters action should render in static HTML");
  assert.match(action, /href="https:\/\/reverse-flow\.app\/supporters\/"/);
  assert.match(action, /target="_blank"/);
  assert.match(action, /rel="noopener noreferrer external"/);
  assert.match(action, />View the Supporter Registry<\/a>/);
  assert.doesNotMatch(action, /\bhidden\b|disabled|data-supporter|data-entitlement|data-claim/);
  assert.ok(html.indexOf("data-public-supporters-link") < unclaimedStart);
  assert.ok(html.indexOf("data-public-supporters-link") < claimedStart);
  assert.ok((html.match(/https:\/\/reverse-flow\.app\/supporters\//g) || []).length >= 2);
});

test("banner renderer contains no entitlement or action-state projection", () => {
  const source = fs.readFileSync(path.join(root, "www/js/services/supporter.js"), "utf8");
  const renderer = source.slice(source.indexOf("function renderSharedSupportUi"), source.indexOf("async function refreshSupporterStatus"));
  assert.doesNotMatch(renderer, /resolveSupportAction|supportEligible|ACTION_CONTENT|supportActionState|getActionUrl|platform|loading|offline/);
  assert.match(renderer, /SUPPORT_BANNER\.label/);
  assert.match(renderer, /SUPPORT_BANNER\.href/);
});
