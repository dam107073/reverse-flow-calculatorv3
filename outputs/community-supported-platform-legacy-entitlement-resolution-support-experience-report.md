# Community-Supported Platform
## Legacy Entitlement Resolution + Support Experience Polish

Date: July 23, 2026

## Release recommendation

Ready for device validation. Automated tests and unsigned iOS and Android
Release builds pass. No deployment, upload, submission, or publication was
performed.

The one remaining acceptance check is a fresh installation signed into an
Apple ID that actually owns `reverse_flow_pro_lifetime`. StoreKit account
history cannot be reproduced by the repository test suite.

## iOS root cause

The approved transaction in the supplied logs was not the legacy purchase.

The decisive field was:

`productIds: ["app.reverseflow.mobile"]`

That is the cordova-plugin-purchase synthetic application transaction created
from the App Store application receipt. The shared log helper added the
configured `reverse_flow_pro_lifetime` identifier to every event, which made
the event look like an approved lifetime product even though its actual
product list contained only the application bundle identifier. Diagnostics
now report the configured identifier separately and leave `productId` empty
unless the transaction itself contains the exact lifetime product.

`product.owned` remained false because cordova-plugin-purchase derives that
property from exact product transactions in its local or verified receipt
model. Refreshing the opaque unified receipt does not make the plugin parse
its in-app-purchase records into local transactions when no receipt validator
is configured. The application transaction therefore became approved, while
no exact `reverse_flow_pro_lifetime` transaction existed for the plugin's
ownership resolver.

Two other log lines were not evidence of a failed entitlement:

- `restoreCompletedTransactions INVALID` uses Cordova's no-callback identifier;
  it does not mean StoreKit rejected the restore command.
- App Store error 603 explicitly said the unified receipt was valid and
  current. It was a throttled redundant refresh, not proof that the lifetime
  purchase was absent.

The repeated refresh/restore cycle could not repair the mismatch because it
kept consulting the same local plugin ownership model.

## Final ownership strategy

iOS now uses a small native StoreKit 2 bridge:

- Startup silently iterates `Transaction.currentEntitlements`.
- Only a StoreKit-verified transaction whose product ID exactly equals
  `reverse_flow_pro_lifetime` is accepted.
- Transaction identifiers cross the JavaScript bridge as strings so 64-bit
  values are not rounded.
- The exact verified evidence is stored through the existing legacy
  entitlement path.
- The result establishes only legacy claim eligibility. It does not establish
  Supporter status, recurring support, or a Supporter badge.

Apple documents `currentEntitlements` as the source for current non-consumable
entitlements and states that purchases made with the original StoreKit API are
available through the Transaction API:

- https://developer.apple.com/documentation/storekit/transaction/currententitlements
- https://developer.apple.com/documentation/storekit/transaction

The **Check Existing Purchase** button remains the exceptional recovery path.
On iOS, that explicit action calls `AppStore.sync()` and then repeats the same
verified exact-product lookup. Routine startup and claim-evidence refreshes do
not synchronize or prompt for authentication, matching Apple's guidance:

- https://developer.apple.com/documentation/storekit/appstore/sync()

Android retains the established Google Play restore and acknowledgement path.

## Expected behavior

### Fresh iOS installation

On normal startup, StoreKit silently exposes the current lifetime
non-consumable entitlement. When the signed-in Apple ID owns the exact legacy
product, the app persists claim evidence and the Support page resolves to
**Claim Supporter Status**.

### Upgraded installation

Existing valid stored legacy evidence remains eligible, including while
offline. A silent StoreKit check refreshes that evidence when available.

### Manual recovery

The recovery button explicitly synchronizes App Store history, coalesces
duplicate taps, checks the verified exact product, and leaves the current app
state unchanged on failure.

## Support experience

The live `reverse-flow.app/supporters` and
`reverse-flow.app/supporters/become/` pages were reviewed at desktop and
mobile widths before the app page was changed.

The website's defining qualities were:

- a mission-led editorial opening rather than a price-led opening;
- large, confident typography;
- dark fire-service visual identity with restrained orange light;
- generous pacing and whitespace;
- few card boundaries;
- a progression from community, to invitation, to recognition.

The app now adapts that feeling for a compact mobile surface:

- **Support Reverse Flow** remains the hero for every supporter state;
- the mission appears before any action or contribution option;
- the support invitation is **Help Build What Comes Next**;
- the dark grid hero, orange accent, strong italic title, and open spacing echo
  the website without duplicating its page;
- benefits remain short;
- legacy recovery is a quiet secondary section instead of a competing card;
- state-specific guidance appears as a compact note inside the mission hero.

The compact home-screen support bar was not enlarged or redesigned.

## Validation

- `npm test`: 76 passed, 0 failed.
- iPhone-width browser inspection: 390 × 844, no horizontal overflow.
- Regular and legacy-claim Support page states inspected.
- Source and packaged iOS/Android web assets confirmed identical.
- iOS Release build:
  `xcodebuild ... -configuration Release ... CODE_SIGNING_ALLOWED=NO build`
  — succeeded.
- Android Release bundle:
  `./gradlew bundleRelease`
  — succeeded.

The iOS build continues to report the existing widget/app
`CFBundleVersion` mismatch warning. It did not block the build and is unrelated
to StoreKit or this pass.

## Files changed

- `ios/App/App/LegacyEntitlementPlugin.swift` — verified StoreKit 2 entitlement
  lookup and explicit synchronization bridge.
- `ios/App/App.xcodeproj/project.pbxproj` — includes the new native plugin in
  the app target.
- `www/js/services/entitlement.js` — routes iOS startup/manual recovery through
  the native authoritative signal and preserves evidence.
- `www/js/app.js` — uses StoreKit current entitlements for iOS recovery and
  makes transaction diagnostics distinguish configured and actual products.
- `www/js/services/supporter.js` — keeps the mission headline stable and moves
  state-specific language into secondary guidance.
- `www/support.html` — mission-first content hierarchy and quieter recovery
  placement.
- `www/css/support.css` — website-informed typography, pacing, color, section
  transitions, and mobile-safe layout.
- `tests/legacy-purchase-recovery.test.js` — fresh install, explicit sync,
  duplicate action, exact product, unverified rejection contract, and
  non-prompting evidence refresh coverage.
- `outputs/community-supported-platform-legacy-entitlement-resolution-support-experience-report.md`
  — this completion report.

## Remaining StoreKit limitations

- Entitlement visibility still depends on the device using the Apple account
  that owns the purchase.
- Refunded or revoked purchases do not appear in `currentEntitlements`, by
  design.
- Sandbox and TestFlight results depend on their active test purchase history
  and may differ from a production Apple ID.
- A real-account fresh-install device check remains necessary before release.
