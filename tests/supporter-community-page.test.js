const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "www/support.html"), "utf8");
const supporter = fs.readFileSync(
  path.join(root, "www/js/services/supporter.js"),
  "utf8"
);
const supportCss = fs.readFileSync(
  path.join(root, "www/css/support.css"),
  "utf8"
);

test("Supporters page presents community, participation, then optional financial support", () => {
  const community = html.indexOf('data-support-section="community"');
  const participation = html.indexOf('data-support-section="participation"');
  const financial = html.indexOf('data-support-section="financial"');

  assert.ok(community >= 0);
  assert.ok(community < participation);
  assert.ok(participation < financial);
  assert.match(html, /id="supportPageTitle">The Supporter Community<\/h2>/);
  assert.match(html, /Reverse Flow is completely free\./);
  assert.match(html, /Every firefighter has access to every calculator, every tool, and every future feature\./);
  assert.match(html, /The Supporter Community is for firefighters who want to help shape what comes next\./);
  assert.match(html, /Financial support is optional and is not required to join the Supporter Community\./);
});

test("optional support explains operating costs before localized purchase controls", () => {
  const heading = html.indexOf('id="supportSectionTitle">Help Keep Reverse Flow Free');
  const explanation = html.indexOf(
    "Keeping Reverse Flow available requires ongoing costs, including:"
  );
  const options = html.indexOf('id="supportActions"');
  const operatingCosts = [
    "Website hosting",
    "Cloud infrastructure and database services",
    "Apple and Google developer programs",
    "Email services",
    "Testing devices",
    "Development tools"
  ];

  assert.ok(heading >= 0);
  assert.ok(heading < explanation);
  assert.ok(explanation < options);
  assert.match(html, /Reverse Flow has no paid features\./);
  assert.match(html, /Every firefighter has access to every tool\./);
  assert.match(
    html,
    /<strong>Financial contributions first cover these operating costs\.<\/strong>/
  );
  assert.match(
    html,
    /As the project grows, they also make it possible to dedicate more time to building new features, improving existing tools, and expanding the resources available to firefighters everywhere\./
  );
  for (const cost of operatingCosts) {
    assert.match(html, new RegExp(`<li>${cost}</li>`));
  }
  assert.match(
    supportCss,
    /\.support-operating-costs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/
  );
  assert.match(
    supportCss,
    /@media \(max-width: 520px\)[\s\S]*?\.support-operating-costs\s*\{[\s\S]*?grid-template-columns:\s*1fr;/
  );
});

test("hero is informational with Registry as its only restrained action", () => {
  assert.match(
    supportCss,
    /\.support-page-hero h2\s*\{[\s\S]*?font-style:\s*normal;[\s\S]*?text-transform:\s*none;/
  );
  assert.match(
    supportCss,
    /\.support-hero-actions \.support-secondary-action\s*\{[\s\S]*?border-color:\s*transparent;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/
  );
  assert.match(
    supportCss,
    /\.support-hero-actions \.support-secondary-action::after\s*\{[\s\S]*?content:\s*"›";/
  );
  const heroStart = html.indexOf('class="support-page-hero"');
  const heroEnd = html.indexOf("</section>", heroStart);
  const hero = html.slice(heroStart, heroEnd);

  assert.doesNotMatch(hero, /Join the Supporter Community/);
  assert.match(hero, /View the Supporter Registry/);
});

test("registration form contains the page's only Join button", () => {
  assert.match(
    html,
    /id="communityRecognitionSection" data-support-section="participation"/
  );
  assert.match(html, /<h2>Claim Your Supporter Number<\/h2>/);
  assert.equal(
    (html.match(/<button[^>]*>Join the Supporter Community<\/button>/g) || []).length,
    1
  );
  assert.equal((html.match(/>Join the Supporter Community</g) || []).length, 1);
  assert.doesNotMatch(supporter, /joinCommunityAction|data-join-community-link/);
});

test("claimed supporters get a confirmation state, optional permanent number, and registry link", () => {
  const claimedStart = html.indexOf('id="claimedSupporterState"');
  const claimedEnd = html.indexOf("</section>", claimedStart);
  const claimedState = html.slice(claimedStart, claimedEnd);

  assert.match(claimedState, /Thank you for being part of the Supporter Community\./);
  assert.match(claimedState, /id="claimedSupporterNumber"[^>]*hidden/);
  assert.match(claimedState, /View the Supporter Registry/);
  assert.doesNotMatch(claimedState, /Join the Supporter Community/);
  assert.match(supporter, /Supporter Number #\$\{String\(number\)\.padStart\(4, "0"\)\}/);
});

test("community membership remains separate from all store purchase completion", () => {
  const purchaseStart = supporter.indexOf("const completePurchase = async evidence =>");
  const purchaseEnd = supporter.indexOf(
    "renderSimplifiedSupportActions(",
    purchaseStart
  );
  const purchaseCompletion = supporter.slice(purchaseStart, purchaseEnd);

  assert.match(html, /No purchase is required\./);
  assert.match(html, /Keep Reverse Flow Free|id="supportActions"/);
  assert.doesNotMatch(
    purchaseCompletion,
    /claimSupporter|writeConfirmed|registration/
  );
  assert.match(supporter, /registryService\.claimSupporter\(/);
});
