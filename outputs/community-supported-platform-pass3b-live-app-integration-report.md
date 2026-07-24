# Reverse Flow Community-Supported Platform

## Pass 3B — Live iOS and Android Supporter Directory integration

Date: July 23, 2026  
Scope: iOS TestFlight and Google Play Internal Testing app code only  
Production deployment/submission status: not deployed, uploaded, published, or submitted

## Completion status

The app-side Supporter Directory transport is implemented against the authoritative website contract. The claim and status routes are live, cache writes remain server-confirmation-only, all operational tools remain independent of network/supporter state, and the backend's intentionally unavailable Apple/Google verifier remains fail-closed.

The implementation is ready for sandbox/device evidence validation. It is **not ready for the first real legacy claim** until Apple and Google server verification is configured and the required provider references are confirmed on physical TestFlight/Internal Testing installs.

## API contract and configuration

- Reviewed: `Reverese Flow Website/docs/supporter-directory.md`.
- Current environment: `preview`.
- Preview base URL: `https://reverese-flow-website-pkkuuucew-reverse-flow-llc.vercel.app`.
- Future production convention: `https://reverse-flow.app`.
- Claim: `POST /api/supporters/claim-legacy`, 15-second timeout.
- Status: `POST /api/supporters/status`, 10-second timeout.
- Headers: `Accept: application/json` and `Content-Type: application/json`.
- No Supabase, verifier, registration, Apple, Google, Stripe, or Resend secret is bundled.
- `POST /api/supporters/register` remains server-to-server only; the app does not call it.

Preview contract probe:

- status before claim: `200`, `isSupporter: false`, valid `lastVerifiedAt`;
- fixture-reference claim: `503 legacy_verification_unavailable`;
- status after claim: `200`, `isSupporter: false`, proving no record was created.

No live fixture Supporter was created, so no cleanup was required. A successful claim/public-list fixture could not be exercised against Preview without a configured verifier. When verification is enabled, the public `/supporters/` page should update through its normal API data source and five-minute shared cache; the app does not wait for or call the public-list route.

## Registry transport and error handling

`SupporterRegistryService` now provides real JSON transport with:

- exact public route construction;
- HTTPS-only configuration;
- abort-based request timeouts;
- offline detection;
- malformed JSON and malformed schema rejection;
- safe `400`, `409`, `422`, `429`, `502`, and `503` handling;
- `Retry-After` capture for `429`;
- no automatic duplicate retry;
- no query-string identity or purchase evidence;
- no fabricated success.

`legacy_verification_unavailable` is presented as:

> Supporter claims are not available yet while purchase verification is being completed. Your existing purchase remains recognized, and every tool is already available.

## Legacy claim behavior

Before submission, the app:

- trims name;
- trims and lowercases email without rewriting aliases or dots;
- validates both fields;
- blocks duplicate submissions;
- requires connectivity;
- refreshes the store purchase state when the plugin exposes a refresh/restore boundary;
- rechecks the exact `reverse_flow_pro_lifetime` entitlement;
- requires the platform-specific server evidence reference.

Apple request evidence:

- `entitlementEvidence.originalTransactionId`;
- duplicate top-level `originalTransactionId` required by the contract;
- optional ISO-8601 `originalPurchaseTimestamp`;
- app version and claim timestamp.

Google request evidence:

- `entitlementEvidence.purchaseToken`;
- duplicate top-level `purchaseToken` required by the contract;
- optional ISO-8601 `originalPurchaseTimestamp`;
- app version and claim timestamp.

Only a syntactically valid server response with `isSupporter: true`, a valid `supporterSince`, a source, recurring fields, and `lastVerifiedAt` can enter the confirmed cache. Success immediately shows the Supporter badge, changes the sole action to Continue Supporting, hides the claim UI, and displays:

> Welcome, Supporter. Thank you for helping build what comes next.

Failures preserve form values, the unclaimed state, hidden badge, and safe retry.

## Apple evidence mapping

Confirmed from installed `cordova-plugin-purchase` 13.16.1 source and plugin-shaped automated fixtures:

- exact product: `transaction.products[].id`;
- ownership: existing exact-product entitlement plus SDK ownership callbacks;
- original transaction: `SKTransaction.originalTransactionId`;
- current transaction: `transaction.transactionId`;
- purchase time: `transaction.purchaseDate`;
- signed StoreKit 2 representation when exposed: `SKTransaction.jwsRepresentation`;
- acknowledgement/state when exposed by the common transaction interface.

The app persists only claim-relevant Apple references/date fields in the legacy entitlement record. It does not send the signed transaction because the current API contract does not accept it. It does not log receipt/JWS content or full transaction references.

Not confirmed on a physical TestFlight/sandbox object:

- whether every historical non-consumable exposes `originalTransactionId` after restore;
- whether TestFlight history exposes the original purchase date;
- sandbox/environment indicator;
- app account token.

If the original date is absent, the app omits it. The server may use its documented verified claim-date fallback; the app never fabricates Supporting Since.

## Google evidence mapping

Confirmed from installed `cordova-plugin-purchase` 13.16.1 source, the native bridge, existing Android billing tests, and plugin-shaped automated fixtures:

- exact product: `transaction.products[].id`;
- purchase token: `transaction.purchaseId` / native `purchaseToken`;
- order/reference: `transaction.transactionId` and native `orderId`;
- purchase time: `transaction.purchaseDate` / native `purchaseTime`;
- acknowledgement: `transaction.isAcknowledged`;
- purchase state: `transaction.state` / native `getPurchaseState`;
- package name: native `packageName`;
- obfuscated account/profile identifiers when already present: native `accountId` / `profileId`.

The claim sends only the purchase token and optional original timestamp required by the current contract. Full tokens and order IDs are not logged.

Not confirmed with a live Google license-tester/Internal Testing purchase:

- recovery of a historical or revoked test purchase;
- testing/license-tester indicator;
- availability of obfuscated account/profile IDs for existing purchases;
- server-side acceptance of the recovered token.

Insufficient evidence remains fail-closed.

## Status refresh and confirmed cache

- Lookup identity is the normalized email stored only after a confirmed claim/future registration.
- No email means no status request.
- Refresh starts asynchronously after UI initialization.
- Resume/visible refresh is throttled to once per minute.
- Startup and calculators never await registry communication.
- A successful newer confirmed response updates the cache.
- An older response cannot overwrite a newer confirmation.
- A timeout, network error, malformed response, `5xx`, or unexpected negative lookup cannot erase an existing confirmed Supporter.
- Cached Supporters retain badge/action/Supporting Since offline.
- The server remains authoritative for Supporting Since.
- Private receipt, transaction, and token evidence is not copied into the Supporter cache.

## Resolver and badge validation

Validated exactly one action in every state:

- regular: Become a Supporter;
- legacy unclaimed: Claim Supporter Status;
- confirmed non-recurring: Continue Supporting;
- active/canceling recurring: Manage Support;
- expired/inactive recurring Supporter: Continue Supporting.

Server-confirmed identity takes precedence over legacy eligibility. Active recurring state takes precedence over non-recurring Supporter state. The badge remains server-confirmation-only and updates immediately after a successful claim.

## Offline and browser/mobile QA

At 390×844:

- regular light mode: correct action, hidden badge, zero overflow, no console errors;
- regular dark mode: correct action, hidden badge, zero overflow, no console errors;
- offline legacy claimant: claim form opens, submit shows connection-required copy, values remain, badge stays hidden;
- offline confirmed Supporter: badge retained, Continue Supporting retained, claim hidden;
- offline active-recurring Supporter: badge retained, Manage Support retained;
- mocked confirmed claim: immediate badge/action/title/success transition;
- all fixture states: exactly one support action and zero horizontal overflow.

The browser-only fixture lives under `tests/browser/` and is not copied into either release bundle.

## Privacy and logging

- Requests use HTTPS JSON bodies.
- Email and purchase evidence never enter the URL.
- No email is emitted to analytics.
- Normal logs do not contain full Apple transaction references, Google purchase tokens, receipt content, or signed transactions.
- No client email automation or Resend credential was added.

Required privacy-policy follow-up before public release:

- replace the existing statement that the Supporter Registry is not connected;
- disclose transmission and private storage of name, normalized email, platform, app version, timestamps, and minimum purchase-verification references;
- explain public name/Supporting Since listing and removal choice;
- document the server-side verification/retention boundary.

Legal copy was not changed in this pass.

## Automated and native validation

- `npm test`: **67 passed, 0 failed**.
- JavaScript syntax: `app.js`, `constants.js`, `entitlement.js`, and `supporter.js` passed.
- Changed HTML parsed successfully.
- `git diff --check`: passed.
- Privileged credential-name scan of source and both native web bundles: passed.
- Capacitor iOS sync: passed.
- Capacitor Android sync: passed.
- iOS unsigned generic-device Release build: **BUILD SUCCEEDED**.
- Android Release AAB: **BUILD SUCCESSFUL**.
- Final AAB: `android/app/build/outputs/bundle/release/app-release.aab`.
- Final AAB SHA-256: `3d7695e1f463ea9ec9d8c6dd67031f9c0ce2fbc67dd446df62dad6cc8772a629`.
- `www/`, iOS public bundle, and Android public bundle integration files are byte-identical.

Existing native follow-ups:

- app `CFBundleVersion` is `2`; Tank Time widget `CFBundleVersion` is `1`;
- the tracked CapApp Swift package declares iOS 17 while the app target links at iOS 15, producing an existing deployment-target warning;
- Gradle reports existing deprecated-feature/flat-directory warnings.

## Remaining work

- Apple: implement/configure real server verification and validate a physical TestFlight restore object.
- Google: implement/configure real server verification and validate a Play Internal Testing/license-tester token.
- Store products: create the deferred Apple/Google one-time and recurring products and connect verified registration.
- Stripe: deferred.
- Resend/welcome email: deferred and server-owned.
- Public privacy/legal update: required before public release.
- App/widget build-number alignment: required before TestFlight submission.

## Files changed

- `docs/community-supported-app-migration.md`
- `outputs/community-supported-platform-pass3b-live-app-integration-report.md`
- `tests/browser/supporter-ui-fixture.html`
- `tests/supporter-registry.test.js`
- `tests/supporter-state.test.js`
- `www/index.html`
- `www/settings.html`
- `www/support.html`
- `www/tools.html`
- `www/js/app.js`
- `www/js/constants.js`
- `www/js/services/entitlement.js`
- `www/js/services/supporter.js`

## Blockers and readiness

No app-code, test, sync, or build blocker remains.

The only blocker to a real claim is external provider verification plus live sandbox evidence confirmation. After those server boundaries are activated and both platforms return the documented references on physical test installs, the app transport and UI are ready for the first controlled claim. Until then, real claims correctly return unavailable and create no Supporter record.
