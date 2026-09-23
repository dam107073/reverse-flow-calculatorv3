# Phase 3A: interactive tool units

Scope: Smoothbore Flow, Nozzle Reaction, and Water Velocity only. Audit performed before implementation; U.S. browser outputs captured from an untouched source copy before edits. No hydraulic formula, coefficient, equipment catalog, widget, export, or other Tool was changed.

## Pre-edit audit

| Area | Smoothbore Flow | Nozzle Reaction | Water Velocity |
| --- | --- | --- | --- |
| Inputs/direct DOM reads | `smoothboreFlowTip`, selected option `data-diameter`, `smoothboreFlowCustomTip.value`, `smoothboreFlowPressure.value` | `nozzleReactionType`, `nozzleReactionTip`, selected option `data-diameter`, `nozzleReactionCustomTip`, `nozzleReactionFlow`, `nozzleReactionPressure`, `nozzleReactionRatedFlow`, `nozzleReactionRatedPressure` values | `waterVelocityHoseId.value`, `waterVelocityCustomId.value`, `waterVelocityFlow.value` |
| Calculated quantities | Flow GPM; stream velocity ft/sec | Reaction lbf; fixed-fog operating pressure PSI | Velocity ft/sec |
| Displayed results | Whole GPM; velocity one decimal ft/sec | Whole lb; nozzle type; tip label or custom diameter three decimals; whole PSI; fog whole GPM; fixed-fog rated GPM @ PSI | Velocity one decimal ft/sec |
| Field units | Pressure placeholder PSI; custom diameter placeholder inches; standard tip inch labels | Pressure/rated pressure PSI; flow/rated flow GPM; custom diameter inches; standard tip inch labels | Factory hose inch labels; custom charged ID inches; flow GPM |
| Validation/sanitization | `numberOrNull`, finite numbers, diameter and pressure positive; invalid hides result | Same parser; positive diameter/pressure or flow/pressure; fixed rating and target flow positive; invalid hides result | Same parser; positive diameter, flow nonnegative; zero flow valid; invalid hides result |
| Formula paths | Existing `H.smoothboreFlow`: 29.7 × in² × √PSI; `H.waterVelocity`: 0.408 × GPM / in² | Existing `H.smoothboreReaction`: 1.57 × in² × PSI; `H.fogReaction`: 0.0505 × GPM × √PSI; fixed-fog PSI = rated PSI × (target GPM / rated GPM)² | Existing `H.waterVelocity`: 0.408 × GPM / in² |
| Factory identities | Visible `SMOOTHBORE_TIPS` IDs and exact inch diameter dataset | Same tips; stable `smoothbore`, `automaticFog`, `fixedFog` choices | Visible numeric positive IDs from union of `HOSE_OPTIONS` and `RELAY_HOSE_OPTIONS`; default 2.5 if available; dual3 excluded by existing numeric filter |
| Physical/custom diameter | Standard tips are physical; custom tip is physical | Standard tips and custom tip are physical | Custom charged ID is physical; factory ID supplies its existing hydraulic inch diameter |
| Nominal hose category | None | None | Factory category labels only; numeric ID is calculation authority |
| Unit-bearing errors/warnings | None; unavailable results hidden | None; unavailable results hidden | None; unavailable results hidden |
| Copy/share/export | None specific to this Tool | None specific to this Tool | None specific to this Tool |
| Persistence/state | Controls only; fresh navigation resets | Controls only; fresh navigation resets | Controls only; fresh navigation resets |
| Static education | Formula/Reference disclosure contains canonical formulas and definitions; remains unchanged | None in tool body | None in tool body |

No integer sanitizer existed in these Tool paths. Existing U.S. input parsing and result rounding remain intact. All hardcoded operational unit assumptions listed above now render through the established unit helpers; static educational formulas remain U.S. reference content.

## Implementation and changed files

- `www/js/tools-units.js`: shared Tool boundary; canonical input values, explicit-edit conversion, stable selections, numeric result snapshots, preference rendering, and one-use same-tab Settings return. No new conversion constants or formulas. Distinct `physicalDiameterLabel` and `factoryHoseLabel` APIs.
- `www/js/tools-calculators.js`: only the three scoped renderers use the boundary. Numerical calculations continue through the existing hydraulic core. Capture numeric results before presentation.
- `www/js/required-pdp-units.js`: extract reusable `parseQuantityEdit` from the approved operational parser; existing `parseEdit` delegates unchanged. Central velocity display precision is one decimal. Existing diameter precision is retained: up to 12 decimal places with trailing zeros removed.
- `www/js/units-settings.js`: scoped return link to the active Tool.
- `www/index.html`, `www/tools.html`, `www/settings.html`: script loading/cache versions and accurate Settings scope description.
- `tests/tools-units.test.js`, `tests/browser/tools-units.cjs`, `tests/fixtures/tools-us-baseline.json`: unit, conversion, parity, input, navigation, no-drift, and mobile regressions.
- This audit/report file.

The previous phases' `app.js`, foundational conversion constants, hydraulic core, catalog, coefficients, and Settings calculator-session implementation are byte-identical to the Phase 3A pre-edit snapshot.

## Results

Smoothbore Flow supports U.S., bar, and kPa; physical tips/custom diameter use mm; results use L/min and m/s. A metric-originated 28.575 mm tip at 3.5 bar becomes canonical 1.125 inches and the corresponding PSI. Display: 1014 L/min and 26.3 m/s.

Nozzle Reaction supports all four metric pressure/reaction combinations. Smoothbore, automatic fog, and fixed fog retain canonical formulas and rating behavior. A metric-originated 700 L/min at 3.5 bar displays 296 N or 30.2 kgf from the identical canonical lbf value. No `kg` force label is used.

Water Velocity uses factory nominal labels while calculating from stable IDs. Explicit tests cover 1.75 → 45 mm and 2.5 → 64 mm and prove those displayed millimetres are not converted back into hydraulic diameters. Custom 44.45 mm remains physical 1.75 inches. At 700 L/min this produces 7.5 m/s.

Preference-only cycles U.S. → bar/N → kPa/N → kPa/kgf → bar/kgf → U.S. retain identical canonical inputs, selections, and results. Two complete cycles run for each of 12 populated baseline cases. Explicit edits are the only conversion entry point. Invalid metric decimals invalidate results rather than reusing an old answer. Fresh Tool navigation retains its original reset behavior.

Settings return uses transient session storage only. Browser Back is checked with normal caching and with the back/forward cache disabled; canonical repaint happens after browser form restoration. Existing hydraulic/preset/equipment storage is byte-preserved.

## Validation

- 12 new Node tests pass, covering all three Tools, exact physical diameters, factory nominal distinction, force equivalence, metric edits/validation, U.S. fixtures, and session storage safety.
- 12 pre-edit U.S. browser baselines match exactly after implementation: three flow cases, four reaction cases, five velocity cases.
- All metric preference combinations, real Settings return, Browser Back, fresh launches, invalid entries, fixed-fog rated edits, and repeated switching pass.
- At 390 × 844 px: automated document/control overflow checks and screenshot inspection pass. Physical mm fields, decimal bar inputs, kPa, L/min, N/kgf, m/s, selectors, and result cards remain usable. No stale operational U.S. units found. Static Formula/Reference remains unchanged.
- Existing Phase 1 foundation/Settings-return and Phase 2A/2B/2C browser regressions pass for Required PDP, Reverse Flow, Apparatus Mounted, Relay, Split Lay, Standpipe, and Wye. Pump Panel remains outside conversion scope.
- Full Node suite: 333 tests, 332 passed, one known unrelated version assertion failure. It expects Android 155 while unchanged source declares 156. Neither source version nor test changed.
- Both existing Swift widget regression suites pass. No widget source changes.
- Capacitor web asset copy succeeds for iOS and Android; all 51 source web files match each native bundle byte-for-byte.
- All source JavaScript syntax checks and Git diff whitespace checks pass.

Browser interaction and native bundle parity were tested; physical native-device interaction and application release builds were not performed. No commit, push, deployment, or store release occurred.

These three Tools are unit-conversion complete within the tested scope, ready for review. Phase 3B recommendation: Tank Time + Water Shuttle + Estimated Remaining Supply. No Phase 3B work started.
