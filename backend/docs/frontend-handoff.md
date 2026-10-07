# Frontend handoff

[Backend home](../README.md) · [API examples](api-examples.md)

The maintained React frontend calls `/api` through `frontend/src/api.js`. Use the same origin in production and the configured Vite proxy in development. Browser guest cookies are HttpOnly; do not move them to localStorage.

## Generation and completeness

Send term, course codes and optional section locks. `includeUnknownTimes` defaults to false. A user must opt in to receive sections with incomplete times. Preserve this flag in every continuation request; changing it invalidates the old cursor.

Each generated or reopened saved schedule has `fullyVerified` and `unknownSectionKeys`. Show provisional status beside the result and list affected course/section keys outside the timed grid. A course card alone is not enough to explain why the calendar has no events. The UI also computes completeness for legacy local saves.

`hasUnknownTimes` is catalogue-wide: an unselected alternative can be unknown while the current schedule is fully timed. Never use that aggregate flag as the result's completeness status.

Meetings carry inclusive teaching-date ranges. FullCalendar shows a week, not the entire term. `WeeklyCoverage` names selected timed sections with no occurrences that week; section cards and print details retain teaching dates. Do not stretch source date ranges to make every course appear every week. If a stated weekday never occurs in the entire date range, generation excludes that section; save/conflict requests reject it. Reopening an affected server save returns 409, and legacy UI saves show an error.

## Results and persistence

Load more repeats unchanged inputs with `nextCursor` and appends schedules. Do not label an incomplete search as no solution. Display structured diagnosis for complete empty results. Pinning and policy changes clear old results before regeneration.

Saves persist section keys, not trusted client meeting times. Reopening resolves the current catalogue and can return 409 if a section becomes stale. Existing unknown-time saves reopen as provisional rather than disappearing. Show server errors; do not fall back silently to a different schedule.

Source snapshot facts are not live seats, verified credits or enrollment guarantees. [Verification](testing.md) separates HTTP, database and browser evidence.
