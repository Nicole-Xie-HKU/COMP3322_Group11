# Campus map integration and deployment checks

[Project status](../../../TASK_PROGRESS.md) · [Feature](../features/campus-map.md) · [Deployment](../deployment.md)

## Scope and upstream integration

Integrated the campus map, all-building routing, direct CYM connections, weekly transfer advice and matched frontend styling with team main `90d080154dbf58bf9feff99ac603d2f2a829007b`. That main commit already contains the recent course-description work. Remote branches and pull requests were inspected; no separate newer course-description branch was listed. Description data, API, UI and tests are retained unchanged.

The only merge conflict was `frontend/src/App.jsx`. Resolution retains upstream comparison error handling and removes the old debug logs, while keeping map navigation and mounted timetable state. Credits now also identify Leaflet, OpenStreetMap/ODbL and AI-assisted campus routing. Scheduler and backend runtime behavior are unchanged from upstream main.

## Verified environment

The course guideline requires a responsive React SPA, Express REST API, MySQL and Linux Docker Compose. The current deployment guide specifies HTTP at `http://c3322-pg11.cs.hku.hk` through HKUVPN. Live school-server verification was explicitly waived by the user; this record does not claim a school deployment or external reachability check.

- `npm test`: 108/108 passed, including course descriptions and all 462 directional campus pairs.
- `npm run build`: passed; existing Vite large-chunk warnings remain.
- Git-free source ZIP extracted under a path containing spaces: fresh Compose bootstrap, import and readiness passed with Linux x64 Node and x86_64 MySQL. No host Node, `.env`, API key or existing database was needed for startup.
- `TEST_URL=http://127.0.0.1:13602 npm run test:integration`: 6/6 passed against the fresh MySQL-backed app, including generation, pinning and invalid-input status codes.
- Container `node backend/scripts/smoke.mjs`: passed guest create/save/read/rename/delete and isolation checks; only its own temporary schedule was deleted.
- The same image with the documented school-origin settings passed local Host/Origin checks: HTTP cookie login, readiness, 403 for an untrusted origin, and same-origin JavaScript/CSS with correct MIME types. All five built assets matched the host build byte-for-byte, including lazy map/network chunks. This emulates origin configuration, not the school network.
- Chrome: course description, assessment, prerequisites and source link rendered; generation, save/reopen and displayed-week retention through map navigation passed. CYM→CYCP remained 66 m / 4 min; mobile CYM→CYPP remained 73 m / 4 min. At 390×844, document width was 375 px and input text 16 px. No captured console warnings/errors.
- Deterministic map regeneration, dependency/cycle/link inspection and diff whitespace checks passed. All changed source files are below 200 lines; merged App.jsx is 183 lines.

## Retained limits

`npm run check` still fails the upstream protected hash for `Database/courseRepository.js`; that file and its manifest are unchanged. The budget audit still flags upstream `features.css` and `neumorphic.css`. No check was weakened or baseline rewritten. A restricted host test attempt failed socket/watch access; the permission-enabled rerun passed. The first amd64 setup found only a cached arm64 MySQL image; explicitly pulling amd64 resolved it without source changes.

No new cross-browser certification, field route survey, native Windows launch, live closures or accessibility guarantee is claimed. The existing local user-testing app and its MySQL volumes are preserved. No coursework submission or milestone tag is part of this update.
