# Upstream compatibility

[Home](../README.md) · [Database](database-handoff.md) · [Frontend](frontend-handoff.md)

This local patch is based on reviewed GitHub main `0ca56ef192543b8b94cbb5ffa3642c6937146de5`. Earlier local checkouts and the unmodified review snapshot are preserved separately. The patch is not based on their dirty working trees.

## Preserved

- Every original `Database/` file: schema, workbook, JSON, converter and legacy examples.
- Proposal, React stylesheet and logo; hashes are checked by `backend/scripts/protected-sources.json`.
- `/api`, default port 3001, term aliases, empty-query browsing, string locks and typed locks.
- Existing database schema/data, section identities and older browser-local saves. No schema migration is needed for this patch.
- Shared v3 flat-course and legacy v2 scheduler inputs, signed continuation and guest ownership.

## Intentional changes

Unknown-time sections are excluded by default, with explicit provisional opt-in and per-result completeness. This tightens the result policy; clients that intentionally need unknown-time options must set `includeUnknownTimes:true`.

Workbook imports reject missing time/date/weekday headers before database mutation instead of interpreting them as blank TBA cells. Source TBA cells remain unknown; no source timetable values were fabricated.

Partial typed-lock and weight maps are accepted. ICS date-bounded series get distinct stable identifiers. Startup documentation now requires random secrets and an explicit setup service. Restored backend tests are required by a fail-closed runner. The React app is split into cohesive components without changing its stylesheet.

## Publication boundary

The original repair on 2026-10-06 was local-only. On 2026-10-07 the user explicitly authorized pushing this session's verified patch. The publication branch is `fix/timetable-completeness-20261007`; the upstream baseline was rechecked unchanged before preparation. This authorization does not include a merge into main, force push, deletion, production deployment or database change. Historical local-only verification remains recorded as such.

[Current patch verification](../../TASK_PROGRESS.md)
