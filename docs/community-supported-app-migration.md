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
- Subscription refresh and the original lifetime-PRO claim keep their existing
  store history flows.
- Apple one-time support is a consumable and is never represented as restorable
  purchase history.

The iOS `SupportPurchaseRecovery` bridge observes `Transaction.updates` and
scans `Transaction.unfinished` for the exact
`reverse_flow_support_one_time_5` product. Only when a verified unfinished
transaction exists does the page expose **Complete Pending Support
Registration**. The app persists a narrow retry record containing the
transaction reference and product, verifies/registers it through the backend,
persists the backend-confirmed Supporter cache, confirms welcome-email
processing, and only then calls `finish()`. Any failure leaves the retry record
and StoreKit transaction unfinished.

`POST /api/supporters/register` remains server-to-server only. Native purchase
registration uses `POST /api/supporters/verify-purchase`.
