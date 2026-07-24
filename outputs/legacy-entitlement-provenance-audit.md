# Legacy Entitlement Provenance Audit

Date: 2026-07-23

## Outcome

Legacy eligibility defaults to `false` and now changes to `true` only through the centralized `setAccessLevel(PRO, evidence)` gate. That gate requires:

- the exact product ID `reverse_flow_pro_lifetime`;
- the existing verified-purchase storage shape; and
- one approved, source-specific provenance value.

Every false-to-true transition emits:

```text
{
  event: "legacy-entitlement-state-changed",
  eligible: true,
  source: "<approved source>",
  productId: "reverse_flow_pro_lifetime"
}
```

No transaction ID, receipt, purchase token, email, or account identifier is included.

## Setter and migration inventory

| Path | Evidence required | Provenance |
| --- | --- | --- |
| StoreKit 2 startup check | verified exact `Transaction.currentEntitlements` result | `storekit2-current-entitlements` |
| StoreKit 2 manual check | verified exact result after `AppStore.sync()` | `manual-store-sync` |
| Cordova verified receipt callback | unexpired exact product in verified receipt collection | `cordova-verified-receipt` |
| Cordova owned state | exact registered product with `store.owned === true` or exact product `owned === true` | `cordova-owned-product` |
| Google purchase recovery | exact Google Play transaction in an approved or finished ownership state | `google-owned-purchase` |
| Structured startup cache | exact product, purchase source, and valid verification timestamp | `persisted-verified-legacy-cache` |
| Bare old access-level key | never sufficient; removed and reset to Basic | no grant |

`old-pro-storage-migration` is reserved for a future explicit migration that can prove previously verified ownership. There is currently no production migration using it.

`test-fixture` is reserved for controlled test setup. There is no production caller.

There is no `legacySupporterEligible` setter or storage key in the repository. `hasLegacyProEntitlement()` is a compatibility read alias over the centralized in-memory state. Direct Pro entitlement-cache writes were removed from Android recovery so all production grants pass through the same gate.

## Physical-device transition attribution

The prior runtime output cannot identify one exact Cordova sub-path because all legacy grants previously logged the generic source `purchase`.

The observed order does prove:

- it was not the default, which is false;
- it was not the startup structured cache, because that is loaded synchronously before the initial Support action renders;
- it was not StoreKit 2, because that check returned no current entitlements;
- it was not the Supporter registry cache, because that can render Continue Supporting or Manage Support but does not set legacy eligibility;
- it was an asynchronous legacy-purchase setter.

On iOS, the remaining candidates in that build were:

1. the Cordova verified-receipt exact-product callback; or
2. the Cordova exact owned-product callback.

The prior generic logs do not preserve enough evidence to distinguish those two retrospectively. The next physical-device run will report exactly `cordova-verified-receipt` or `cordova-owned-product` if the same transition occurs.

## Regression coverage

Tests now prove:

- a completely clean user with no purchase stays on Become a Supporter;
- a product merely being available cannot grant eligibility;
- an unrelated `app.reverseflow.mobile` transaction cannot grant eligibility;
- an unapproved generic provenance source cannot grant eligibility even when passed the lifetime product ID;
- bare old Pro compatibility storage is ignored;
- a valid structured exact-product cache can restore eligibility;
- all five production grant call sites use source-specific provenance;
- legacy eligibility resolves to Claim Supporter Status but never creates confirmed Supporter status or a Supporter badge.

## Build verification

- `npx cap sync ios`: passed
- clean unsigned Release build for generic iOS device: passed
- full test suite: passed
- no deployment, device installation, archive upload, or submission performed

Release product:

`/tmp/reverse-flow-ios-provenance-release/Build/Products/Release-iphoneos/Reverse Flow: Fire Hydraulics.app`
