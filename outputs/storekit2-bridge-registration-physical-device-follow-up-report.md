# StoreKit 2 Bridge Registration — Physical-Device Follow-up

Date: 2026-07-23

## Result

The physical-device run did not emit StoreKit 2 diagnostics because `LegacyEntitlementPlugin.swift` was compiled into the App executable but was not registered with Capacitor.

The app launched the stock `CAPBridgeViewController`. Capacitor's generated package class list registered packaged plugins only and did not include the app-local `LegacyEntitlementPlugin`. Consequently:

- `Capacitor.Plugins.LegacyEntitlement` was unavailable to JavaScript.
- Startup returned without invoking the native bridge.
- Check Existing Purchase fell through to the Cordova purchase plugin.
- The observed `restoreCompletedTransactions` `INVALID` result and receipt refresh came from that legacy fallback.

## Repair

- Added `MainViewController`, a `CAPBridgeViewController` subclass.
- Registered `LegacyEntitlementPlugin()` explicitly in `capacitorDidLoad()`.
- Updated the main storyboard to instantiate `MainViewController`.
- Added `MainViewController.swift` to the App target Sources phase.
- Retained the exact JavaScript plugin name `LegacyEntitlement`.
- Made a missing or failed iOS StoreKit 2 bridge a visible failure instead of allowing Cordova restore fallback.
- Kept Cordova purchase initialization for legacy infrastructure without making it authoritative for iOS recovery.

## Recovery behavior

Startup invokes `currentEntitlements` once after `deviceready`, guarded against duplicate calls.

Manual Check Existing Purchase invokes the StoreKit 2 bridge with synchronization enabled. Native code completes `AppStore.sync()` before iterating `Transaction.currentEntitlements`.

Only a verified, exact `reverse_flow_pro_lifetime` product match records legacy Pro evidence. That evidence sets `hasLegacyProEntitlement = true`; it does not create Supporter status. The resulting Support action is Claim Supporter Status.

## Privacy-safe diagnostics

The packaged native code now includes diagnostics for:

- bridge registration
- entitlement check start
- App Store synchronization start and completion
- every returned product ID
- redacted transaction reference
- StoreKit environment
- original purchase date
- no returned entitlements
- no exact legacy product match
- exact legacy product match
- bridge invocation failure

Transaction references expose only their final six characters.

## Verification

- `npx cap sync ios`: passed
- Xcode clean with isolated Derived Data: passed
- clean unsigned Release build for generic iOS device: passed
- complete automated test suite: 78 passed, 0 failed
- JavaScript syntax checks: passed
- storyboard XML validation: passed

Release product:

`/tmp/reverse-flow-ios-bridge-release/Build/Products/Release-iphoneos/Reverse Flow: Fire Hydraulics.app`

Packaged-target inspection confirmed:

- `LegacyEntitlementPlugin.swift` and `MainViewController.swift` are in the Release Swift source list.
- `MainViewController.o` is in the Release link list.
- the executable contains the `LegacyEntitlementPlugin` Objective-C class and StoreKit 2 diagnostic strings.
- the compiled storyboard references the app's `MainViewController`.
- the packaged `app.js` and `entitlement.js` exactly match `www/`.

## Expected next physical-device trace

On a newly installed build from this clean product, startup should show:

1. `bridge-registered jsName=LegacyEntitlement`
2. JavaScript bridge invocation started with synchronization disabled
3. native entitlement check started
4. either returned-entitlement diagnostics or no-entitlements-returned
5. exact-legacy-product-match only when `reverse_flow_pro_lifetime` is verified

Manual Check Existing Purchase should additionally show StoreKit synchronization start and completion before current-entitlement results. It should not invoke `restoreCompletedTransactions` or use receipt refresh as its authoritative recovery path.

No deployment, device installation, archive upload, or App Store submission was performed.
