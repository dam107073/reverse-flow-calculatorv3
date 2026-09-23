# Phase 3C: coefficient and friction-loss Tools

Scope: Coefficient Calculator, Friction Loss / 100′ (Metric /30 m), and Friction Loss Chart Generator, including only that generator's canvas/PNG/share output. No Pump Panel, broad Pump Charts, package/export, education, widget, or hydraulic-data migration work was performed.

## Pre-edit audit

| Area | Coefficient Calculator | FL / 100′ | Chart Generator |
| --- | --- | --- | --- |
| Inputs / direct DOM reads | Hose select; flow; Gauge 1 and Gauge 2 text values; selected hose option text | Hose select; editable C text; flow text; Calculate button | Checked hose IDs; Generate PNG button |
| Results | Measured friction loss; derived C; hose label; flow | Friction loss; hose; C used; flow used | Canvas table; coefficient legend; PNG file; generation/share status |
| Input units | PSI, GPM; hose inch labels | C unitless; GPM; hose inch labels | Hose inch labels; helper states 0–1000 GPM / 50 increments |
| Parsing / validation | `numberOrNull`; GPM >0; Gauge 1 > Gauge 2 >0; invalid hides results | `numberOrNull`; selected hose, C >0, GPM >=0; explicit Calculate. Existing blank-flow coercion allows zero calculation | At least one checked hose; positive active C required; alerts for no selection/unavailable export; catches generation failure |
| Formula | `H.hoseCoefficient(gauge1−gauge2, GPM)` with implicit 100 ft | `H.frictionLoss(C, GPM, 100)` | Same canonical formula at 100 ft for every cell |
| Coefficient lookup | None: selected hose is descriptive; calculated C is not persisted | `getActiveHoseCoefficient`: saved override, otherwise factory; helper fallback catalog coefficient if API unavailable. Initial field rounds with existing formatter; user may enter temporary C | Same active saved/factory coefficient. Actual unrounded active C enters chart calculations; legend uses existing rounded coefficient text |
| Profile metadata | Does not affect derivation | Default/library profile metadata does not override active C | Same; saved coefficient wins independently of metadata |
| Hardcoded reference | Gauge → 50′ hose → 50′ hose → Gauge instruction; measured loss labelled 100′ | Title, helper, static formula, result and calculation all 100 ft | Header Per 100 Feet of Hose; cells /100 ft |
| Rounding | Loss 1 decimal PSI; C 2 decimals; flow 0 decimals | Loss 1 decimal PSI; C 1 decimal if >=1, otherwise 2; flow 0 decimals | 21 integer flow labels; pressure 1 decimal; coefficient legend 1 decimal if >=1, otherwise 2 |
| Chart grid | N/A | N/A | Confirmed 0–1000 GPM inclusive, step 50 |
| Defaults / selection | First visible hose; measurements blank | Factory/saved C populated; changing hose resets temporary C and hides result | Default IDs 1.75,1.88,2,2.25,2.5,3,4,5; visible positive-C hose options |
| Persistence / navigation | DOM only; no stored test length or saved derived C | DOM only; temporary C is not written to coefficient storage | Checkbox state only; active C comes from existing storage |
| Settings return | Previously not in Tool-session whitelist | Same | Same |
| Canvas/share | None | None | 1100 logical pixel canvas with branding/date/profile metadata; PNG file; existing native/web file share, text share, clipboard fallbacks. U.S. fallback text generic |
| Static education | Only operational test setup, updated within scope | Formula/Reference disclosure remains canonical reference prose | No unrelated educational content |

**Pre-existing chart failure:** `drawGeneratedPngCanvasHeader` called undefined `wrapCanvasMetadataLine`. Only this chart uses that header function. The production call now uses existing `wrapCanvasText`. The untouched pre-edit browser harness supplied that missing wrapper to capture the original chart's deterministic text/layout; it did not change grids, coefficients, calculations, or formatting. The pre-edit app could not otherwise complete PNG generation.

**Persistence impact of test length:** none. These Tools had no durable input records. The new field participates only in the existing one-use same-tab Settings return record. No coefficient or hydraulic data migration occurs.

## Files changed in Phase 3C

- `www/js/tools-calculators.js`: scoped Tool renderers, actual test length, reference-distance rendering, chart selection state and overview link/instructions.
- `www/js/tools-units.js`: remaining Tool IDs; canonical fresh defaults; scoped decimal fields; manual-calculation lifecycle; reference distance/pressure helpers; canonical chart rows. Existing conversion APIs remain authoritative.
- `www/js/required-pdp-units.js`: opt-in decimal quantity parsing for actual test length; existing fields retain their parsing rules.
- `www/js/units.js`: expose the existing explicit-precision `formatNumber` helper; no conversion factors changed.
- `www/js/app.js`: chart-specific preference parameters, canonical Metric rows, nominal hose labels, PNG headings/cells and text fallback; missing chart metadata wrapper repaired. Generic share transport and unrelated exports are unchanged.
- `www/index.html`, `www/tools.html`, `www/settings.html`: script versions, test-length overview guidance, and accurate completed-Tools scope message.
- `tests/friction-tools-units.test.js`, `tests/browser/friction-tools-units.cjs`, `tests/fixtures/friction-tools-us-baseline.json`: new numerical, browser, output and parity coverage.
- `tests/tools-units.test.js`: unsupported-session ID changed to out-of-scope Attack Pumper because Coefficient Calculator is now supported.
- This report.

Hydraulic core, coefficient/catalog storage, profile lookup, coefficient reset routines, and widget source are unchanged.

## Coefficient implementation and defaults

Flow and gauge edits enter canonical GPM/PSI; actual length enters canonical feet. The unchanged generalized `H.hoseCoefficient(lossPsi, GPM, lengthFeet)` derives C. No Metric coefficient is introduced. C remains unitless in the UI and retains the existing U.S. convention and display precision.

Fresh U.S. Tool: 100 ft. Fresh Metric Tool: exactly 30 m converted to canonical feet. Defaults run once on a fresh instance; restored/edited values override them. Switching a 200-ft test displays 60.96 m, retaining 200 ft internally. Switching a 46-m test retains its physical length in feet. Metric actual-length entry accepts decimal metres and displays up to 12 decimals with trailing zeros removed; canonical values remain unrounded.

Zero, negative, empty or malformed explicit lengths do not fall back to 100 ft. Gauge 1 > Gauge 2 >0 and positive flow rules remain. Decimal bar input uses the established parser. Operational instructions now describe known total length, optional multiple hose lengths, end gauges, matching/calibrated gauges and known flow.

At explicit U.S. 100 ft, existing result text and values match the prior implicit implementation exactly. Non-100-ft and Metric tests additionally show actual test length and reference loss. The coefficient result itself never acquires bar/kPa/metre units.

Equivalent physical tests entered in PSI/GPM/feet and bar or kPa/L-min/metres produce the same C within floating-point tolerance. Tests cover 30,46,60 m and 100,150,200 ft, repeated switches and invalid length. Supporting Metric FL /30 m is independent of the 100-ft convention used to define C.

## Reference loss and numerical proof

U.S. reference remains exactly 100 ft. Metric reference is exactly `metresToFeet(30)` = 98.42519685039369 ft. Flow converts to GPM before the existing friction-loss calculation.

For C=15.5, flow=150 GPM:

| Physical distance | Canonical loss PSI |
| --- | ---: |
| 100 ft | 34.875 |
| 30 m | 34.3257874015748 |
| 100 m | 114.41929133858267 |

The Metric/U.S. reference ratio is 30/30.48, not 1. The 100-m result is 100/30 times the 30-m result. Tests assert these numerical distinctions, not just labels.

The FL Tool retains its explicit Calculate action. Draft flow or C edits do not silently replace the last calculated configuration. A preference switch renders that calculated configuration at the selected reference distance. Hose changes still repopulate C using existing precedence/rounding and clear the result. Temporary custom C never becomes a persistent override.

## Chart, precision and share output

U.S.: original 0–1000 GPM, step 50, /100 ft, one-decimal PSI cells and original headings/layout.

Metric: independent exact 0–4000 L/min grid, step 200, 21 rows inclusive of zero. Each grid value converts unrounded to GPM; every row calculates over exactly 30 m with active canonical C. Metric labels use approved nominal mm mappings; IDs are unchanged. Pressure appears as bar or kPa in the chart heading and cells. Coefficient legends preserve the existing rounding convention; calculation C is not rounded to the legend text.

Reference/chart pressure formatting is centralized in the Tool unit infrastructure: 3 decimal bar places or 1 decimal kPa place. If those would round a nonzero value to zero, use 3 significant digits instead. This affects presentation only. Ordinary operational pressure formats and all U.S. formats remain unchanged.

Chart-only PNG generation, file sharing, text sharing and clipboard fallback receive the selected preference explicitly. Metric text includes the nominal hose labels, coefficient legend, exact L/min grid and FL /30 m pressure values. U.S. fallback text is unchanged. The generic share transport, native folder, file name, unrelated exports and package generation are unchanged. No in-page chart preview existed or was added; generated PNGs were visually inspected.

## State, coefficient precedence and validation

The existing Tool Settings session now includes all nine Tools. It preserves coefficient measurements/test length, FL draft C/flow and last calculated configuration, and chart selected IDs. Settings links and Browser Back pass with ordinary navigation and with back/forward cache disabled. Preference-only coefficient switches preserve canonical gauges, flow, length and C; FL distance and chart grids deliberately change according to the approved reference conventions.

Tests cover factory C, persistent override 12.375, temporary C, and default-profile metadata containing a different coefficient. Metadata does not supersede the saved active coefficient. No reset or coefficient storage behavior changed.

| Validation | Result |
| --- | --- |
| New focused Node tests | 15 passed |
| U.S. deterministic baselines | 3 coefficient, 5 FL reference, 2 factory/override canvas cases match |
| Explicit length / C invariance / exact 30 m / custom C | Passed |
| Metric chart grid, zero row and every numerical cell | Passed |
| Metric-originated edits, repeated switching, Settings and Browser Back | Passed |
| Canvas/PNG generation and browser share/clipboard spies | Passed; no external share was sent |
| 390px Tool UI and generated PNG visual inspection | Passed; no horizontal overflow or unusable controls |
| Phase 1 foundation/Settings coverage | Passed |
| All seven Phase 2 primary modes | Browser regressions passed |
| Phase 3A and 3B Tools | Browser regressions passed |
| Full Node suite, including hydraulic/equipment/coefficient coverage | 366 tests: 365 passed, one known unrelated failure |
| Known version assertion | Android 155 expected / 156 declared; neither modified |
| Both existing Swift widget regression suites | Passed; widgets unchanged |
| Capacitor iOS/Android web copies | Passed |
| Native web bundle equality | All 51 source files match both bundles byte-for-byte |
| All source JavaScript syntax / diff whitespace | Passed |

Browser file-share/clipboard destinations were replaced with local test spies. Native-device interaction and native share-sheet interaction were not tested. No application release build, commit, push, or deployment occurred.

## Completion and recommended next scope

All nine interactive Tools are unit-conversion complete within the validated scope. No new unit-conversion regression remains identified. The known Android assertion remains; the pre-existing chart-generation missing-function error was fixed within chart scope.

Recommended next step: a separate read-only audit of Pump Panel first, focusing on live incident state and unit-edit boundaries. Treat broad Pump Chart list/detail rendering as a subsequent scope with canonical saved-snapshot compatibility, then handle Pump Operator Package and unrelated exports in a separate presentation/output phase. No such implementation was started.
