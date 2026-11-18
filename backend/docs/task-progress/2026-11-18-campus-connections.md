# Direct CYM routes — 2026-11-18

[Status](../../../TASK_PROGRESS.md) · [Connection contract](../features/campus-map-connections.md) · [Prior coverage](2026-11-18-campus-coverage.md)

## Request and implementation

The user explicitly requested direct CYM connections to CYCP/CYPP after confirming adjacency and the KK→CYM→science-building sequence. Existing CYM routes detoured 510 m to Chemistry and 439 m to Physics; KK routes were 468 m and 397 m.

Added CYM's already mapped east entrance and retained the existing covered walkway to Physics. Three separately declared schematic links join both west entrances to that east entrance and the covered walkway to Chemistry's mapped entrance spur. Geometry is approximate, not a surveyed indoor route. All 5,585 OSM edges and source data are preserved; six declared directed edges bring the total to 5,591.

Routes now calculate CYM→CYCP 66 m / 4 min, CYM→CYPP 73 m / 4 min, KK→CYCP 159 m / 5 min and KK→CYPP 166 m / 5 min. The new purple-dashed segments, route warning and transfer notice preserve uncertainty. Boundary access is preferred, but is not presented as surveyed geometry. OSM-only routing remains available through `allowUserConnections: false`.

Coverage remains 462/462 pairs: 110 boundary-endpoint pairs and 352 nearby-approach pairs, including four shared arrivals. An overlapping 96 pairs use user-confirmed links. No floor, stair, live closure or step-free claim is made.

## Verification

Baseline: 23 campus tests and 97 full tests passed. The existing protected-source hash checker still failed before editing. First focused run exposed the second west entrance being disconnected; adding its explicitly approximate east connection fixed the cause. Final focused tests pass 33/33 and full regression passes 107/107. Checks include reverse routes, KK via CYM, source evidence, bad declarations, strict OSM behavior and timetable metadata. Independent repeated relaxation covers the four changed route pairs.

Host and Docker builds passed; byte-identical regeneration and independent source/edge comparisons passed. The supplemental audit found no cycles, upward imports or broken links. Existing protected-source hash, root/CSS budget failures and large-chunk warnings remain unchanged.

Updated only the app container with `--no-deps`. MySQL identity/start time remained unchanged and readiness passed. Browser checks verified CYM→CYCP (one purple segment), CYM→CYPP and reverse (no reported segment), KK→CYCP (two purple segments), and mobile KK→CYPP (one). No captured console errors/warnings or horizontal overflow. The temporary QA tab was closed and viewport reset; the service remains running.

Evidence: `/Users/icycrucifix/Desktop/HKU/COMP/COMP3322/Project/campus-map-evidence-2026-11-18/direct-connections.md`. No field walk, exact floor mapping, database mutation, publication or resumption of paused repairs was performed. This is application/engineering work, so course-learning vault sync is not applicable.

Status: complete and live at http://localhost:13601/. Refresh the page. Geometry for the reported links remains approximate.
