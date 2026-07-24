# Reverse Flow Community-Supported Platform Migration

## Pass 1 — App Transition completion report

Date: July 23, 2026  
Scope: iOS and Android app code only; no submission, deployment, or public-production modification

> Reverse Flow is a community-supported platform built by firefighters, with firefighters, for the fire service. Every firefighter has access to every tool. Supporters help build what comes next.

## Completion status

Pass 1 app architecture and UI are implemented. Tools no longer depend on purchase or entitlement state. Legacy purchase recognition remains solely as Supporter-claim eligibility. The registry and new store products are intentionally unavailable until later passes, and no local path fabricates a purchase or registry confirmation.

## 1. Feature gates removed

- Calculator-mode gating removed for Relay Pumping, Split Lay, Wye Ops, Apparatus Mounted, and Standpipe Ops.
- Tools page and Tools navigation guards now always expose content and never redirect.
- Pump Chart open, create, save, update, load, and export checks removed.
- Pump Operator Package export checks removed through the Pump Chart export path.
- Preset and saved-setup write checks removed.
- Startup/session restoration no longer changes a selected mode based on entitlement.
- `canAccessFeature()` now returns universal access for every defined production feature.
- Purchase resolution is not awaited before calculators or Tools initialize.

## 2. User-facing presentation removed

- Removed feature ribbons, lock treatment, access badges, upgrade modal content, purchase-recovery settings, web purchase banners, locked Tools messaging, and all production-feature purchase prompts.
- Replaced “Tools (Pro)” and related descriptions with universal-access copy.
- No user-facing `PRO`, `Premium`, `Upgrade`, `Unlock`, `Restore Purchase`, `Buy PRO`, `Go PRO`, or paywall copy remains in app HTML.

## 3. Files changed

### App source and UI

- `www/index.html`
- `www/support.html`
- `www/settings.html`
- `www/tools.html`
- `www/references.html`
- `www/resources.html`
- `www/privacy.html`
- `www/css/base.css`
- `www/css/components.css`
- `www/css/responsive.css`
- `www/css/support.css`
- `www/js/app.js`
- `www/js/constants.js`
- `www/js/services/entitlement.js`
- `www/js/services/supporter.js`

### Tests, configuration, and documentation

- `package.json`
- `tests/supporter-state.test.js`
- `tests/universal-access.test.js`
- `docs/community-supported-app-migration.md`
- `outputs/community-supported-platform-pass1-app-transition-report.md`

Capacitor copied the exact `www/` source into the generated iOS and Android public asset bundles. These generated paths are ignored by Git but were byte-compared for `index.html` and `supporter.js`.

## 4–6. Legacy Apple and Google purchase detection

- Apple: `cordova-plugin-purchase`, App Store registration, verified-receipt inspection, exact product matching, SDK ownership checks, and receipt finalization remain.
- Google: purchase history/transaction recovery, exact product matching, purchase token/transaction evidence, acknowledgement, bounded acknowledgement retry, and resume refresh remain.
- Passive verified ownership may now establish legacy eligibility on a fresh installation; it does not unlock or alter any tool.
- Eligibility is exposed through `hasLegacyProEntitlement()` and evidence through `getLegacyProEntitlementEvidence()`.
- The unchanged legacy store product identifier is `reverse_flow_pro_lifetime`.

## 7–9. State model and single-action resolver

`www/js/services/supporter.js` separates:

- universal feature access;
- verified legacy eligibility;
- permanent Supporter identity;
- current contribution type/status/platform/amount.

`resolveSupportAction()` returns exactly one of:

1. `manage-support`
2. `continue-supporting`
3. `claim-supporter-status`
4. `become-supporter`

Automated coverage proves all four states, precedence, ended-recurring behavior, and that the main app renders one support-action link.

## 10–11. Prominent card and badge

- A dedicated community-support card sits directly below the main header.
- It uses a reserved amber/orange treatment, strong hierarchy, one restrained entrance transition, and a single state-appropriate action.
- At 390×844 in light and dark mode, browser QA found zero horizontal overflow and no console errors.
- The small Supporter badge is beside the title, hidden for regular and unclaimed legacy users, linked to the resolved destination, and protected from wrapping.

## 12. Claim Supporter Status

Implemented:

- dedicated claim page state;
- full name and email collection;
- trimming, email validation, loading lock, online requirement, error status, and duplicate-submit prevention;
- payload preparation with platform, legacy product ID, verified eligibility, transaction/token evidence where available, app version, and timestamp.

Intentionally deferred:

- registry submission and confirmation. The production placeholder throws an explicit unavailable error and never caches or displays a confirmed Supporter.

## 13–15. Support pages

- Become a Supporter: implemented with voluntary-support and universal-access copy plus equal-status options.
- Continue Supporting: implemented with acknowledgement copy and the same three options.
- Manage Support: implemented with verified contribution details, contribution-change/additional-support options, and a platform-native subscription-management abstraction.
- The three store options are visible but disabled while product identifiers are unconfigured.

## 16–18. Service boundaries and offline cache

- `SupportPurchaseService`: centralized product lookup, verified-purchase boundary, and native subscription-management boundary.
- `SupporterRegistryService`: status, legacy claim, and verified-purchase registration boundaries.
- `SupporterCache`: accepts only confirmed records containing `lastVerifiedAt`.
- Refresh failure retains the last confirmed record and marks it stale/offline; it never downgrades Supporter status.
- All calculators, saved data, exports, references, and settings remain independent of registry, store, and network availability.

## 19–21. Deferred backend and store configuration

- Supabase Supporter Registry: intentionally not implemented.
- Apple identifiers still required: one-time $5, monthly $3, monthly $10.
- Google identifiers still required: one-time $5, monthly $3, monthly $10.
- All six values remain explicit `null` placeholders in `SUPPORT_PRODUCT_CONFIG`; no identifiers were invented.
- App Store Connect product metadata/subscription configuration and Google Play product/base-plan configuration remain required.

## 22. Automated tests

Command: `npm test`

Result: **56 passed, 0 failed**.

Coverage includes existing Android billing, iOS purchase path assertions, Pump Operator Package behavior, resolver precedence, single-action behavior, expired-recurring retention, confirmed-cache enforcement, offline retention, claim email validation, universal Tools access, and production saved-data/export paths.

Syntax validation passed for `app.js`, `constants.js`, `entitlement.js`, and `supporter.js`. `git diff --check` passed.

## 23. iOS build

Command:

```text
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination generic/platform=iOS CODE_SIGNING_ALLOWED=NO build
```

Result: **BUILD SUCCEEDED**.

This proves the final synced Release source compiles for a generic iOS device. It does not replace a signed archive/upload validation.

Known existing warnings:

- app extension `CFBundleVersion` is `1` while the containing app is `2`;
- unassigned app-icon/splash asset children.

The bundle-version mismatch should be corrected before TestFlight submission.

## 24. Android build

Command: `./gradlew bundleRelease`

Result: **BUILD SUCCESSFUL**; lint vital and release bundle signing completed.

Artifact:

```text
android/app/build/outputs/bundle/release/app-release.aab
SHA-256 ca58152a24e8ba5441d1dd7bcae9cea69e605b38233d20bb6dbef059d17632b4
```

No upload or Play Console action was performed.

One incremental rebuild exposed a byte-identical stale generated `_3 2.jar` beside `_3.jar`. Only ignored Android generated trees (`android/app/build`, `android/build`, and `android/.gradle`) were removed. A fresh `cap sync`, `clean`, and `bundleRelease` passed 199 tasks, including duplicate-class, dex merge, lint vital, bundle packaging, and signing. A post-build scan found no remaining `* 2.jar`, `* 2.dex`, `* 2.class`, or `* 2.*` artifacts.

## 25. Remaining intentional legacy references

- Intentional legacy product identifier: `reverse_flow_pro_lifetime` in constants, native Meta purchase-event filtering, tests, and migration documentation.
- Legacy purchase-detection code: `ACCESS_LEVELS.PRO`, old storage keys, `isProUser()` compatibility calls, purchase logs, receipt inspection, Android acknowledgement recovery, and exact-product checks in `entitlement.js` and `app.js`.
- Test fixtures: Android billing fixtures and negative copy-audit expressions.
- Historical migration documentation: this report and `docs/community-supported-app-migration.md`.
- Reference-data false positive: “Pro Flow” / “Pro Flow HP” are hose model names, not Reverse Flow access labels.
- Unresolved user-facing references requiring removal: **none found**.

## 26. Known risks and follow-up work

- Build the Supabase registry endpoints and authentication/verification strategy before enabling claims or registration.
- Create and configure all six Apple/Google product identifiers, then connect verified purchase and native management flows.
- Validate original Apple transaction ID and Google purchase-token extraction against live sandbox objects.
- Add signed iOS archive/TestFlight validation after aligning the app/widget build numbers.
- Perform physical-device accessibility text and landscape QA; browser QA covered 390×844 portrait light/dark and no overflow.
- Update privacy/legal review when the registry begins transmitting name/email.
- Add live registry refresh/retry scheduling in the integration pass; current Pass 1 behavior is cache-first and unavailable-safe.

No production release was submitted, published, deployed, or modified.
