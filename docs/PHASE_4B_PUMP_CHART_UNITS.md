# Phase 4B: saved Pump Chart screen presentation

Implemented September 23, 2026. Scope ends at saved setup rows and the existing unlinked setup-detail renderer. No new navigation, migration, stored packet, hydraulic formula, export conversion, or widget change.

## 1. Pre-edit findings and baseline

Saved inputs are canonical U.S. values/IDs, often numeric strings. Newer results contain version-1 `canonicalRequiredPdp`, `canonicalOperational`, or `canonicalMultiLine` packets alongside U.S. compatibility snapshots. Compatibility names do not establish hydraulic meaning. Apparatus `totalFl` represents nozzle pressure; its `flPer100` represents elevation loss. Standpipe's corresponding slot represents supply flow. Split Lay contains component summaries. Required PDP's reaction slot can describe dual supply rather than force.

Captured 11 deterministic U.S. fixtures before production edits: all six eligible modes, fog, smoothbore/custom C, fixed fog, supply/attack, apparatus/device/elevation, asymmetric Split Lay and Standpipe, warning-bearing legacy data, unknown equipment, and an imported legacy preset. The fixture stores exact setup-row HTML, detail HTML, and configuration/reference/input/breakdown projections. Post-edit comparison remains exact. Collection cards have no hydraulic quantities and are unchanged. Wye eligibility remains unchanged.

## 2. Files changed in this phase

- `www/js/pump-chart-units.js`: new pure screen adapter.
- `www/js/app.js`: screen-only integration, cached projections, preference refresh.
- `www/css/components.css`: muted informational legacy label.
- `www/index.html`: adapter script and asset revisions.
- `www/tools.html`: shared app asset revision only.
- `www/settings.html`: accurate conversion-scope description and app asset revision.
- `tests/pump-chart-units.test.js`: semantic and purity tests.
- `tests/browser/pump-chart-units.cjs`: isolated browser baseline/interactions.
- `tests/fixtures/pump-chart-us-baseline.json`: pre-edit U.S. fixtures.
- This report. Capacitor copied shared web assets into both native bundles.

Pre-existing workspace changes from earlier phases were retained.

## 3. Adapter architecture

`ReverseFlowPumpChartUnits.present(setup, preference, legacyProjection, catalog)` returns typed display values `{text, legacy}`. It has no DOM, storage, normalization, timestamps, calculator state, or historical hydraulic recalculation. It uses existing unit conversions/formatters. U.S. returns null, delegating to the original compatibility presentation.

Packet version and mode must match. Result quantities must be finite numbers; canonical input numbers/numeric strings are accepted explicitly. Formatted strings are never parsed as measurements. Unsupported/missing components use literal compatibility text. There is no dependency on `ReverseFlowPumpPanelUnits`.

## 4. Mode mappings

| Mode | Trusted source and treatment |
|---|---|
| Required PDP | `canonicalRequiredPdp`: captured flow, rounded PDP, NP, FL/reference FL, force and Turbo loss; canonical hose/length/rating inputs. Smoothbore supply descriptions are not interpreted as force. |
| Reverse Flow | Matching `canonicalOperational`: rounded flow, supplied PDP, achieved NP, attack/supply losses and force. Canonical inputs supply hose dimensions/configuration. |
| Apparatus Mounted | Matching operational packet: flow, rounded PDP, NP, device/elevation loss and force. Physical elevation comes from canonical feet. Overloaded breakdown slots use their actual semantics. Unproven legacy stream descriptions remain literal. |
| Relay | Matching operational packet: flow/PDP/residual and losses. Residual is not nozzle pressure. Canonical target flow, distance and residual inputs remain independently usable. |
| Split Lay | Matching multiline packet: supply components and each actual attack branch's flow/NP/FL/force. Independent nested hose lengths/IDs remain separate; counts remain counts. |
| Standpipe | Matching multiline packet: total flow/PDP, supply loss/flow, standpipe loss, driving line and each branch. Reaction follows the saved driving line. Floors remain floor numbers. |

Missing/partial packets never manufacture values. Ambiguous duplicate masterstream/reverse-supply section labels retain their existing text when a unique semantic source cannot be established.

## 5–8. Rows, details, legacy and warnings

Setup rows use selected-unit configuration and hydraulic summaries where trusted. Field-level U.S. and Metric values can coexist. The detail renderer applies the same adapter to reference sections, key inputs and calculation breakdown. Its existing disclosure/action structure remains intact; no route/button exposes it.

Legacy/imported charts can convert independent canonical inputs while retaining historical results. Unknown equipment IDs/descriptions remain literal. Missing composite results preserve the entire original value once, rather than duplicating it into inferred components. Metric legacy values carry the muted `Saved details · U.S.` context; U.S. presentation has no added label.

Warnings remain exact saved text, with a Metric-only U.S. context label on the warning section. Names and notes are never unit-parsed. No warning thresholds are re-evaluated.

## 9. Saved reference distance and precision

A saved FL /100-ft measurement remains the pressure loss for exactly 100 ft, shown as **FL /30.48 m**. Only its pressure unit changes. A numerical test converts the saved PSI directly and independently compares it with PSI scaled by `metresToFeet(30)/100`; both raw and displayed results differ. Thus this screen does not substitute the interactive Tool's 30-m reference.

Screen precision: bar 1 decimal, kPa and L/min whole numbers, lengths up to 2 decimals, physical tip diameters up to 4 decimals, force whole N/kgf, using centralized formatting. Canonical values are untouched. Factory hose 1.75 uses nominal 45 mm; a physical 1.75-inch diameter uses 44.45 mm; a 1⅛-inch tip uses 28.575 mm. Unknown descriptions are not reverse-mapped.

## 10–11. Reload, dirty state and writes

Reload still restores canonical inputs and recalculates in the current calculator environment. This intentionally differs from browsing a frozen saved snapshot. Explicit Update Setup retains existing ID/creation timestamp behavior and updates only through the existing action.

New preference refresh uses the already-loaded chart plus cached U.S. projections, preserves disclosure state, and passes `persist:false`. Browser spies prove **zero Pump Chart writes from this new screen refresh**, with byte-identical records through repeated U.S./bar/kPa switching.

Existing `loadPumpCharts()` normalization still writes on normal lifecycle reads. Existing calculator dirty-state lookups may invoke it during preference processing. Tests separately demonstrate those writes and stable bytes; this phase does not claim every complete preference/navigation event is write-free. Settings return/Browser Back preserve canonical comparable inputs, no false dirty state, and chart bytes for supported fixtures. No migration is introduced or invoked by the pure adapter.

## 12–14. U.S., Metric and multiline results

All 11 exact pre-edit row/detail HTML baselines pass. Bar/kPa rendering uses typed saved quantities; poisoned compatibility numbers cannot override packet-backed results. N/kgf comes only from proven force quantities. Repeated conversion leaves original record/projection objects unchanged.

Browser coverage includes U.S.-saved → Metric, Metric-originated L/min edit → explicit update → U.S. display/reload, Settings return, Browser Back with normal cache behavior and with BFCache disabled. Canonical input/ID/order/timestamp comparisons and legacy/warning comparisons are exact; converted numeric checks use floating-point tolerance where appropriate. Asymmetric multiline branches remain independent. Current coefficient changes do not change the cached historical screen.

## 15. Pump Panel and earlier regressions

All established browser suites passed: foundation, Required PDP, operational modes, multiline modes (including Wye), Phase 3A Tools, Phase 3B supply Tools, Phase 3C friction Tools, and Phase 4A Pump Panel.

Pump Panel coverage remains green for six-mode capture, legacy/structured/mixed incidents, canonical aggregates, picker, add/replace/delete/end, detached snapshots, source changes/deletion, U.S. parity, bar/kPa, incident byte preservation and Settings/Back. Its adapter and capture behavior were not changed.

## 16. Browser/mobile review

Automated browser interaction and overflow/clipping assertions ran at 390 × 844 in U.S., bar and kPa. Screenshots reviewed setup rows, structured/legacy detail, multiline data and the literal warning section. Values/labels/actions remain usable and the legacy label is secondary. No native-device interaction was performed.

## 17–18. Validation results

- New adapter tests: 20 passed.
- Full Node suite: 401 total, 400 passed, one known unrelated failure.
- Failure: release-version assertion expects Android 155; source declares 156. Neither changed.
- Exact U.S. browser baselines and Metric interaction tests passed.
- All eight prior-phase browser suites passed.
- Tank Time and Required PDP Swift widget regression executables passed; widget sources unchanged by this phase.
- iOS and Android Capacitor synchronization passed.
- All 53 `www` source files byte-match both native web bundles.
- JavaScript syntax and diff whitespace checks passed.
- Pump Operator Package module remains byte-identical to its pre-phase copy; its existing Node regression coverage passed. Shared export-formatting helpers were not modified.

No store release build, commit, push or deployment occurred.

## 19–21. Limits, completion and next scope

**Saved Pump Chart on-screen presentation is unit-conversion complete within the approved field-level hybrid scope.** Some historical results, ambiguous source descriptions and warnings intentionally remain U.S. Unknown/future packets safely fall back. Existing write-on-read normalization remains an acknowledged lifecycle constraint, not a new unit-conversion write.

Next scope should be a separate Pump Operator Package/export audit and phase: define selected-unit output contracts for preview, PNG/PDF, worksheets and reference tables; distinguish frozen historical quantities from intentional generated grids; establish exact U.S. export baselines and the same legacy policy before implementation. None of that work was begun here.
