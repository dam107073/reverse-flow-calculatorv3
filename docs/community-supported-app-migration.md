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
- base URL: `https://reverese-flow-website-pkkuuucew-reverse-flow-llc.vercel.app`;
- legacy claim: `POST /api/supporters/claim-legacy`, 15-second timeout;
- status lookup: `POST /api/supporters/status`, 10-second timeout.

Future production convention:

- environment: `production`;
- base URL: `https://reverse-flow.app`;
- unchanged route paths and response contract.

Claim requests send trimmed name, lowercased/trimmed email, native platform, the exact `reverse_flow_pro_lifetime` product ID, the platform-specific evidence object, optional original purchase timestamp, app version, and claim timestamp. Apple evidence uses `originalTransactionId`; Google evidence uses `purchaseToken`. The app refreshes store evidence immediately before submission and never converts local ownership into Supporter status.

Successful claim and status responses must contain the stable Supporter Directory response shape, including syntactically valid `lastVerifiedAt`. A Supporter confirmation must also contain a valid server-owned `supporterSince` date and source. Malformed, non-2xx, timeout, offline, `429`, `502`, and `503` responses cannot create or downgrade cached Supporter identity.

The cache keeps only the newest confirmed Supporter response plus the normalized email required for later status lookup and the relevant app platform. Status refresh is non-blocking at launch, resumes no more than once per minute, and never delays calculators or tools.

The backend intentionally returns `503 legacy_verification_unavailable` until real Apple and Google server verification is configured. This is a normal fail-closed result: the claim form stays available, every tool remains available, and no Supporter record is fabricated.

`POST /api/supporters/register` is server-to-server only. The app does not call it or contain its registration token. The existing future purchase-registration abstraction remains unavailable until new store products and a verified server registration flow are implemented.

## Store configuration still required

The Apple and Google identifiers for one-time $5, monthly $3, and monthly $10 support are deliberately `null` in centralized `SUPPORT_PRODUCT_CONFIG`. App Store Connect and Google Play Console products, pricing, subscription groups/base plans, review metadata, and verified transaction registration must be configured before contribution buttons can become active.
