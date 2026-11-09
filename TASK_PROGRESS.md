# Project status

## Current setup

Use the root [README](README.md) for a fresh Git clone or GitHub ZIP. The default Docker app URL is http://localhost:3001. Git metadata and any earlier developer's local containers are not required. Preserve existing database credentials and volumes when updating an installation.

## 2026-10-08 — Launch and ZIP portability repairs

The user authorized fixing the launch-audit findings, testing and pushing. This repair is based on main `3647daf7f82ad654d0dacb910aeeafcaf9fa7e12`.

Implemented: scheduler workers ignore Node watch notifications and accept only scheduler result/error messages; diagnostic scripts decode file URLs correctly; current setup guidance no longer depends on an old local project or port. Regression coverage includes worker noise/error/exit/timeout, a real watched HTTP server and special-character extraction paths.

Verified from a source-only ZIP extracted under a path containing spaces: 57 unit/regression tests, 14 MySQL checks, six live HTTP checks, Docker setup, frontend build, source audits and restart persistence all passed. The README watch-mode API and Vite workflow also passed live HTTP and Chrome generation checks. See [launch repair details and results](backend/docs/task-progress/2026-10-08-launch-repair.md). No production deployment or native Windows verification is claimed.

## 2026-11-02 — Algorithm: personal events, tags and calendar export (local working tree)

Implemented without commits: date-aware personal events (weekly, one-off, or weekly inside a date window) filtered by the shared scheduler with an `eventImpact` report; derived section and schedule tags plus private per-course labels; in-browser `.ics` export with stable hashed UIDs, `DESCRIPTION`, TBA reporting and Google Calendar import guidance.

Verified locally: scheduler, calendar, tags, personal-event, export, API and contract suites pass, and OpenAPI was regenerated with the same 11 paths. Limits: no MySQL integration or browser run was performed, and the child-process suites (`import-safety`, `watch-mode`) fail only because this machine blocks piped child processes.

## History

- [2026-10-06 local timetable repair and 2026-10-07 publication preparation](backend/docs/task-progress/2026-10-06-timetable-repair.md). This is historical evidence, not portable startup guidance.
- 2026-10-07: main received the timetable repair through merge commit `3647daf`.

[Timetable repair details](backend/docs/patch-fixes.md) · [Historical verification](backend/docs/patch-verification.md) · [Test commands](backend/docs/testing.md)
