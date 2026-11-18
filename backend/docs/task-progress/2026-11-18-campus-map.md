# Campus map implementation — 2026-11-18

[Status index](../../../TASK_PROGRESS.md) · [Feature](../features/campus-map.md) · [Data contract](../features/campus-map-data.md)

## Delivered locally

Checkout: `/Users/icycrucifix/Desktop/HKU/COMP/COMP3322/Project/COMP3322_Group11-campus-map`, branch `feature/campus-map`, based on main `205fdb8e83ae25efd155827b21b55028a7e94f07`. No commit, push or deployment. Original transit references, dirty working copies and the paused November 11 repairs are untouched.

Implemented 22-building search/selection, source-backed walking paths, route swap/reset/fitting, estimated time and distance, stairs/service-road notices, unavailable states, and displayed-week class transfers. Planner week/result state survives map navigation. Backend, scheduler rules, schemas and saved/export payloads are unchanged. Leaflet 1.9.4 is the only added dependency.

## Verification

Commands run from the checkout with Node.js 24.22.1:

- `npm test`: baseline 74 passed; final rerun 91 passed, including 17 new campus tests. Independent repeated relaxation agrees with Dijkstra for three representative pairs in both directions. Tests cover aliases, access/direction rules, invalid/disconnected graphs, boundary access, provenance, date gaps, weekends, unknown venues, overlaps and strict warning thresholds.
- `node frontend/scripts/campus/build.mjs`: generated 1,108 features, 2,730 nodes and 5,585 directed edges. Source hash and segment provenance checked.
- `npm run build`: passed. Lazy map/network chunks and the existing main chunk still trigger Vite's 500 KB warning; no warning threshold was raised.
- Supplemental audit: no import cycles/upward dependencies or broken Markdown links; changed documentation is reachable and within budget.
- Desktop (1280×900) and mobile (390×844) browser checks: route search/swap, same-building/unknown cases, building selector, Enter submission, visible route geometry, transfer warning, week retention, save/reopen, pin/unpin and ICS download. Mobile map has no horizontal document overflow.

Browser checks used the real Express/scheduler/frontend with synthetic CAMP1001–CAMP1004 courses and an ephemeral fake database at port 13601. They do not establish live MySQL persistence. The downloaded ICS contains synthetic test classes only. Print-row unit tests pass, but opening print in the in-app browser stalled its tab; that temporary tab was closed. Native print output is unverified.

One full run had an unexpected health/readiness 404 in an unchanged API test (90/91 passed). The isolated API suite then passed 12/12 and the full rerun passed 91/91 without source changes. The transient cause is unresolved; the failing log is retained.

## Existing failures and limits

`npm run check` fails on the pre-existing protected hash for `Database/courseRepository.js`. The separate budget audit reports pre-existing oversized `App.jsx`, `features.css` and `neumorphic.css`; App's narrow growth is documented in the data contract. Checks were not disabled or rebaselined. Installation reported existing backend (3 moderate, 2 high) and frontend (4 high) dependency advisories; unrelated dependency repairs remain out of scope.

No live MySQL/Docker, production deployment, field walk, current closure or step-free verification was performed. A supplemental all-highway-node metadata query was rejected by the external endpoint with HTTP 406; the original snapshot remains unchanged. Retained entrance/barrier metadata and way-level restrictions are checked, but additional unrecorded node restrictions remain possible.

Evidence, screenshots and the synthetic preview script are in `/Users/icycrucifix/Desktop/HKU/COMP/COMP3322/Project/campus-map-evidence-2026-11-18`. Use the normal README startup procedure for an actual database-backed installation. Remaining work is review of the local patch and optional field/data coverage validation, not scheduler integration changes.
