# Phase 3B implementation audit and validation

Scope: interactive Tank Time, Water Shuttle Estimator, and Estimated Remaining Supply. The source was inspected before edits, and U.S. browser fixtures were captured from an untouched source copy at `/tmp/reverse-flow-3b-baseline`. No widget or out-of-scope Tool was converted.

## Pre-edit findings

| Audit item | Tank Time | Water Shuttle Estimator | Estimated Remaining Supply |
| --- | --- | --- | --- |
| Inputs / direct DOM reads | `tankTimeSize.value`, `tankTimeCustomSize.value`, `tankTimeFlow.value` | `waterShuttleTargetFlow.value`; delegated tender index/field/value; delegated remove index. Tender objects hold tankSize, dumpSceneTime, timeToHydrant, fillTime, timeToScene | `remainingSupplyStaticPressure`, `remainingSupplyResidualPressure`, `remainingSupplyCurrentFlow`, `remainingSupplyTargetResidual`, `remainingSupplyCustomTarget` values |
| Calculated quantities | Total seconds; minute/second decomposition; an unused decimal-minute local | Per-tender cycle minutes and sustained GPM; total sustained GPM; surplus/deficit GPM; meets/below-target status | Static-to-residual pressure drop PSI; projected GPM via exponent 0.54; remaining GPM |
| Displayed results | Duration, tank gallons, flow GPM | Target GPM, tender count, sustained GPM, absolute surplus/deficit GPM, status; each tender gallons / cycle minutes = GPM | Current GPM, target PSI, remaining GPM; projection itself is not separately displayed |
| Labels / placeholders | Fixed `gal` labels; custom Gallons; flow GPM; results min/sec | Capacity Gallons; all four times Minutes; target placeholder 500; result gal/GPM/min | Numeric example placeholders 80/50/1000; target PSI option labels; custom psi; result psi/GPM |
| Validation / sanitization | `numberOrNull`; positive gallons and GPM; invalid result hidden | Target >0; capacity >0; each time >=0; cycle >0. `numberOrNull` yields null for blank/nonfinite text; existing null comparisons/sums allow blank or nonnumeric time to contribute zero if total cycle is positive. This established time behavior is preserved | Positive static PSI/current GPM; nonnegative residual/target; static strictly above residual and target; reject negative remaining flow. Missing fields follow the original parser/comparison behavior; malformed Metric edits are unavailable |
| Calculation path | Unchanged `H.tankTimeSeconds`: round(gallons / GPM × 60) | Existing local tender validation returns capacity / sum of four times; sum flows and subtract target | Unchanged `H.estimatedSupply`: currentFlow × ((static − target)/(static − residual))^0.54; subtract current flow |
| Canonical defaults / thresholds | First capacity 500 gallons; custom/flow blank | First/new tender 3000 gallons; time fields blank; target blank (500 is only a placeholder); surplus >=0 meets target | Default target 20 PSI; options 20,10,0; drop <=5 PSI caution; target ==0 theoretical, otherwise target <20 aggressive. Zero/positive and relative-pressure validity boundaries also apply |
| Rounding | Whole seconds; duration min/sec; tank and flow zero decimals via existing locale formatter | Whole volume/flow results via Math.round; one decimal cycle minutes; count integer | Whole flow results via Math.round; target pressure zero decimals in U.S. |
| Unit-sensitive warnings | None | Capacity >0 gallons; target >0 GPM. Other warnings are time quantities in minutes | Zero PSI validation messages; positive GPM message; 5 PSI caution; 0 PSI theoretical and below-20 PSI aggressive warnings |
| Increment/decrement controls | None | None for quantities; Add Another Tender and Remove Tender only | None |
| Fixed choices | 500,750,1000,1250,1500,1800,2000,3000 gallons; Custom | New tender defaults to 3000 gallons; otherwise free entry | 20 PSI Standard, 10 PSI Aggressive, 0 PSI Theoretical; Custom |
| State / navigation | DOM only; static calculator, no live timer, clock origin, pause or elapsed state | Closure-local dynamic tender array plus target DOM; no durable persistence | DOM only; no durable persistence |
| Settings / Browser Back | Previously not covered by the Phase 3A Tool session whitelist | Same | Same |
| Copy/share | None | None | None |
| Static education | None in this Tool body | Formula/Reference model, assumptions and NFPA reference remain unchanged | Formula/Reference projection, exponent and 20 PSI reference prose remain unchanged |
| Must not convert | Seconds/minutes; capacity option identities | All time inputs/cycle times, tender count/order, status; new-tender physical capacity | Exponent, canonical targets/thresholds, fixed option values |

## Implementation and files

- `www/js/tools-calculators.js`: only these three renderers changed in Phase 3B. Canonical results are captured before formatting; original hydraulic formulas are retained. Tank Time's unused minute local was removed. Tender time parsing/model is unchanged. Metric time labels explicitly say min.
- `www/js/tools-units.js`: reuse the Phase 3A boundary and existing `ReverseFlowUnits`/operational formatting. Extend the Tool whitelist; support canonical quantity option labels; add lifecycle hooks for dynamic tender state in the same session record; reuse conversion for explicit capacity edits and operational warning quantities. Invalid parsed fields remain distinguishable from empty inputs so malformed Metric residuals cannot silently become zero.
- `www/tools.html`, `www/settings.html`: script versions and updated unit-support scope description.
- `tests/supply-tools-units.test.js`: 18 new focused tests, including the actual local shuttle calculation/validation.
- `tests/browser/supply-tools-units.cjs`: 31 U.S. fixtures, repeated preference cycles, canonical thresholds, direct Metric edits, independent tenders, navigation, validation, and mobile checks.
- `tests/fixtures/supply-tools-us-baseline.json`: pre-edit deterministic outputs, including warning visibility/text.
- `tests/tools-units.test.js`: the unsupported-session-Tool case now uses Coefficient Calculator; Tank Time is intentionally supported.
- This report.

No new conversion constants, storage architecture, formulas, or time conversions were added. `units.js`, the shared operational parser, `app.js`, hydraulic core, equipment catalog, coefficient data, exports, and widget sources were not changed in this phase.

## Tool results

**Tank Time:** Fixed options keep their canonical gallon values; e.g. 500 gallons displays 1893 L, not 500 L. Custom litre edits convert to unrounded U.S. gallons. A Metric-originated 2000 L / 700 L/min configuration produces the existing 2 min 51 sec representation. There is no running timer to reset.

**Water Shuttle:** Capacities and target flow enter the original gallon/GPM model. Time fields remain minutes and accept their existing decimal semantics. Independently entered 7500 L and 12345 L capacities, with 8- and 12-minute cycles, display 1966 L/min sustained flow and 466 L/min surplus against 1500 L/min. Editing one tender does not reparse another tender's rounded display. Add/remove preserves the other tender objects; a new tender remains physically 3000 gallons. No aggregate volume result was introduced because none existed.

**Estimated Remaining Supply:** Pressure options retain PSI values; labels use bar/kPa. Direct 5.5 bar static, 3.5 bar residual, 3800 L/min current flow, and the canonical 20 PSI target display 1815 L/min remaining supply. The same target displays 1.4 bar or 138 kPa without changing its 20 PSI identity. Projected and remaining GPM are captured numerically before rendering.

## Conversion, thresholds and state

U.S. gallons are canonical: 1 gallon = 3.785411784 L. Ordinary Metric capacity and flow entry/display use whole L and L/min; bar uses one decimal, kPa whole numbers. Canonical numbers remain unrounded. No Imperial-gallon conversion is used.

Populated preference cycles run three times per baseline case: U.S. → Metric bar → Metric kPa → U.S. Canonical input/selection/tender/result snapshots remain identical, including all temporal fields. Numerical edits are converted only for the explicitly edited field. Fixed options never use their formatted labels as hydraulic values.

Remaining Supply tests exercise exact and adjacent canonical boundaries: drop 4.999/5/5.001 PSI; target -0.001/0/0.001 and 19.999/20/20.001 PSI; target relative to residual 49.999/50/50.001 PSI; target relative to static 79.999/80/80.001 PSI; static-to-residual equality and adjacent values; static and residual -0.001/0/0.001 PSI. Browser visibility and numeric results remain identical through Metric switches, even when displays round alike.

The existing one-use same-tab Tool session record preserves canonical inputs and the tender array through Settings and Browser Back. Browser Back also passes with back/forward cache disabled. Hydraulic, preset, and equipment localStorage values remain byte-identical during preference navigation. Ordinary fresh Tool launches retain their reset behavior.

## Validation results

| Check | Result |
| --- | --- |
| New focused Node tests | 18 passed |
| U.S. pre/post browser fixtures | All 31 match exactly |
| Metric-originated litre/L-min/bar/kPa edits | Passed |
| Repeated preference switching and independent capacity edits | Passed; no canonical drift |
| Time-quantity safety | Minutes/seconds and cycle values unchanged |
| Fixed gallon capacity and PSI option identity | Passed |
| Canonical threshold / warning behavior | Passed |
| Settings return and Browser Back, including cache disabled | Passed |
| 390 px controls, results, warnings, long values and surplus/deficit layouts | Passed; no horizontal overflow |
| Prior Phase 1/2A/2B/2C browser regressions | Passed for all seven primary modes and Settings state |
| Prior Phase 3A Tool browser regressions | Passed for all three Tools |
| Full Node suite, including foundation, operational, hydraulic and equipment coverage | 351 tests: 350 passed; one known unrelated failure |
| Android version mismatch | Unchanged: expected 155, source 156; neither modified |
| Both existing Swift widget suites | Passed; no widget source edits |
| Capacitor web synchronization | iOS and Android `cap copy` passed |
| Native web bundle parity | All 51 source files byte-identical in both bundles |
| Source JavaScript syntax / diff whitespace | Passed |

Screenshots were inspected in addition to automated layout checks. Browser interaction was tested; physical native-device interaction and application release builds were not performed. No commit, push, deployment or release occurred.

## Review and Phase 3C planning

These three interactive Tools are unit-conversion complete within the tested scope. No new unit-conversion regression remains identified. The existing shuttle blank/nonnumeric time coercion is preserved rather than changed in this phase; the unrelated Android version assertion also remains.

For Phase 3C, the coefficient and friction-loss tools need their own audit before implementation. In particular, establish how the canonical U.S. coefficient convention and a per-100-foot reference basis should be presented alongside Metric quantities, and separately decide the scope of generated chart/table presentation. The reusable explicit-edit boundary and nominal/physical distinction are available, but labels alone do not resolve that reference-basis question. No Phase 3C work was started.
