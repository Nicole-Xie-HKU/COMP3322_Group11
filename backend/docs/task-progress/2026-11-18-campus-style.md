# Campus style matching — 2026-11-18

[Status](../../../TASK_PROGRESS.md) · [Feature](../features/campus-map.md) · [Previous presentation change](2026-11-18-campus-presentation.md)

## Scope and implementation

The user requested Campus Map styling consistent with Build Schedule and Saved Schedules. Inspected their live Chrome views and the shared `styles.css`, `features.css` and `neumorphic.css` rules. The reference uses a `#f2f2f2` surface, `--neu-raised`/`--neu-small`/`--neu-inset` shadows, pill controls, 15 px semibold section headings and blue `primary-button` actions.

The campus UI now reuses `primary-button`, `secondary-button`, `text-button` and `search-field` classes plus the existing surface/shadow/border tokens. Removed the separate oversized hero/eyebrow treatment and inner page padding. Matched the planner's sidebar widths, divider and gaps; applied compact raised headings, inset route fields, a rounded map and a saved-card-style building picker. Transfer notices use the same neutral surface and buttons. Orange stair and green walking-route semantics remain unchanged.

Only `frontend/src/campus/campus.css` and campus components `CampusMap.jsx`, `VenueField.jsx`, and `TransferPanel.jsx` changed. Shared styles, App state, routing logic/data, dependencies and backend remain untouched. Prior removal of source badges and the coverage banner is preserved. Touch targets and single-column layout remain available below the existing breakpoints.

## Verification

Baseline and final regression passed 107/107. Host/Docker builds passed with existing large-chunk warnings. Supplemental source/layer/link checks and `git diff --check` passed. The existing protected-source hash/root/CSS budget failures remain outside scope; no checks were weakened. Hash comparisons confirm shared styles, App state code, routing code and generated data unchanged.

Chrome computed-style comparisons matched all 12 checks: heading surface/radius/shadow/size/weight, primary color/radius, secondary/input shadows, selector styling, grid columns and gap. Build Schedule and Saved Schedules computed styles remained identical after visiting the map. Saved Schedules was checked in its existing empty state; no test saves were created.

Desktop CYP→MB remains 493 m / 9 min. At 390×844, CYM→CYCP and reverse remain 66 m / 4 min; the single-column layout has no horizontal overflow, inputs use 16 px text, action targets are at least 44 px, and keyboard focus is visible. Enter submission, swap, unknown venue and reset/disabled state passed. No captured console warnings/errors. Shared reduced-motion/contrast tokens are retained; those media preferences were not separately emulated.

The app-only `--no-deps` update preserved MySQL container identity/start time and readiness returned `ready`. Reset the test viewport and closed only the temporary Chrome QA tab; the user's original page and unsaved state were not reloaded. No data writes or course-learning vault sync were needed.

Evidence is under `/Users/icycrucifix/Desktop/HKU/COMP/COMP3322/Project/campus-map-evidence-2026-11-18`, with the `style-` prefix. No field navigation claim, data change, public deployment or course-learning artifact is involved.

Status: complete and running at http://localhost:13601/. Refresh the existing page to load the matched styling.
