# Reverse Flow Community-Supported Platform

## Pass #4B — Native Store Integration

Date: July 24, 2026  
Deployment status: Not deployed or submitted

## Outcome

The approved Support page is connected to StoreKit and Google Play Billing through the existing `cordova-plugin-purchase` native store layer. The app loads the three canonical products, displays provider-localized pricing, purchases or restores exact products, and sends transaction evidence to a new public backend verification boundary. A transaction is finished only after the backend verifies it and returns confirmed Supporter status.

Production calculators remain universally available. Native support purchases affect Supporter identity and recurring-support state only.

## Native store implementation

### Apple

- Registers the exact one-time and monthly product identifiers with the App Store adapter.
- Loads localized prices from the product offer pricing phases.
- Handles approved, pending, canceled, failed, and timed-out purchases.
- Keeps an approved transaction unfinished until server verification and Supporter registration succeed.
- Restores through the native store restore operation and then verifies exact support-product evidence.
- Opens native subscription management for active or canceling monthly support.

### Google

- Registers the exact one-time and monthly product identifiers with Google Play.
- Selects the exact one-time purchase option `buy`.
- Selects the exact monthly base plans `monthly-3` and `monthly-10`.
- Loads localized prices from the selected offers.
- Handles approved, pending, canceled, failed, and timed-out purchases.
- Keeps an approved transaction unfinished until server verification and Supporter registration succeed.
- Resyncs native purchases, filters to exact support products, and verifies the purchase token.
- Opens native subscription management for active or canceling monthly support.

The legacy `reverse_flow_pro_lifetime` registration and Claim Supporter Status path remain intact. Legacy evidence cannot become a native support purchase, and native support code does not change calculator access.

## Product loading and Support page

The Support page initializes the store after native readiness and renders:

- `One-Time Support — <localized price>`
- `Monthly Support — <localized price>/month`
- `Monthly Support — <localized price>/month`

Loading, unavailable, pending, cancel, failure, and duplicate-tap states are explicit. Every former `COMING SOON` badge has been removed. The approved page direction was preserved.

The centralized action priority remains:

1. Manage Support
2. Continue Supporting
3. Claim Supporter Status
4. Become a Supporter

Only one canonical action is rendered.

## Backend verification

The website backend now exposes `POST /api/supporters/verify-purchase`.

It:

- accepts identity and native evidence only in the JSON request body;
- rate-limits verification attempts;
- permits only the three exact canonical product identifiers;
- validates purchase type against the product;
- verifies Apple evidence through the App Store Server API;
- verifies Google one-time products and subscriptions through the Google Play Developer API;
- validates bundle/package, product, transaction/token, and Google base-plan matches;
- rejects pending, revoked, mismatched, malformed, unconfigured, or unverifiable purchases;
- reuses an existing Supporter's private name only after store verification;
- calls the existing idempotent supporter-source registration function;
- returns confirmed Supporter state without returning transaction evidence.

No provider private key, service account, privileged registration token, transaction identifier, signed transaction, or purchase token is embedded in the mobile bundle or logged by this flow.

## Registration and welcome email

For a new verified purchase, the app collects name and email before registration. For an already-confirmed Supporter, it can reuse the cached email and the backend privately resolves the existing name.

The backend registration RPC remains the source of truth and deduplicates by normalized identity and verified external source reference. After confirmed registration, the existing idempotent backend welcome-email workflow runs. The app never sends email directly.

A failed welcome-email delivery does not roll back confirmed Supporter status and can be retried by the existing backend workflow.

## Recurring and permanent state

- One-time support creates permanent Supporter identity.
- Monthly support records `active`, `canceling`, or `expired` recurring state from provider truth.
- Expiration removes active recurring state only.
- Expiration does not remove the Supporter badge, public listing, supporter record, or earliest Supporting Since date.
- A confirmed Supporter can continue supporting with any currently available product.
- An active or canceling monthly supporter sees Manage Support and can open native subscription management.

## Screenshots

- `outputs/pass4b-support-page-ios-light-390x844.png`
- `outputs/pass4b-support-page-google-manage-dark-390x844.png`

These fixture screenshots use localized-price-shaped store data to verify the live UI states without initiating a real purchase.

## Test matrix

| Area | Scenario | Result |
| --- | --- | --- |
| Apple | One-time product load and localized price | Pass |
| Apple | Monthly $3 product load and localized price | Pass |
| Apple | Monthly $10 product load and localized price | Pass |
| Apple | Approved transaction held until verification | Pass |
| Apple | Cancel | Pass |
| Apple | Pending | Pass |
| Apple | Failure/timeout | Pass |
| Apple | Restore exact support product | Pass |
| Apple | Bundle, product, transaction, revocation validation | Pass |
| Google | One-time `buy` offer selection and localized price | Pass |
| Google | Monthly `monthly-3` selection and localized price | Pass |
| Google | Monthly `monthly-10` selection and localized price | Pass |
| Google | Approved transaction held until verification | Pass |
| Google | Cancel | Pass |
| Google | Pending | Pass |
| Google | Failure/timeout | Pass |
| Google | Purchase resync | Pass |
| Google | Product and base-plan validation | Pass |
| UI | Duplicate-tap protection | Pass |
| UI | Loading and unavailable states | Pass |
| UI | Continue Supporting and Manage Support | Pass |
| Supporter | Duplicate registration remains idempotent | Pass |
| Supporter | Backend welcome workflow invoked | Pass |
| Supporter | Expired recurring state preserves identity | Pass |
| Supporter | Legacy claim path preserved | Pass |
| Regression | Production calculators remain universally available | Pass |

Automated results:

- Calculator repository: 93 tests passed, 0 failed.
- Website verification/directory/email suites: 10 tests passed, 0 failed.
- `npx cap sync ios`: succeeded.
- Android Capacitor sync with purchase diagnostics patch: succeeded.
- Unsigned iOS Release device build: succeeded.
- Android `bundleRelease`: succeeded.
- iOS, Android, and source supporter-service assets: identical SHA-1.
- Packaged iOS app and Android AAB: all three canonical product identifiers confirmed.

No live App Store or Play Store financial transaction was initiated in this pass.

## Remaining production activation

Before a store submission or production rollout:

1. Deploy the website verification endpoint and related welcome-email backend changes to a controlled Preview environment.
2. Configure server-only Apple issuer ID, key ID, private key, and bundle ID.
3. Configure the Google Play service account JSON and package name, with Android Publisher API access.
4. Update the app's Supporter API target from its current undeployed Preview backend only after that Preview endpoint is verified.
5. Run real sandbox/internal-track purchases for all three products on physical Apple and Android devices.
6. Verify cancel, pending, failure, restore/resync, duplicate registration, email delivery, Continue Supporting, and Manage Support with provider accounts.
7. Configure App Store Server Notifications V2 and Google Real-time Developer Notifications so off-device renewal, cancellation, refund, revocation, and expiration changes can refresh backend recurring state without waiting for an app resync.
8. Align the Tank Time widget `CFBundleVersion` with the parent app. The current unsigned Release build succeeded with a warning because the widget is `1` and the parent is `2`.

No deployment, store submission, provider credential change, or live purchase was performed.
