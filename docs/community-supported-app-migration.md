# Community-Supported App Migration

> Reverse Flow is a community-supported platform built by firefighters, with firefighters, for the fire service. Production tools are available to everyone. Supporters help build what comes next.

## Pass 1 app contract

- Every production calculator, tool, saved-data workflow, reference, setting, and export is available without a purchase or network check.
- The legacy `reverse_flow_pro_lifetime` Apple/Google product remains registered only to detect eligibility for a permanent Supporter claim.
- Supporter status never unlocks production functionality.
- One-time and recurring contributions voluntarily support development. Every amount provides identical Supporter status.
- Apple and Google remain the billing authority for recurring contributions. Cancellation or expiration does not remove permanent Supporter status.
- Founding Supporter, rankings, tiers, public profiles, and social functionality are intentionally excluded from v1.
- Operational functionality remains offline-first. A failed Supporter refresh retains the last registry-confirmed cached state.

## Deferred registry boundary

The Reverse Flow Website Supabase project will become authoritative in a later pass. Pass 1 provides `SupporterRegistryService`, `SupportPurchaseService`, and `SupporterCache`; its production registry methods intentionally return unavailable errors and never fabricate confirmation.

Expected future endpoints:

### `POST /supporters/claims/legacy`

Request: `name`, `email`, `platform`, `legacyProductIdentifier`, `verifiedEntitlementState`, optional `originalTransactionId` or purchase token, `appVersion`, and `claimTimestamp`.

Response: a registry-confirmed Supporter record containing `isSupporter: true`, `supporterSince`, `source`, contribution state, and `lastVerifiedAt`.

### `POST /supporters/purchases`

Request: `name`, `email`, `platform`, `paymentSource`, `productIdentifier`, `purchaseType`, recurring flag, optional monthly amount, verified transaction ID or purchase token, `purchaseTimestamp`, and `appVersion`.

Response: the same registry-confirmed Supporter record shape.

### `GET /supporters/status`

Returns confirmed identity and contribution state. Network or registry failure must retain the last confirmed cache and mark it stale/offline.

## Store configuration still required

The Apple and Google identifiers for one-time $5, monthly $3, and monthly $10 support are deliberately `null` in centralized `SUPPORT_PRODUCT_CONFIG`. App Store Connect and Google Play Console products, pricing, subscription groups/base plans, review metadata, and verified transaction registration must be configured before contribution buttons can become active.
