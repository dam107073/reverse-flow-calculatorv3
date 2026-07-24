# Reverse Flow Community-Supported Platform

## UX Polish + Legacy Purchase Recovery Pass

Date: July 23, 2026  
Scope: iOS/Android app source and local Release validation  
Deployment status: not deployed, uploaded, published, or submitted

## Completion status

The compact home support action, redesigned Support page, neon-orange Supporter treatment, startup legacy-purchase rediscovery, manual existing-purchase check, safe-area treatment, and copy cleanup are implemented.

The source, automated tests, responsive browser QA, native bundle sync, iOS Release build, and Android Release build all pass. The implementation is ready for physical TestFlight and Play Internal Testing validation. Store-account behavior on a deleted-and-reinstalled physical app cannot be called fully proven until those two device tests are completed.

## Root cause

The existing entitlement path could recognize `reverse_flow_pro_lifetime` when an upgraded installation still had the locally persisted entitlement or when the purchase SDK happened to report ownership during passive initialization.

A fresh install has neither local entitlement storage nor cached browser state. The startup lifecycle did not actively refresh Apple purchase history:

- `receiptsReady` invoked the Android transaction recovery path only;
- iOS startup inspected current SDK ownership but did not initiate `restorePurchases()`;
- the existing refresh was Android-resume-specific or attached to hidden legacy controls;
- the standalone Support page loaded entitlement/supporter services but did not initialize the purchase store.

As a result, StoreKit could leave the historical non-consumable undiscovered after reinstall, so the resolver remained in the regular-user state.

## Startup rediscovery

The main app now starts one asynchronous, session-deduplicated existing-purchase check after the purchase store becomes ready.

- Calculator initialization does not await the check.
- Both StoreKit and Google Play call the SDK purchase-history refresh.
- Only the exact `reverse_flow_pro_lifetime` product is eligible.
- iOS reuses the existing verified-receipt and exact SDK-ownership paths.
- Android reuses the existing transaction-state, persistence, and acknowledgement recovery path.
- A successful recovery persists legacy entitlement evidence and dispatches the existing entitlement-changed event.
- The resolver then displays `Claim Supporter Status`.
- Passive startup recovery does not display a purchase alert.
- Offline startup keeps existing local access/state and does not block the calculator.

No recovered legacy entitlement can create a Supporter badge, `Continue Supporting`, or `Manage Support`.

## Manual existing-purchase check

The Support page now includes:

> Already purchased Reverse Flow PRO?

> Check Existing Purchase

The action:

- prevents duplicate taps in the UI;
- coalesces concurrent recovery calls into one in-flight operation;
- initializes the purchase SDK on the standalone Support page when needed;
- refreshes Apple or Google purchase history;
- checks exact-product SDK ownership;
- persists recovered evidence through the existing entitlement store;
- rerenders the shared resolver state immediately;
- shows a friendly account-specific not-found message;
- shows connection-required copy without changing current access when offline.

The older restore wording is not used as the primary Support-page action.

## Main-screen support action

The previous multi-part card was replaced by one full-width 46 px action bar directly below the header divider.

It contains exactly one resolver-controlled label:

- `Become a Supporter`;
- `Claim Supporter Status`;
- `Continue Supporting`;
- `Manage Support`.

There is no eyebrow, helper paragraph, description, nested button, or second action on the calculator screen. The first calculator card starts immediately below the compact bar with the normal page gutter.

## Support visual system

A dedicated Supporter palette now uses:

- bright neon orange `#ff6500`;
- brighter highlight `#ff8a1f`;
- restrained deep-orange edge `#c83d00`;
- low-opacity, non-animated glow.

The treatment is limited to the compact bar, Supporter badge, primary support buttons, secondary recovery action, and Support-page accents. Routine calculator controls retain their existing colors.

## Support page redesign

The page now has a tighter two-column mobile navigation and compact cards for:

- concise introduction and the three platform statements;
- one-time $5, monthly $3, and monthly $10 support options;
- readable `Coming Soon` labels at full opacity;
- the exact four-item Supporter benefits list;
- legacy purchase recovery;
- claim, recurring-management, and future verified-registration states;
- a simple footer.

The action-specific architecture remains unchanged. Legacy claim and recurring management sections appear only when selected by the existing resolver.

## Safe area and scrolling

- Every app page retains `viewport-fit=cover`.
- The header remains in normal document flow, so it does not overlap page content.
- Header top padding continues to include `safe-area-inset-top`.
- A fixed, pointer-transparent safe-area shield now covers only the unsafe status-bar strip after the header scrolls away.
- Bottom page padding continues to include `safe-area-inset-bottom`.
- Browser QA found no horizontal overflow at 390×844 or 412×915.

The shield has zero height in ordinary browsers and takes effect only when the WebView exposes a top safe-area inset.

## Copy audit

The retired restricted-access wording was removed from:

- current app UI;
- shared supporter rendering;
- migration documentation;
- the earlier Pass 1 report;
- synced iOS and Android web bundles.

The preferred statement is now:

> Every firefighter has access to every tool.

## Automated validation

- `npm test`: 73 passed, 0 failed.
- Tank Time widget Swift tests: passed.
- JavaScript syntax checks: passed for constants, entitlement, supporter, and app services.
- `git diff --check`: passed.
- Exact source/native-bundle parity checks: passed for the affected HTML, CSS, and JavaScript.
- Repository and both native app bundles contain no remaining retired copy occurrence.

New coverage includes:

- fresh-install store initialization and purchase-history refresh;
- upgraded-install offline entitlement retention;
- duplicate manual recovery coalescing;
- non-blocking startup recovery;
- compact single-action home bar;
- readable `Coming Soon` products;
- manual recovery UI/copy;
- legacy eligibility never creating the badge.

Existing Android billing tests continue to cover exact-product matching, pending/cancelled handling, entitlement persistence, acknowledgement, retry, resume, and restore.

## Responsive and state QA

Browser QA covered:

- light and dark themes;
- regular user;
- legacy eligible user;
- confirmed Supporter;
- recurring Supporter;
- offline manual recovery;
- iPhone-sized 390×844 viewport;
- Android-sized 412×915 viewport.

Verified:

- exactly one home support action;
- correct labels for all four states;
- hidden badge for regular and legacy-only states;
- visible badge for confirmed states;
- claim and manage section selection;
- 46 px compact bar;
- readable disabled options at opacity `1`;
- no clipped action text;
- no horizontal overflow;
- no page console errors;
- no fixed-header overlap in browser layout.

## Native Release builds

### iOS

- Capacitor sync: passed.
- Unsigned generic-device Release build: `BUILD SUCCEEDED`.
- The pre-existing CapApp-SPM iOS 17 versus app-target iOS 15 linker warning remains unchanged.
- No archive was uploaded or submitted.

### Android

- Purchase-plugin patch verification: passed.
- Capacitor sync: passed.
- Release AAB: `BUILD SUCCESSFUL`.
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`.
- SHA-256: `95a009d28507ffeb0efbce89249cff90303e9805ede223886a6693bd1079d14f`.
- Existing flat-directory, deprecated API, and Gradle deprecation warnings remain.
- No bundle was uploaded or published.

## Physical-device QA

No physical iPhone or Android device was available in this pass. The following remain required before release:

1. Delete and reinstall the TestFlight build while signed into the Apple account that owns the lifetime purchase.
2. Confirm the calculator is immediately usable and `Claim Supporter Status` appears after StoreKit refresh.
3. Repeat through `Check Existing Purchase`.
4. Repeat on Play Internal Testing with the owning license-tester account.
5. Test offline launch first, then reconnect and run the manual check.
6. Confirm real notch/status-bar behavior when launched normally and from an external app.

## Remaining StoreKit limitations

- StoreKit decides whether the signed-in Apple account can return the historical non-consumable.
- A network connection and store-account authentication may be required.
- The exact restored transaction/reference shape still needs capture on a physical sandbox/TestFlight install.
- Provider/server verification remains required before a real legacy claim can be accepted by the Supporter Directory.

## Remaining Google Billing limitations

- Google Play returns history only for the active account, installed application identity, and eligible purchase state.
- Historical, refunded, revoked, and license-tester behavior still requires Internal Testing evidence.
- Existing acknowledgement/finalization retry behavior is unchanged.
- Provider/server verification remains required before a real legacy claim can be accepted.

## Fresh-install readiness

When StoreKit or Google Play reports exact ownership of `reverse_flow_pro_lifetime`, a fresh installation now actively rediscovers it, persists legacy claim evidence, rerenders the resolver, and displays `Claim Supporter Status` without delaying calculator availability.

This is confirmed in automated SDK-shaped tests and both Release builds. Final reliability is conditional on the platform returning that purchase for the currently signed-in account and must still be proven on physical TestFlight and Play Internal Testing installations.

## Files changed

- `docs/community-supported-app-migration.md`
- `outputs/community-supported-platform-pass1-app-transition-report.md`
- `outputs/community-supported-platform-ux-polish-legacy-recovery-report.md`
- `tests/browser/supporter-ui-fixture.html`
- `tests/legacy-purchase-recovery.test.js`
- `tests/universal-access.test.js`
- `www/css/base.css`
- `www/css/support.css`
- `www/index.html`
- `www/js/app.js`
- `www/js/services/entitlement.js`
- `www/js/services/supporter.js`
- `www/privacy.html`
- `www/references.html`
- `www/resources.html`
- `www/settings.html`
- `www/support.html`
- `www/tools.html`
