# Supporter System V2

Supporter System V2 separates store billing from Reverse Flow identity.

## Sources of truth

- Apple App Store or Google Play is the only source for purchase availability,
  active monthly tier, restoration, subscription changes, and store completion.
- The Reverse Flow backend is the only source for a claimed Supporter profile,
  chosen name, email, badge, public-listing preference, Supporting Since date,
  and welcome-email state.

The app queries these systems independently. A failure in one must not mutate or
hide state from the other.

## Client state

Normalized billing states:

- `never-purchased`
- `active-monthly-3`
- `active-monthly-10`
- `previously-supported`
- `billing-unavailable`

Normalized claim states:

- `unclaimed`
- `claimed`

Store approval is written to the privacy-safe local completion marker before the
app acknowledges, consumes, or finishes the transaction. Store completion no
longer waits for a backend request or Supporter profile claim.

On Android, both monthly choices are offers under one Google Play product:

- `support_reverse_flow_subscription` / `monthly-3`
- `support_reverse_flow_subscription` / `monthly-10`

Offer tokens are read from Google Play at runtime. Subscriptions are
acknowledged independently of the Supporter Registry and are never consumed.
Changing plans passes the active purchase token back to Google Play; upgrades
use immediate prorated replacement and downgrades use deferred replacement.

The local Supporter cache contains the last backend-confirmed identity for
offline presentation. It is not purchase proof and cannot alter billing UI.

## Backend state

`POST /api/supporters/claim-supporter` accepts only:

```json
{
  "name": "Chosen public name",
  "email": "supporter@example.com",
  "public": true
}
```

Migration `202607240007_supporter_claim_profiles.sql` adds the idempotent
`claim_supporter_profile` RPC. It updates identity by normalized email, retains
the earliest existing Supporting Since date, and creates no billing source.

`GET /api/supporters/status` returns claim state only. It does not read
`supporter_sources` or return recurring status, products, tiers, or transaction
history.

## Compatibility and migration

Historical `supporter_sources`, pending-verification records, notification
records, and migrations are retained. They are not deleted or rewritten.
Legacy verification and native purchase endpoints remain server-side during the
incremental migration so older released clients fail safely. Supporter V2 mobile
clients do not configure or call those endpoints. The compatibility verifier
accepts the historical monthly product IDs only for Apple; Android accepts only
`support_reverse_flow_subscription` with one of the two canonical base plans.

After the V2 app has replaced older clients, the compatibility endpoints and
their private reconciliation jobs can be retired in a separate migration. That
retirement must not delete historical records.
