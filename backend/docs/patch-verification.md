# Local verification — 2026-10-06

[Status](../../TASK_PROGRESS.md) · [Fixes](patch-fixes.md) · [Test commands](testing.md)

Baseline: `0ca56ef192543b8b94cbb5ffa3642c6937146de5`. Node 24.19.0, MySQL 8, production-built React in the root Docker image. All data is from the preserved supplied workbook. Test services use isolated Compose project `hkuplan-patch-20261006`, app port 3189 and DB port 3319; no existing user database was reset.

## Automated checks

- `npm test`: **50 passed**, zero skipped. Covers API validation, typed locks/partial weights, unknown-time policy, date inconsistency, pagination, workers, ownership, security, exports and fail-closed test discovery. Scheduling also matches independent brute-force results on 40 fixtures.
- `npm run test:mysql`: **14 passed** (13 lifecycle subtests plus their parent). Creates and drops only its unique disposable test database. Covers migrations, runtime DDL denial, source reconciliation, repeated imports, stable IDs, ownership, stale saves, rollback and malformed-header protection.
- Every course in all three terms is loaded from MySQL and scheduled independently: every emitted default result retains its course and an actual timed occurrence. This found and prompted the additional MMPH6173:SA guard; the final check passes.
- Source reconciliation: 28,976 rows; 5,770 courses; 8,582 sections; 30,562 meetings; 9,688 instructors. The source workbook SHA-256 is `12e6923df5e9b2036fac954f81f4fc220dec3861608ac06a8dad81fde16fd0c3`.
- `TEST_URL=http://localhost:3189 npm run test:integration`: **6 passed** against actual Docker/MySQL, not a fixture server.
- Frontend production build and explicit Docker setup/app builds pass. Restart smoke verifies readiness fails during database outage, recovers afterwards, and saved data survives database/app restarts.
- Project audit checks syntax, local imports/cycles, module boundaries, Markdown links and protected-source hashes. Context-budget audit has one documented exception: the unchanged 708-line stylesheet.

## Browser checks

Using the actual local production-built UI:

1. Add COMP3322 and ECON1210 in semester 1. Default generation shows nine results, both timed courses, and an unknown-alternative exclusion notice.
2. Enable provisional results, generate and move to result 2 of 10. It explicitly labels ECON1210 1B as Time TBA beside the calendar and labels the whole result provisional.
3. Save that result to MySQL, reopen it, restart both services, reload and reopen again. The selection and provisional warning survive.
4. Disable provisional mode and lock ECON1210 1B. Generation returns zero results with a clear diagnosis, not a silently incomplete result.
5. Select COMP3322 with MGMT2401 1E. The first week explains MGMT2401 has no meetings then; the following week shows its actual Monday meeting and removes the notice.
6. Check the summer MMPH6173 SA source inconsistency: no result is emitted and a source-date warning explains why.

Browser screenshots and raw local command logs are retained outside the patch in `local-patch-evidence-2026-10-06/` beside the working folder. Browser console checks showed no warnings/errors during these flows.

## Limits

These checks resolve the reproduced faults; they are not proof that every possible bug is absent. No production VM, live registration service, full cross-browser matrix or third-party calendar-import application was tested. Source TBA and inconsistent dates still need authoritative data updates; the patch safely excludes or labels them instead of inventing values. Nothing was published to GitHub.
