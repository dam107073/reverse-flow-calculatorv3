# Community-Supported App Migration

> Reverse Flow is a community-supported platform built by firefighters, with firefighters, for the fire service. Every firefighter has access to every tool. Supporters help build what comes next.

## Pass 1 app contract

- Every production calculator, tool, saved-data workflow, reference, setting, and export is available without a purchase or network check.
- The legacy `reverse_flow_pro_lifetime` Apple/Google product remains registered only to detect eligibility for a permanent Supporter claim.
- Supporter status never unlocks production functionality.
- One-time and recurring contributions voluntarily support development. Every amount provides identical Supporter status.
- Apple and Google remain the billing authority for recurring contributions. Cancellation or expiration does not remove permanent Supporter status.
- Founding Supporter, rankings, tiers, public profiles, and social functionality are intentionally excluded from v1.
- Operational functionality remains offline-first. A failed Supporter refresh retains the last registry-confirmed cached state.

## Pass 3B live registry boundary

The Reverse Flow Website Supporter Directory is authoritative. The app calls only its public HTTPS API; it never calls Supabase directly and contains no privileged backend credential.

Current TestFlight/Internal Testing configuration:

- environment: `preview`;
- base URL: `https://reverese-flow-website-dam107073-reverse-flow-llc.vercel.app`;
- legacy claim: `POST /api/supporters/claim-legacy`, 15-second timeout;
- status lookup: `GET /api/supporters/status` with the normalized registered
  email in `X-Supporter-Email`, 10-second timeout.

Future production convention:

- environment: `production`;
- base URL: `https://reverse-flow.app`;
- unchanged route paths and response contract.

Claim requests send trimmed name, lowercased/trimmed email, native platform, the exact `reverse_flow_pro_lifetime` product ID, the platform-specific evidence object, optional original purchase timestamp, app version, and claim timestamp. Apple evidence uses `originalTransactionId`; Google evidence uses `purchaseToken`. The app refreshes store evidence immediately before submission and never converts local ownership into Supporter status.

Successful claim and status responses must contain the stable Supporter Directory response shape, including syntactically valid `lastVerifiedAt`. A Supporter confirmation must also contain a valid server-owned `supporterSince` date and source. Malformed, non-2xx, timeout, offline, `429`, `502`, and `503` responses cannot create or downgrade cached Supporter identity.

The cache keeps only the newest backend-confirmed Supporter response plus the
normalized email required for later status lookup and the relevant app
platform. It exists for startup, offline badge persistence, and a visible
"Last confirmed" state. It is not purchase evidence and is never populated by
StoreKit, Google Billing, or an unverified local flag. Status refresh is
non-blocking at launch, resumes no more than once per minute, and never delays
calculators or tools. A network failure retains the last confirmed identity.

## Permanent identity and purchase recovery

Store transactions and Supporter identity are separate:

- Apple and Google transaction evidence is used once by the backend to verify a
  contribution.
- The Supporter Directory permanently owns identity, `supporter_since`, source,
  and current recurring status after registration.
- **Recover Supporter Status** performs only an email-based directory lookup.
  It does not access StoreKit, restore a purchase, or send a welcome email.
  The lookup is provider- and platform-neutral: Stripe, Apple, Google, and
  legacy-claim Supporters can recover on iOS or Android with the same normalized
  registered email.
- Subscription refresh and the original lifetime-PRO claim keep their existing
  store history flows.
- Apple one-time support is a consumable and is never represented as restorable
  purchase history.

The iOS `SupportPurchaseRecovery` bridge observes `Transaction.updates` and
scans `Transaction.unfinished` for the exact
`reverse_flow_support_one_time_5` product. Only when a verified unfinished
transaction exists does the page expose **Finish Becoming a Supporter**. The
app persists a narrow retry record containing the transaction reference and
product, verifies/registers it through the backend, persists and rereads the
backend-confirmed Supporter cache, and then calls `finish()`. The retry record
is cleared only after store completion succeeds.

Welcome-email delivery is a separate backend operation. A delayed, failed, or
manually retried welcome email never rolls back Supporter identity, prevents
the badge, keeps the registration form visible, or holds an Apple/Google
transaction open.

Store-specific state controls only active financial-support management. An
expired or canceled monthly contribution changes recurring-management state but
does not remove permanent Supporter identity, its badge, or `supporter_since`.

## In-app support changes

The two monthly products keep their canonical identifiers on both stores:

- `support_reverse_flow_monthly_3` (`monthly-3` on Google Play)
- `support_reverse_flow_monthly_10` (`monthly-10` on Google Play)

An active subscriber sees the other monthly amount in **Manage Your Support**
and can confirm the change in the native store. Apple uses the alternate
product in the same subscription group. Google Play sends the current purchase
token as `oldPurchaseToken`; an increase uses
`IMMEDIATE_AND_CHARGE_PRORATED_PRICE`, while a decrease uses `DEFERRED` so it
takes effect at the next renewal. A scheduled replacement disables additional
monthly changes until the backend status no longer reports it.

Confirmed Supporters may also purchase
`reverse_flow_support_one_time_5` again on either platform. The contribution
still follows backend verification, durable pending-state, cache-confirmation,
and store-completion rules, but it reuses the existing backend identity,
preserves the original `supporter_since`, skips the registration form, and
does not trigger another automatic welcome email.

`POST /api/supporters/register` remains server-to-server only. Native purchase
registration uses `POST /api/supporters/verify-purchase`.

## Pass 4F transaction isolation

One-time and subscription transactions use separate durable pending-record
keys. A historical store callback cannot create new pending state: redelivery
is actionable only when its provider, canonical product, and privacy-safe
transaction reference match a record that was persisted when the purchase was
approved. Repeated callbacks for the same provider transaction share one
backend reconciliation and one store-completion attempt.

The current monthly product is resolved in this order:

1. current verified App Store or Google Play state;
2. current backend recurring state;
3. the newest backend-confirmed local cache;
4. historical callbacks as supporting evidence only.

Apple verification queries the subscription group and records the current
canonical product returned by App Store Server API, even when the triggering
callback references the previous plan. Google plan replacement continues to
use the current purchase token and authoritative Subscriptions V2 response.

If the backend-confirmed cache shows permanent Supporter identity, a completed
one-time registration marker is retained only while StoreKit still exposes the
unfinished transaction. When StoreKit reports no unfinished transaction and
the marker is already in a confirmed finish-retry state, the app clears that
stale operational marker without changing Supporter identity.

## Native analytics

The mobile applications contain no Meta/Facebook SDK, App Events bridge,
native initialization, URL scheme, client token, Swift Package dependency, or
Android dependency. Reverse Flow does not request App Tracking Transparency
permission. Website analytics are maintained separately in the website
repository and are outside the native application package.
