# Project map

## Current behavior

- Browse/search one term, select up to 12 courses and generate date-aware combinations.
- Each source CLASS section bundles all its course meetings; choose one per course.
- Pin/unpin a section and page through results. Load more follows signed, catalogue-bound continuation tokens; ranking is per page, not global.
- Unknown-time sections require explicit provisional opt-in. Selected TBA sections remain visible outside the calendar; date-specific absence is explained separately.
- Save, rename, reopen and delete schedules in MySQL using a private browser guest cookie. Losing the cookie loses access; this is not a named-account login.
- Older localStorage saves remain local and are labelled. They are not automatically uploaded.
- Print course details, including teaching dates and TBA rows. Shared scheduler utilities also provide CSV and ICS export.

## Code and boundaries

| Path | Responsibility |
| --- | --- |
| `frontend/src/App.jsx` | React state and user workflows |
| `frontend/src/components/` | Course search, controls, results, completeness notices, calendar |
| `frontend/src/hooks/useSavedSchedules.js` | Guest-owned saves and legacy local saves |
| `frontend/src/api.js` | Frontend HTTP adapter |
| `backend/server.js`, `backend/app.js` | Maintained Express composition and lifecycle |
| `backend/src/` | Validation, security, workers and cross-module workflows |
| `backend/database/` | Public database workflows, safe imports and additive migrations |
| `scheduler/` | Shared pure validation, conflict checks, search and exports |
| `Database/` | Preserved original schema, workbook and legacy examples; not the active server |

Pure domain rules are L0; reusable mechanisms L1; single-module workflows L2; cross-module coordination L3. Dependencies point downward, and database/scheduler access crosses public interfaces. Frontend components are split by UI responsibility. See [architecture](backend/docs/architecture.md).

## Scope and limitations

The supplied workbook is a static snapshot, not live registration data. Unknown credits/seats remain unknown. Completeness only describes whether meeting times can be checked; it does not guarantee registration eligibility or source accuracy. No production VM deployment or named-user authentication is claimed.

Use the root Compose configuration, not the preserved legacy Database setup. Keep `.env` private. All patch content is English; original source assets remain unchanged.

[Setup](README.md) · [API](backend/docs/api-examples.md) · [Current verification](TASK_PROGRESS.md)
