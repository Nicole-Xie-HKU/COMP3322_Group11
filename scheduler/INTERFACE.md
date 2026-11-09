# Scheduler public contract

Import from `scheduler/scheduler.js`. Flat v3 `Course.sections` is preferred; v2 term-specific `offerings` remains supported. [Backend API](../backend/docs/api-examples.md) adds validation, bounded workers and signed pagination.

## Data and invariants

A course has `code`, `title`, nullable `credits`, and `sections`. Sections contain `id`, `type`, optional parent, `meetings`, and `tba` rows for unknown times. Each source CLASS section bundles every meeting of that option: choose exactly one CLASS section per course; legacy types keep their own groups and lecture-parent constraints.

Meetings use `day` 1-7 (Mon-Sun), integer minute `start`/`end`, optional inclusive `startDate`/`endDate` (`YYYY-MM-DD`) and venue. Times are Hong Kong wall time with half-open intervals: adjacent classes do not conflict. Reading-week gaps stay separate, and a shared date window must contain the meeting weekday.

Personal events (`blocked`) take three shapes: `{day,start,end}` weekly, `{date,start,end}` once, and `{day,startDate,endDate,start,end}` inside a window. `hard:false` only lowers a score. Invalid events are reported in `warnings`, never guessed.

## Generation

```js
generateSchedules(courses, {
  term: '2026-27 Sem 1', locked: { COMP3322: '1A' },
  blocked: [{ day: 5, start: 540, end: 780, hard: true },
            { date: '2026-10-07', start: 900, end: 1020, label: 'Dentist' }],
  includeUnknownTimes: false, seatPolicy: 'allowWaitlist',
  prefs: { noMorningBefore: 600, weights: { morning: 10 } },
  maxResults: 100, maxNodes: 500000,
});
```

Typed locks such as `{COMP3322:{CLASS:'1A'}}` also work. Preferences add `noEveningAfter`, `avoidDays`, `preferFreeDays`, `minimizeGaps`, `lunchBreak` and partial weights. Seat policies: `ignore`, `allowWaitlist`, `openOnly`; unknown seats are not live availability.

Sections with unknown meetings are excluded unless `includeUnknownTimes:true`. Each schedule has `fullyVerified` and `unknownSectionKeys` for its own sections, not all alternatives. No unknown time is inferred; missing courses never yield a partial valid schedule; a weekday outside its teaching range is excluded.

Results contain `schedules`, `warnings`, `skipped`, `eventImpact`, credits, `total`, `totalExact`, `returnedCount`, `searchComplete`, `truncated` and internal `continuation`. `eventImpact` lists, per course, sections hidden by personal events. Totals are lower bounds until search completes; preferences sort only the current page. Internal `state` must not be accepted unsigned over HTTP; the API exposes `nextCursor`.

## Other exports

- `validateCourses`, `meetingCompleteness`, `hasUnknownMeetings`, `hasImpossibleMeetingDates`: source and completeness checks.
- `meetingsOverlap`, `sectionsConflict`, `hitsBlocked`, `blockHitsMeeting`, `detectConflicts`: date-aware conflicts, including dated events.
- `normalizeBlocks`, `normalizeBlock`, `describeBlock`: personal-event parsing and labels.
- `toMin`, `fmtMin`, `isDate`, `weekdayOf`, `scheduleId`, `seatStatus`: value helpers.
- `DEFAULT_WEIGHTS`, `scoreSchedule`: explainable preference scoring.
- `sectionTags`, `scheduleTags`: derived labels (early/late/weekend, split ranges, venues, TBA, seats, contact hours, gaps, event collisions).
- `toFullCalendarEvents`: inclusive dates converted to exclusive recurrence ends; dated events recur inside their window only.
- `toPrintRows`, `toCSV`: date ranges and explicit TBA rows; CSV neutralizes formula prefixes.
- `buildICS`: `{text,eventCount,tbaCount,skippedTba}`. Stable content-hashed UIDs, Hong Kong times in UTC, `DESCRIPTION`, folded text, optional alarm, injectable `now` for reproducible bytes. TBA rows are reported, never invented.
- `toICS`, `calendarFileName`: text-only convenience and an ASCII file name.

[Project map](../PROJECT.md) · [Tests](../backend/docs/testing.md)
