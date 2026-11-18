# All-building route coverage — 2026-11-18

[Status](../../../TASK_PROGRESS.md) · [Feature](../features/campus-map.md) · [Initial implementation](2026-11-18-campus-map.md)

## Requirement and decision

The user found coverage insufficient and requested a pathfinder between every building pair. The reproduced baseline supported only 72 of 462 directional pairs among the 22 listed buildings. Most missing paths were caused by absent or disconnected boundary-access points rather than an absent campus walking network.

The user explicitly approved clearly labeled nearby outdoor approaches when entrances are not mapped. This expands coverage without inventing links, treating proximity as walkability, or presenting a nearby path as a confirmed door. Scope is the 22 registered Main/Centennial buildings, not every building across HKU's other campuses.

## Implementation

Added 13 reviewed approach nodes on existing permitted footpaths/service roads. Each is within 10 meters of its building outline, with original source-way IDs recorded in `frontend/src/campus/l0_axioms/approaches.js`. Existing exact access lists and all original graph edges remain unchanged. No restriction checks were relaxed.

Routing prefers connected exact access. If unavailable, it minimizes the number of nearby endpoints, then mapped distance. The optional `allowApproaches: false` retains strict behavior. UI and weekly transfers flag the unmapped final entrance/floor connection, whose distance is excluded.

Coverage is now 462/462 pairs: 72 exact-access pairs and 390 using a nearby approach. Four directional pairs (CPD↔CYT and CPD↔JCT) share an arrival point; these use a shared marker and explanation, not a one-point line. The builder validates every pair and embeds coverage counts in both generated assets.

## User-supplied campus knowledge

- User reports **KK → CYM → CYCP/CYPP** and clarifies that **CYM is physically next to CYCP/CYPP**. OSM way `182203615` supports KK–CYM. Adjacency is recorded; no indoor passage or floor change is inferred. The precise walkable connection is still unmapped, so the app uses labeled mapped approaches rather than drawing an unsupported shortcut.
- User confirms **CB is on Upper University Street**. CB's reviewed endpoint is node `1930285649` on elevated footway `182670424`, not the lower road. Its label now names Upper University Street. The precise door/floor is not claimed.

## Verification and limits

Focused campus tests: 23 passed. Full regression: 97 passed. Host production build passed with the existing chunk-size warnings. New tests exhaust all 462 directional pairs, check approach geometry/source membership, preserve exact-access preference, reject disconnected graphs, cover shared endpoints and verify transfer uncertainty.

The original source snapshot and graph are unchanged apart from generated coverage metadata. The supplemental all-node query to a documented Overpass mirror timed out after 90 seconds; it supplied no new source data. Existing hash/budget/dependency failures and lack of field/step-free verification remain as recorded in the initial implementation.

Evidence is under `/Users/icycrucifix/Desktop/HKU/COMP/COMP3322/Project/campus-map-evidence-2026-11-18`, including `coverage-candidates.json`, `coverage-approaches-review.png`, `coverage-tests.log`, `coverage-full-tests.log` and `coverage-build.log`.

Live update: rebuilt only the app container with `--no-deps`; MySQL's container ID/start time stayed unchanged. Readiness passed. Browser checks covered RHT→CYPP, CB's upper walkway, shared CPD→CYT and mobile RRS→EH, with no overflow or console errors.

Status: complete and running at http://localhost:13601/. Refresh the page to load it. Missing CYM passage details remain a refinement; no indoor link was invented.
