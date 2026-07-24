# Subscription transition audit

Verified on 2026-07-24 for Reverse Flow 2.0.

## Canonical products

| Support option | Apple product | Google product / base plan |
| --- | --- | --- |
| One time | `reverse_flow_support_one_time_5` | `reverse_flow_support_one_time_5` / `buy` |
| $2.99 monthly | `support_reverse_flow_monthly_3` | `support_reverse_flow_monthly_3` / `monthly-3` |
| $9.99 monthly | `support_reverse_flow_monthly_10` | `support_reverse_flow_monthly_10` / `monthly-10` |

## Apple

App Store Connect shows both monthly products in the **Support Reverse Flow**
subscription group (`22260570`). The $9.99 product is level 1 and the $2.99
product is level 2. Apple therefore treats $2.99 to $9.99 as an upgrade and
$9.99 to $2.99 as a downgrade. A customer can have only one subscription in
this group at a time. The app orders the alternate product normally and lets
StoreKit apply the configured group transition.

The backend accepts a historical transaction from either canonical monthly
product as the lookup trigger, then uses App Store Server API subscription
status as the authority for the current product. A superseded transaction
cannot overwrite a newer confirmed tier or retain a stale verification error.

Before each release, confirm in App Store Connect that both products remain in
group `22260570` with the documented levels.

## Google Play

The monthly tiers are separate subscription products. A Change action first
refreshes owned subscriptions, requires exactly one active Reverse Flow
subscription, retrieves that purchase token, and sends it through
`BillingFlowParams.SubscriptionUpdateParams`.

- $2.99 to $9.99: `CHARGE_PRORATED_PRICE`. The change is immediate and Google
  charges the price difference for the remaining billing period.
- $9.99 to $2.99: `DEFERRED`. The existing tier continues until renewal, when
  Google moves the customer to the lower tier.

If the old purchase token or replacement mode is absent, both JavaScript and
the packaged Android adapter fail closed before `launchBillingFlow`. The
initial monthly purchase remains a normal purchase only when no Change context
exists.

## Multiple active subscriptions

The backend keeps every verified source record for auditability and resolves
the highest active monthly amount for display. The app shows a duplicate-charge
warning, disables further tier changes, and leaves Manage Billing available.
It never cancels, consumes, refunds, or silently removes a subscription.

For a license-test account that already has both Google subscriptions:

1. Open Google Play, select the profile used for the test, then open
   **Payments & subscriptions > Subscriptions**.
2. Open one Reverse Flow subscription and cancel it. Keep the intended tier.
3. Wait until Google reports only the intended product active, then reopen
   Reverse Flow and use **Having trouble with your subscription? Refresh
   status**.
4. Confirm the duplicate warning disappears before testing another tier
   change.

Do not test the Change action while both products remain active.

## Verification and identity

Apple sources are keyed by original transaction ID; Google sources are keyed
by purchase token. Both attach to the same normalized-email Supporter identity.
Provider transaction history remains separate and auditable, while Supporter
registration and the welcome email remain idempotent.
