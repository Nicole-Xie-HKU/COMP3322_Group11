import { meetingsOverlap } from "../../../scheduler/scheduler";

export default function WeeklyCoverage({ schedule, range }) {
  if (!schedule || !range) return null;
  const absent = schedule.sections.filter(section => section.meetings.length && !section.meetings.some(meeting =>
    meetingsOverlap(meeting, { day: meeting.day, start: 0, end: 1440, ...range })));
  if (!absent.length) return null;
  return <p className="schedule-note" role="status">
    No timed meetings this week: {absent.map(s => `${s.courseCode} ${s.id}`).join(", ")}.
    These sections remain selected; use the week arrows to view their teaching dates.
  </p>;
}
