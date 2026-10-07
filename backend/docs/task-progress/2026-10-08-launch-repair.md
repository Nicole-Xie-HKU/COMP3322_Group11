# Launch repair and verification

[Project status](../../../TASK_PROGRESS.md) · [Setup](../../../README.md) · [Tests](../testing.md)

## Scope and decisions

The 7 October audit of main `3647daf` confirmed Docker setup and the GitHub ZIP worked, but host watch-mode generation and special-character diagnostic paths failed. On 8 October the user authorized repair, testing and push. Source timetable data, database schema, lockfiles, UI behavior and existing user databases are preserved.

The L1 worker adapter now ignores messages outside the scheduler protocol, validates a result before resolving, and retains the existing concurrency limit, timeout and failure behavior. It must keep listening: Node watch mode emits dependency notifications before the scheduler result. The scheduler's public result format is unchanged.

The smoke CLI and nested test-runner probe convert file URLs with `fileURLToPath`, not URL pathname. This preserves spaces, percent signs and platform-specific path syntax without hand-decoding.

The root status is now a portable index; the original local handoff is retained as a clearly labelled historical page. ZIP startup uses the root README and never requires a developer's old Compose project, .env, patch or Git metadata.

## Regression evidence

Seven added checks were first run against the unfixed sources and failed as expected: five worker-protocol checks, one real watched HTTP workflow and one smoke path check. Existing import-safety checks remained successful. This confirms the tests detect the reported failures rather than merely the repaired behavior.

New worker checks cover monitoring noise, repeated successful use, failure, malformed result, early exit, concurrency and timeout. The watched-process test uses the real Express app and scheduler worker with an isolated fake catalogue, and exercises both successful generation and invalid input. MySQL and production-image checks are separate.

## Validation on 8 October 2026

- Fresh locked dependency installation: npm reported zero known vulnerabilities; upstream deprecation warnings remain.
- `npm test`: 57/57 passed in both the clean checkout and source-only ZIP extraction under a path containing spaces. No Git metadata or prebuilt frontend was needed.
- README Docker sequence with fresh random secrets and a new isolated MySQL volume: passed; imported 5,770 courses, 8,582 sections and 30,562 meetings.
- `npm run test:mysql`: 14/14 passed against a uniquely named disposable database.
- `npm run test:integration`: 6/6 passed against Docker, 6/6 against the real watched host API, and 6/6 through Vite at port 5173.
- `npm run smoke -- --restart`: passed outage readiness, guest CRUD and persistence through service restarts. Non-restart smoke passed against watch mode too.
- Chrome: selected COMP3230 and COMP3322 through Vite, generated two results, and verified the timetable visibly rendered.
- `npm run build`, `npm run check` and context-budget audit: passed; zero cycles/boundary violations, protected source hashes unchanged, only the existing documented stylesheet exception.

Host: macOS, Node 24.19.0, npm 11.19.0; containers: Node 24.21.0 and MySQL 8.0.46. Tests preserved existing credentials/databases and stopped only this audit's preview services.

Docker Compose 5.5.1 rejects a literal `%` in the project path before startup; use an extraction path without it. A prior preview also occupied the default ports; it was stopped before clean-volume validation. The first conflicted test volume was retained, not reused or erased. These environment failures are not counted as successful runs.

Native Windows, final production VM deployment and physical print output remain unverified. Passing these checks is not proof that every possible input is bug-free.
