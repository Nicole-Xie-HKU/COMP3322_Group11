# Scheduler public contract

Import from `scheduler/scheduler.js`. Flat v3 `Course.sections` is preferred; v2 term-specific `offerings` remains supported. [Backend API](../backend/docs/api-examples.md) wraps the pure library with validation, bounded workers and signed pagination.

## Data and invariants

A course has `code`, `title`, nullable `credits`, and `sections`. Sections contain `id`, `type`, optional parent, `meetings`, and a `tba` array for unknown-time rows. Each source CLASS section bundles every meeting for that course option. Select exactly one CLASS section per requested course; legacy component types retain their own groups and lecture-parent constraints.

Meetings use `day` 1–7 (Monday–Sunday), integer minute `start`/`end`, optional inclusive `startDate`/`endDate` (`YYYY-MM-DD`) and venue. Times are Hong Kong wall time, with half-open intervals: adjacent classes do not conflict. Reading-week/date gaps remain separate. A shared date interval must contain the meeting weekday to conflict.

## Generation

```js
generateSchedules(courses, {
  term: '2026-27 Sem 1',
  locked: { COMP3322: '1A' },
  excluded: ['ECON1210:1B'],
  blocked: [{ day: 5, start: 540, end: 780, hard: true }],
  includeUnknownTimes: false,
  seatPolicy: 'allowWaitlist',
  prefs: { noMorningBefore: 600, weights: { morning: 10 } },
  maxResults: 100, maxNodes: 500000,
});
```

Typed locks such as `{COMP3322:{CLASS:'1A'}}` also work. Preference fields include `noEveningAfter`, `avoidDays`, `preferFreeDays`, `minimizeGaps`, `lunchBreak:{from,to,minutes}` and partial weights. A soft block (`hard:false`) penalizes rather than excludes. Seat policies are `ignore`, `allowWaitlist`, `openOnly`; unknown seats are not live availability.

By default, sections with any unknown meetings are excluded. Explicit `includeUnknownTimes:true` permits provisional results. Each schedule includes `fullyVerified` and `unknownSectionKeys`; completeness describes its selected sections, not all alternatives in the catalogue. No unknown time is inferred. Missing courses never yield a partial valid schedule. A weekday outside its entire teaching range is invalid and excluded even with provisional opt-in.

The result contains `schedules`, `warnings`, `skipped`, credit metadata, `total`, `totalExact`, `returnedCount`, `searchComplete`, `truncated`, and internal `continuation`. Empty complete searches include `diagnosis`. Schedule IDs preserve distinct section choices. Totals are lower bounds until search completes; preferences sort only the current page. Internal `state` resumes traversal and must not be accepted unsigned over HTTP. The API exposes `nextCursor` instead.

## Other exports

- `validateCourses`: source-model errors; `meetingCompleteness`, `hasUnknownMeetings`: unknown-time classification; `hasImpossibleMeetingDates`: inconsistent-date guard.
- `meetingsOverlap`, `sectionsConflict`, `hitsBlocked`, `detectConflicts`: date-aware conflict checks.
- `toMin`, `fmtMin`, `scheduleId`, `seatStatus`: value helpers.
- `DEFAULT_WEIGHTS`, `scoreSchedule`: explainable preference scoring.
- `toFullCalendarEvents`: inclusive source dates converted to exclusive recurrence ends.
- `toPrintRows`, `toCSV`: date ranges and explicit TBA rows; CSV neutralizes formula prefixes.
- `toICS`: distinct, stable IDs per date-bounded series, Hong Kong times encoded in UTC, escaped/folded text. Requires valid dates for timed meetings; TBA rows cannot become timed calendar events.

[Project map](../PROJECT.md) · [Tests](../backend/docs/testing.md)
