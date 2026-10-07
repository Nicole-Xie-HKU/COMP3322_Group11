# Local repair details — 2026-10-06

[Status](../../TASK_PROGRESS.md) · [Test commands](testing.md)

1. **A selected course appears absent.** The workbook has no timed meeting for ECON1210:1B. With COMP3322, the old search emitted ten ordinary results, including one with no ECON1210 calendar event. Default search now returns nine fully timed results. Explicit unknown-time opt-in returns ten, with the affected result labelled provisional and ECON1210:1B listed as Time TBA. Mixed timed/TBA sections receive the same protection; saved schedules retain completeness. Week-specific absence for dated classes is explained separately.
2. **Workbook schema drift can erase times.** Required weekday/time/date headers are validated before import. Missing columns fail rather than converting known schedules into TBA. Blank cells in a valid schema remain legitimate unknown data. A malformed temporary workbook leaves all 30,562 stored meeting rows and the import revision intact.
3. **Partial maps return HTTP 400.** Zod partial records now accept a typed CLASS lock and a single preference weight, while rejecting unknown keys. String locks remain supported.
4. **ICS imports can collapse teaching ranges.** Stable UID identity includes course, section, term, dates, weekday, times and venue. Separate teaching ranges no longer share identifiers; output also escapes text, folds UTF-8 lines and converts Hong Kong times to UTC.
5. **First-run guide fails.** The root guide now uses Node 24, random ignored secrets, explicit MySQL/setup/app steps and preservation instructions for existing credentials/volumes.
6. **Test commands can silently skip the backend.** The backend suites are restored. A required-suite runner rejects missing/empty test folders and propagates test failures. Real HTTP expectations now match four COMP3322 ranges and HTTP 400 for a malformed term.

7. **Additional empty result from impossible dates.** The all-course check found MMPH6173:SA in summer: Monday is declared, but both dates are 2027-06-30 (Wednesday). Generation excludes it even with provisional opt-in, direct save/conflict requests return 400, and an existing affected server save returns 409. Legacy UI saves are rejected visibly. No weekday/date correction is guessed.

Regression tests cover the normal and failure paths of each repair. They do not establish that every possible bug is absent. Database facts remain a source snapshot; no live enrollment, production deployment or third-party calendar import is claimed.
