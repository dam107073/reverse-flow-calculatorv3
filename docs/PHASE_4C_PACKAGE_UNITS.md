# Phase 4C — Pump Operator Package unit support

Implemented September 23, 2026. Complete within the approved package-only scope and stopped for review.

## 1. Files changed

- `www/js/package-units.js`: pure export-specific semantic adapter and generated reference model.
- `www/js/pump-operator-package.js`: Metric-only HTML renderers/context/spacing; original U.S. renderers retained.
- `www/js/app.js`: package selection summaries, generation-time preference capture, export data integration.
- `www/index.html`, `www/tools.html`, `www/settings.html`: dependency order/cache revisions; Settings scope description updated.
- `tests/package-units.test.js`: semantic, numerical, purity, immutability tests.
- `tests/browser/package-units.cjs`: baseline capture/comparison, actual PNG/PDF rendering and browser interaction tests.
- `tests/fixtures/package-us-baseline.json`: pre-edit U.S. records, data/model/HTML and artifact hashes.
- This report. Capacitor copied the shared assets into both native bundles.

Earlier-phase workspace changes were retained. No widget source, hydraulic core, unit conversion constants, Pump Chart schema, Pump Panel adapter, screen adapter, or unrelated export was changed.

## 2. Export adapter architecture

Loaded records + current reference equipment + frozen preferences → pure export model → dedicated package HTML → PNGs → PDF.

`ReverseFlowPackageUnits` does not read DOM/storage, normalize charts, follow external source records, or recalculate historical setups. It does not call the Phase 4B screen adapter or Phase 4A Pump Panel adapter. Existing U.S. compatibility helpers remain unchanged; Metric uses explicit source-mode mappings and strict numeric validation. Version-1 packet/mode validation is required before reading numeric saved results.

References use existing `ReverseFlowHydraulics` functions and `ReverseFlowUnits` conversions. There are no new conversion constants or Metric hydraulic formulas.

## 3. Frozen preferences

Generate captures and freezes the current preferences before creating package data. The in-memory model retains that preference through HTML, asynchronous PNG generation, PDF generation and sharing. No preference is stored in a Pump Chart.

The browser test deliberately pauses PNG generation, changes bar to kPa, and resumes. The first model remains bar and unchanged. A subsequent Generate produces kPa. N/kgf changes leave package HTML identical because the package has no reaction field.

## 4. Saved setup behavior and mode mappings

| Mode | Metric source semantics |
|---|---|
| Required PDP | Captured flow/rounded PDP, typed total hose FL; canonical configured NP or proven fixed-fog NP; saved hose ID/feet and physical tip identity. |
| Reverse Flow | Captured rounded flow and supplied PDP, explicit attack/supply FL components. Configured NP remains configured NP; it is not replaced with inferred achieved pressure. |
| Apparatus | Captured rounded flow/PDP and elevation pressure. Ambiguous compatibility FL stays U.S.; PDP-minus-NP is not inferred as hose loss. |
| Relay | Typed flow/PDP/hose loss; saved hose dimensions. The generic NP compatibility field remains explicitly U.S.; residual is never relabeled NP. |
| Split Lay | Saved actual attack-line NP/FL, supply FL and total flow/PDP. Only the already-eligible one-attack/one-supply structure is exportable. |
| Standpipe | Saved line-1 NP/FL/elevation pressure, supply FL and total flow/PDP. Elevation is pressure, not metres. Existing complex structures remain ineligible. |

Saved operational rounding is retained where established: rounded PDP, captured flow rounding, one-decimal saved losses, and whole branch NP. U.S. presentation always uses the original compatibility values.

Factory hose IDs are converted only to approved nominal labels without changing IDs. Known smoothbore diameters use mathematical conversion, with up to four display decimals. A 1⅛-inch tip is 28.575 mm; a physical 1.75-inch tip is 44.45 mm, independently of the 1.75 hose category's 45-mm label.

## 5. Legacy fallback

Missing, invalid, future-version or semantically unavailable packet fields remain literal U.S. compatibility content. Unknown hose/nozzle descriptions remain compatibility text. A small `US` marker identifies affected cells, with one `US: Saved details · U.S.` explanation below the table. The table uses neutral column headings and explicit units on converted values rather than putting unmarked U.S. values under a Metric-only column heading.

Selection summaries also identify retained U.S. fields. No heuristic parsing was added. Existing permissive U.S. compatibility parsing remains isolated in the unchanged U.S. path/fallback preparation. Historical warnings remain omitted, matching existing package behavior.

## 6. Operator Worksheet

U.S. worksheet HTML remains exact. Metric labels are:

- L/min / Tip mm
- NP (bar or kPa)
- Hose (mm × m)
- FL (bar or kPa)
- Appliance
- Elevation (bar or kPa)
- PDP (bar or kPa)

Appliance remains an unspecified/identity entry because its existing semantics do not establish a pressure-only field. Elevation explicitly represents pressure contribution. Four blank rows and the existing workflow are preserved.

## 7. Generated FL table

U.S. remains 0–1000 GPM in 50-GPM steps, PSI per 100 ft, with unchanged rounding/output.

Metric uses 21 exact grid values, 0–4000 L/min in 200-L/min steps. Each value converts to canonical GPM, uses exactly 30 m converted to feet, and calls the existing canonical friction-loss function with the current coefficient. Display is three bar decimals or one kPa decimal, with a significant-digit fallback for tiny nonzero losses.

Visible supported hoses and existing saved-override/factory coefficient precedence remain unchanged. C is not converted; the legend states that C retains its U.S. convention. A current override affects this generated reference, not saved setup results.

## 8. Smoothbore references

Handline calculations remain exactly 50 PSI; masterstream calculations remain exactly 80 PSI. Existing tip visibility/range rules are unchanged, including the shared 1.25-inch boundary. Metric headers show approximate converted pressure equivalents; a short note states the exact canonical calculation points. Physical tip labels are mm and calculated flows are L/min. No force or velocity columns were added.

## 9–10. Static references and time context

Appliance Loss Guide, Common Formulas, and Dry Standpipe Quick Reference retain their original bodies/formulas/thresholds and receive `U.S. reference` title context in Metric packages. Additional Water Available stays unchanged and unit-neutral.

Page 1 identifies saved rows as historical snapshots. Page 2 identifies generated material as current equipment reference. Current coefficient/catalog/visibility settings are captured at generation; they do not become claims about historical setups.

## 11. Historical 30.48 m versus generated 30 m

A saved 100-ft reference remains exactly 30.48 m. The export adapter includes an explicit saved-reference projection/test; the current package's main FL cells are section totals, so it does not introduce a new per-distance column or mislabel those totals.

Numerical regression for C = 15.5 at 200 L/min:

- Canonical flow: 52.83441047162968 GPM.
- Generated 30 m: 98.42519685039369 ft → 4.258647776890955 PSI.
- Historical 100 ft / 30.48 m: 4.326786141321211 PSI.
- Ratio is 30 / 30.48 within floating-point tolerance; results differ.

No historical reference is scaled to the generated table's 30-m convention.

## 12. Eligibility

Existing confidence/section-count rules and ordering are unchanged: at most one supply section and exactly one attack section, maximum six selected setups, existing name limit and incomplete-structure rejection. No additional mode or multiline support was introduced. Existing package eligibility tests pass.

## 13–15. HTML, PNG, PDF and parity

Pre-edit fixtures capture 11 saved examples covering six source modes, fixed/automatic fog, smoothbore/custom C, supply/attack, device/elevation, legacy/imported and unknown-equipment records. Eligible Split Lay and Standpipe examples were calculated before capture. Models/HTML cover 1–6 rows and the existing dense inclusion/omission rules.

Post-edit U.S. models/HTML compare exactly. Representative normal/dense PNG SHA-256 hashes and rasterized PDF-page hashes match their pre-edit baselines exactly in the pinned Chrome environment. Variable PDF metadata is not compared as raw bytes.

Metric bar/kPa actual HTML, both PNG pages and both rendered PDF pages were generated. Visual review and DOM containment checks cover normal, six-row dense, eight-hose/ten-tip boundary, and long-name/mixed-legacy cases. Small Metric-only row/section spacing adjustments resolved the compact-reference boundary. No required content was removed. Existing static-module conditional inclusion rules remain unchanged.

Output remains exactly two U.S. Letter pages: 816 × 1056 CSS pixels, 2448 × 3168 PNG capture, 612 × 792 PDF points. No third page or native release build was introduced.

## 16. Immutability and sharing

Tests compare source objects before/after projection and mutate input preference/current reference objects after model creation; rendered artifacts remain unchanged. The browser test verifies Pump Chart bytes across preference switching, hashes generated PNG/PDF files, downloads both PNGs and the PDF, exercises share cancellation, and confirms artifact hashes remain identical. Regeneration picks up the new preference.

Native file-share behavior is covered by the existing mocked Capacitor tests. No native-device share interaction occurred. Existing native cache filenames/lifecycle are unchanged.

Existing chart-loader normalization can still write on normal export-entry reads; the new adapter does not write or migrate data. This phase does not claim the established loader became globally write-free.

## 17–19. Regression and validation results

- New adapter tests: 17 passed.
- Adapter plus existing package tests: 52 passed.
- Full Node suite: 418 total, 417 passed, one known unrelated failure.
- Known failure: Android version test expects 155 while source declares 156; neither changed.
- Package browser suite: exact U.S. artifacts; Metric files/layout; asynchronous preference freeze; regeneration; source/artifact immutability; download/cancel; current coefficient/visibility behavior passed.
- All nine prior browser suites passed: foundation, Required PDP, operational, multiline, Phase 3A Tools, Phase 3B supply Tools, Phase 3C friction Tools, Phase 4A Pump Panel, Phase 4B Pump Charts. Foundation was rerun after final script-order changes.
- Both Tank Time and Required PDP Swift widget suites passed; widget sources unchanged.
- Capacitor sync for iOS/Android passed; all 54 shared web source files match both bundles byte-for-byte.
- JavaScript syntax and diff whitespace checks passed.

## 20–22. Concerns, completion and next scope

Phase 4C is complete within the approved field-level hybrid package scope. Historical/ambiguous fields intentionally remain U.S.; no unsupported semantic reconstruction is introduced. Static U.S. teaching/reference content remains intentionally U.S. Current two-page raster PDF generation/file sizes are unchanged in architecture. Native-device sharing and physical printer output were not tested.

Recommended next scope is user review of representative packages and, if desired, native iOS/Android share/print acceptance testing. Widget conversion and educational internationalization would require separate approval and were not begun.

No commit, push, deployment, store release build, schema migration, or historical record rewrite was performed by the implementation.
