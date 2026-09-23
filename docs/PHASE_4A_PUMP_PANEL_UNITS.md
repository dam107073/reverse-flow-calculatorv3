# Phase 4A — Pump Panel / Attack Pumper

Implemented the approved hybrid snapshot strategy. No incident migration, hydraulic recalculation, source-setup reconstruction, broader Pump Chart/export conversion, or widget changes.

## Pre-edit evidence and U.S. baseline

The existing nine Pump Panel tests passed before production edits. A new isolated-browser harness captured deterministic saved setups and card/header text before editing production code, now retained in `tests/fixtures/pump-panel-us-baseline.json`.

The baseline contains Required PDP fog and smoothbore/custom-C setups, Reverse Flow with supply and attack hose, Apparatus Mounted smoothbore/device/elevation, Relay, asymmetric Split Lay, and asymmetric Standpipe. It captures single/multiple lines, differing flows/PDPs, supply/attack FL, Apparatus PDP-minus-NP fallback, and accepted fractional numeric-string records with tied maximum PDP. Post-edit browser comparisons match the entire baseline exactly after excluding the deliberately additive packet. Existing workflow handlers are unchanged and are exercised by the expanded browser suite.

Confirmed architecture: calculator → saved Pump Chart setup → existing compatibility adapter → detached incident snapshot. `line.gpm` and `line.pdp` are frozen canonical U.S. numbers (sometimes rounded by the existing save boundary). FL and hose descriptions are flattened strings. A card tap replaces from a saved setup; it does not edit a hydraulic configuration. Array order and current ID replacement behavior remain unchanged.

## Files changed in this phase

- `www/js/pump-panel-units.js`: dedicated capture/presentation adapter using existing `ReverseFlowUnits` conversions and formatting.
- `www/js/app.js`: additive capture hook, scoped card/picker rendering, and render-only Pump Panel preference refresh.
- `www/css/components.css`: secondary legacy label and Metric-only layout/typography for explicit units and longer values.
- `www/index.html`: new adapter script and asset versions.
- `www/settings.html`: accurate unit-support scope explanation and app asset version.
- `www/tools.html`: shared app script version only.
- `tests/pump-panel-units.test.js`: canonical packet, conversion, ambiguity, precision and no-drift checks.
- `tests/pump-panel.test.js`: adapter dependency in existing VM harness and dynamic-unit label assertions; original behavior assertions remain.
- `tests/browser/pump-panel-units.cjs`: pre/post baseline plus isolated browser interaction tests.
- `tests/browser/units-foundation.cjs`: obsolete “Pump Panel stays U.S.” expectation replaced with Metric presentation plus unchanged-state assertion.
- `tests/fixtures/pump-panel-us-baseline.json`: pre-edit deterministic data/text.
- This report.

The checkout already contained approved Phase 1–3C changes. They are not attributed to this phase. Capacitor copies mirror shared web assets in both native bundles.

## Optional schema

The existing `reverse-flow-attack-pumper-incident-v1` key, version, validity filter, metadata and compatibility fields are unchanged. New/replaced lines may additionally contain:

```js
displayCanonical: {
  version: 1,
  // Independently optional display group; no PDP-minus-NP inference.
  losses: [{ role: "hose" | "supply" | "attack", psi: number }],
  // Independently optional display group.
  summary: {
    kind: "hose",
    hoses: [{ hoseId: string, lengthFeet: number }],
    pressure: { role: "nozzle", psi: number } // optional
  }
  // Alternative summary for an existing Apparatus nozzle description:
  // { kind: "nozzle", type: "smoothbore" | "automaticFog" | "fixedFog",
  //   pressure: { role: "nozzle", psi: number },
  //   diameterInches?: number, ratedFlowGpm?: number, ratedPressurePsi?: number }
}
```

Absent, unknown-version or invalid optional components fall back to unchanged compatibility text. No packet is required for incident validity. Packet fields are copied scalar values/arrays, not live references. No coefficient database, input model, reaction/volume/velocity state or source lookup is added.

All U.S. rendering continues to use compatibility text. Existing top-level GPM/PDP are never replaced by raw calculator precision. Captured FL uses the existing one-decimal canonical snapshot precision, checked against compatibility text. Multiline NP preserves its existing whole-PSI snapshot precision. Those comparisons verify a known generated representation; they do not extract quantities from historical text.

## Source-mode mappings

Capture requires a supported version-1 canonical result packet. Legacy setups without one still create valid legacy incident snapshots through the unchanged eligibility path.

| Source | Structured data used | Conservative fallback |
| --- | --- | --- |
| Required PDP | `canonicalRequiredPdp.frictionLossPsi`; ordered structured hose IDs/feet; proven `nozzlePressurePsi` | Unknown hose categories or NP mismatch retain summary text |
| Reverse Flow | `canonicalOperational.frictionLossPsi`, or supply/attack FL; ordered supply/attack hose inputs; canonical NP only when it agrees with the current row meaning/value | Input NP that does not match the canonical result is not asserted to be achieved NP |
| Apparatus Mounted | `canonicalOperational.nozzlePressurePsi`; smoothbore catalog physical diameter, automatic fog, or structured fixed-fog rating, when the saved description is the mode's setup description | Existing FL fallback remains U.S.; it is not declared to be hose friction |
| Relay | `canonicalOperational.frictionLossPsi`; hose summary only when it contains no unproven NP detail | Typical existing `NP 55` remains the complete U.S. summary; residual pressure is never substituted for NP |
| Split Lay | First supply FL and actual first attack FL/NP from `canonicalMultiLine`; all currently displayed ordered hose sections | Keeps current first-line display semantics; does not redesign branch summaries |
| Standpipe | Supply FL and first attack FL/NP from `canonicalMultiLine`; all currently displayed ordered hose sections | Same conservative component fallback |

Wye receives no new capture mapping and no new save/eligibility path. Existing data-based picker eligibility is unchanged.

## Rendering and precision

- Metric Flow and Total Flow: L/min, whole-number display.
- Metric Gate To and header PDP: bar with up to one decimal, or whole kPa. Gate To's label explicitly names the pressure unit.
- Structured FL/NP: explicit bar/kPa suffixes.
- Hose lengths: metres with up to two decimals; canonical feet are unmodified.
- Factory hose IDs: established nominal mm mapping, including 1.75 → 45 mm and dual3 → Dual 76 mm.
- Apparatus smoothbore physical diameter: mathematical mm conversion with up to four decimals, e.g. 1⅛ in → 28.575 mm. A physical 1.75 in measurement renders 44.45 mm, not nominal 45 mm.

Legacy lines convert operational numeric Flow/Gate To, while FL/hose text remains exact. In Metric, the affected secondary area receives a muted “Saved details · U.S.” label. In U.S., that label is absent. Partial packets convert only their trustworthy group: for example, an Apparatus nozzle description converts while its ambiguous FL remains U.S.; Relay FL converts while its ambiguous NP-containing summary remains U.S.

New and legacy lines coexist independently. No line or incident is upgraded during rendering, reload, Settings navigation or unit switching.

## Aggregates, workflows and detachment

Aggregation is unchanged: sum canonical GPM, and select maximum canonical PSI, then convert the final result. Explicit fractional coverage shows two 1.2-GPM lines display an aggregate of 9 L/min, although individually rounded displays would sum to 10. Tied PDPs remain unchanged. The permissive legacy loader is unchanged.

Browser tests exercise add, replacement retaining ID, duplicate-source addition, missing replacement target appending, keyboard deletion, pointer swipe deletion, End Incident cancellation and confirmation. The existing handlers are unchanged. The confirmation is a browser-native dialog; its accept/dismiss behavior was tested, not claimed as native-device UI testing.

Changing/deleting the source chart and changing a coefficient leaves captured incident bytes unchanged, including after reload. Unit changes never recapture a line.

## Settings, picker and storage safety

Pump Panel joins the existing preference refresh with a render-only branch. Populated U.S. → bar → kPa → U.S. cycles preserve serialized incident bytes, IDs, timestamps, order, numeric values and packet values. Settings return and Browser Back pass both ordinary navigation and a run with back-forward cache disabled.

The scoped Add/Replace picker converts numeric flow/PDP and available structured summaries, retaining explicitly U.S. ambiguous descriptions. Ordinary Pump Chart list/detail and export formatting are unchanged. Tests normalize chart fixtures once, then verify picker rendering leaves their bytes unchanged. The existing `loadPumpCharts()` normalization-on-read behavior is not altered or expanded.

Metric-originated explicit L/min entry is tested through the real Required PDP control, saved canonical setup, and Pump Panel capture; switching back to U.S. preserves the captured incident exactly.

## Validation

| Check | Result |
| --- | --- |
| Pre-edit Pump Panel suite | 9 passed |
| New focused Node tests | 15 passed |
| U.S. browser golden snapshots | Exact parity for all seven fixture setups across six source modes, single/multiple/fractional incidents |
| Legacy/structured/mixed, nominal/physical diameter, no heuristic conversion | Passed |
| Aggregate sum/max, tied/fractional values | Passed |
| Add/replace/missing-target/duplicate/delete/End Incident | Passed |
| Source modification/deletion and coefficient detachment | Passed |
| Repeated preference switching and incident byte preservation | Passed |
| Settings return / Browser Back, including disabled bfcache | Passed |
| Metric-originated edit and picker presentation | Passed |
| 390px U.S./bar/kPa screenshots and layout assertions | Passed; fixed Metric clipping/wrapped flow values discovered during visual review |
| Phase 1 foundation browser suite | Passed |
| Required PDP, operational, multiline browser suites | Passed: all seven prior operational modes |
| Tools, supply Tools, friction Tools browser suites | Passed: all nine prior Tools |
| Full Node suite | 381 tests: 380 passed; one known unrelated Android version assertion |
| Tank Time Swift widget suite | Passed |
| Required PDP Swift widget suite | Passed |
| Capacitor sync | iOS and Android passed |
| Web-bundle equality | All 52 source files match each native bundle |
| JavaScript syntax and diff whitespace | Passed |

Known unrelated failure: the release-version assertion expects Android 155 while unchanged source declares 156. Neither source version nor its test was modified.

No native-device interaction or store release build was performed. Widget source is unchanged. No commit, push or deployment was performed.

## Completion and next boundary

Pump Panel is unit-conversion complete within the approved hybrid scope. Retained U.S. details are deliberate safety behavior, not incomplete guessing. Historical descriptions cannot become fully Metric without trustworthy structured data; replacing a line with a supported modern setup may provide that data as a new explicit capture.

Recommended next scope: saved Pump Chart list/detail presentation, using its existing canonical packets with a separately reviewed legacy fallback policy. Keep package/PDF/PNG exports and widgets out of that next presentation phase unless explicitly authorized. No work on that scope was begun.
