# Website-backed Resources architecture

## Authority boundary

The Reverse Flow website is the authoritative source for all community-managed content. The mobile applications consume published resources through public APIs and do not bundle or independently maintain those datasets.

The app owns operational tools, calculators, widgets, settings, local equipment defaults, saved hose profiles, pump charts, and other saved user data. The website owns the Training Directory, Hose Library, Articles, submission/editorial workflows, administration, and public content APIs. A resource cache is only a last-known-good performance and resilience layer; it is never an editable or authoritative dataset.

## Public app contracts

| Resource | Production endpoint | Required app-facing fields | Paging |
| --- | --- | --- | --- |
| Training Directory | `https://reverse-flow.app/api/training-directory/listings` | `listings[].id`, `slug`, `title`; optional summary, specialties, service area, delivery type, and public image paths | Complete published feed |
| Hose Library | `https://reverse-flow.app/api/resources/v1/libraries/hose/items?limit=100` | `schemaVersion=resources-public-v1`, `library=hose`, item ID, manufacturer, name, canonical path, pagination, and total; optional diameter, lifecycle, origin, verification, qualifier, and summary fields | Cursor pages are followed until the coherent item count equals `total`; duplicate IDs are collapsed |
| Articles | `https://reverse-flow.app/api/resources/articles/app-summary` | `items[].id`, title, summary, `article` or `field_note` type, and canonical URL; optional category, author/supporter number, cover image, dates, reading time, and featured data | Complete latest-first app feed (currently capped by the website contract) |

Only published projections are consumed. Unknown additive fields are ignored. Missing optional fields are tolerated. Structurally incompatible or partial responses fail validation and never replace a good cache.

## Fetch and cache policy

`www/js/resources-data.js` provides one request/cache/state layer with dedicated normalizers for each resource schema. Each resource has an isolated versioned local cache. A screen renders valid cached data immediately and revalidates in the background. Automatic attempts are coalesced for 60 seconds; data older than 15 minutes is marked stale until revalidation succeeds. Pull-to-refresh and the Refresh button force revalidation.

Requests time out after 12 seconds. ETag is preferred, with Last-Modified as a fallback, when the endpoint supplies either validator. A `304` advances the fetched timestamp without rebuilding content. Network, timeout, server, parsing, structural, and incomplete-pagination failures preserve the prior cache. First-time offline and first-time error states remain explicit and retryable.

Images and canonical links must resolve to HTTPS on `reverse-flow.app`. Training links are restricted to `/training-directory/`, hose links to `/resources/hose-library/`, and article links to `/resources/articles/`. Full detail pages use the existing app behavior: a new browser context through `window.open`, with same-window navigation as the popup-blocked fallback.

## Legacy Hose Library dependency inventory

The removed catalog was confined to `www/js/data/references.js` and the old renderer in `www/references.html`. Its catalog rows were not imported by Reverse Flow, Required PDP, Relay, Split Lay, Equipment Defaults, Pump Charts, saved setups, widgets, or hose-size selectors.

Operational hydraulics remain independent:

- factory hose sizes and coefficients remain in `www/js/data/hydraulics.js`;
- active coefficients continue through `getActiveHoseCoefficient()` and `reverse-flow-hose-coefficients-v1` overrides;
- local “My Hose Profiles” remain in `reverseFlowCustomHoseProfiles` and are loaded by `www/js/app.js`;
- existing profiles copied from a former reference card retain their stored coefficient, size mapping, and source metadata;
- default-profile and legacy `reverse-flow-hose-library-selections-v1` compatibility storage remains untouched;
- calculators, saved setups, pump charts, and widgets store operational values/IDs rather than live Hose Library catalog records.

Therefore the bundled catalog, disabled overlay/merge/reconciliation path, catalog-to-profile action, mock Training Directory dataset, and equipment-reference renderer could be removed without migrating or deleting user data. Old Hose Library query routes now land on the fetched summary browser.
