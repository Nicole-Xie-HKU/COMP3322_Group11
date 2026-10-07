# Patch status

## 2026-10-07 — Publication authorized

The user explicitly authorized pushing these session fixes to GitHub. Branch `fix/timetable-completeness-20261007` contains the verified source-only patch on baseline `0ca56ef192543b8b94cbb5ffa3642c6937146de5`. This supersedes the earlier local-only restriction for this patch; it does not authorize merging into main or deploying production. Runtime files match the locally verified patch. Only publication-status documentation was updated for this handoff.

## 2026-10-06 — Repair and verification (historical)

Objective: fix all six findings from the 2026-10-05 review, with English project content and local-only testing. No GitHub upload is authorized.

Baseline: `0ca56ef192543b8b94cbb5ffa3642c6937146de5`. Work is isolated in `COMP3322_Group11-local-fix`; existing dirty checkouts and source workbook are preserved. The established project continuity log remains in the separate `COMP3322_Group11-main-integration/PROJECT_LOG.md` checkout.

Implemented: all six review fixes plus a newly discovered impossible weekday/date guard. New database migrations are not needed. Source TBA and inconsistent dates remain unchanged and must be corrected only from authoritative data.

Verified: 50 unit/API/scheduler tests; 14 disposable-MySQL tests; 6 real HTTP tests; frontend/Docker builds; outage recovery and restart persistence; browser generation, provisional saves, date-specific navigation and impossible-date exclusion. All-course scheduling checks pass across all three source terms. Audits verify source hashes, dependency boundaries, links and file budgets.

[Repair details](backend/docs/patch-fixes.md) · [Verification and limits](backend/docs/patch-verification.md) · [Testing](backend/docs/testing.md) · [Setup](README.md)

Delivery: `HKUPlan-local-fixes-2026-10-06.patch` beside this folder contains 26 modified and 30 added files, with zero deletions and no secrets/dependencies/build output. `git apply --check` passes against the exact baseline; applying it recreates the fixed source byte-for-byte. Existing checkouts and all 103 review-baseline files remain preserved. Test containers are stopped at handoff; their isolated volume is retained. To resume this local preview from this folder: `docker compose -p hkuplan-patch-20261006 start` (app at localhost:3189). Do not upload without fresh authorization.
