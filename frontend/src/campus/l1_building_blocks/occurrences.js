const DAY_MS = 86400000;
export function isCalendarDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Date-only arithmetic avoids host time-zone/DST shifts; the schedule uses Hong Kong wall time. */
export function weeklyOccurrences(schedule, range, term = {}) {
  if (!isCalendarDate(range?.startDate) || !isCalendarDate(range?.endDate)) return { days: [], uncertain: false };
  const start = Date.parse(range.startDate), end = Date.parse(range.endDate);
  if (end < start || end - start >= 7 * DAY_MS) return { days: [], uncertain: false };
  const days = [], sections = schedule?.sections || [];
  let uncertain = sections.some(section => section.tba?.length || !section.meetings?.length);
  for (let time = start; time <= end; time += DAY_MS) {
    const date = new Date(time).toISOString().slice(0, 10);
    const weekday = (new Date(time).getUTCDay() + 6) % 7 + 1;
    const meetings = [], seen = new Set();
    for (const section of sections) for (const meeting of section.meetings || []) {
      if (meeting.day !== weekday) continue;
      const first = meeting.startDate ?? term?.startDate, last = meeting.endDate ?? term?.endDate;
      if (!isCalendarDate(first) || !isCalendarDate(last) || first > last ||
        !Number.isFinite(meeting.start) || !Number.isFinite(meeting.end) ||
        meeting.start < 0 || meeting.end > 1440 || meeting.end <= meeting.start) {
        uncertain = true; continue;
      }
      if (date < first || date > last) continue;
      const id = `${section.courseCode}:${section.id}:${meeting.start}:${meeting.end}:${meeting.venue ?? ''}`;
      if (seen.has(id)) continue;
      seen.add(id);
      meetings.push({ ...meeting, course: section.courseCode, sectionId: section.id, date });
    }
    days.push(meetings.sort((a, b) => a.start - b.start || a.end - b.end || a.course.localeCompare(b.course)));
  }
  return { days, uncertain };
}

export function consecutivePairs(meetings) {
  const overlapping = new Set();
  for (let a = 0; a < meetings.length; a += 1) for (let b = a + 1; b < meetings.length; b += 1) {
    if (meetings[a].start < meetings[b].end && meetings[b].start < meetings[a].end) {
      overlapping.add(a); overlapping.add(b);
    }
  }
  return meetings.slice(1).flatMap((next, index) => overlapping.has(index) || overlapping.has(index + 1)
    ? [] : [[meetings[index], next]]);
}
