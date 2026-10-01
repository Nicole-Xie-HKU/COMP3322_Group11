# Integration against current main

[Home](../README.md) · [Database](database-handoff.md) · [Frontend](frontend-handoff.md)

Baseline: merged main `5dde468`, including scheduler-v3 `34e23a0` and frontend/backend `478a5d7`. The earlier local checkout based on `bdd0f22` is preserved separately. Its 88-file upload package is superseded and must not be uploaded wholesale.

## Preserved

- The entire original Database folder and four existing table layouts.
- Source workbook, JSON export, R converter and proposal, byte-for-byte.
- Teammate React layout, CSS, logo, timetable component and Vite proxy.
- `/api`, port 3001, legacy term labels, empty-query browsing and string section locks.
- Existing section IDs, current database data and older browser-local saves.

## Deliberate updates

One maintained Express backend under backend/ is wired in place of the main-thread example routes. Original Database files remain unchanged and are not the active server entry point. Runtime credentials are non-root; schema setup is an explicit admin step. Sidecar tables add enrichment/activity, revisions and owned guest saves without altering core tables.

The source workbook replaces the lossy JSON import path. Reading-week gaps and multiple weekdays are preserved. Imports validate all rows, reject ambiguous class-number reassignment, preserve IDs/enrichment/saves and roll back DML on failure.

The shared teammate-derived scheduler retains flat v3 and v2-offerings inputs. Backtracking is resumable with signed catalogue-bound cursors and a bounded worker. No same-time alternative is discarded; unknown credits/seats stay unknown. Missing requested courses fail rather than disappear. Optional preference sorting applies to one page, not globally.

The frontend receives structured errors, TBA arrays, Load more results and MySQL save/rename/delete. Older localStorage saves are retained and labelled, not automatically sent to the server. Calendar colours/title/pinning properties are preserved. An in-app credits view identifies libraries/team/AI assistance.

Same-path file updates are intentional and enumerated in the handoff manifest. No tracked file is deleted. Existing untouched Database files are not a second competing folder and should not be re-uploaded.

User authorized a conflict-free push as icyjfryxu (display jfry_xu) after testing. Authentication and remote freshness must be verified immediately before publication; no force push is allowed.
