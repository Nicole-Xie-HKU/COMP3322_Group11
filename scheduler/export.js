// Calendar events, print rows and downloadable calendar formats.
import { fmtMin, addDay } from './l0_axioms/time.js';

const PALETTE = ['#bed8b5', '#b9d5df', '#e5d3ac', '#d3c5df', '#e5bdba', '#b9d8cc', '#e1d7b5', '#c9cee5'];
export const colorFor = (code, codes) => PALETTE[Math.max(0, codes.indexOf(code)) % PALETTE.length];

/** Meeting date ranges are inclusive; FullCalendar recurrence ends are exclusive. */
export function toFullCalendarEvents(schedule, termInfo = {}, blocked = []) {
  const codes = [...new Set(schedule.sections.map(s => s.courseCode))].sort();
  const ev = schedule.sections.flatMap(s => s.meetings.map(m => ({
    id: `${s.courseCode}-${s.id}-${m.day}-${m.start}-${m.startDate ?? 'term'}-${m.endDate ?? 'term'}`,
    title: `${s.courseCode} ${s.id}`,
    daysOfWeek: [m.day % 7], startTime: fmtMin(m.start), endTime: fmtMin(m.end),
    startRecur: m.startDate ?? termInfo.startDate, endRecur: (m.endDate ?? termInfo.endDate) ? addDay(m.endDate ?? termInfo.endDate) : undefined,
    color: colorFor(s.courseCode, codes),
    extendedProps: { courseCode: s.courseCode, sectionId: s.id, venue: m.venue, instructor: s.instructor, seat: s.seat, seatsLeft: s.seatsLeft, alternatives: s.alternatives },
  })));
  const bl = blocked.map((b, i) => ({ id: `blocked-${i}`, title: b.label ?? 'Blocked time', daysOfWeek: [b.day % 7],
    startTime: fmtMin(b.start), endTime: fmtMin(b.end), display: 'background', color: '#9ca3af' }));
  return [...ev, ...bl];
}

// Print and CSV rows retain separate date ranges.
const DAY = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function toPrintRows(schedule) {
  return schedule.sections.flatMap(s => {
    const common = {course: s.courseCode, title: s.courseTitle, type: s.type, section: s.id,
      instructor: s.instructor ?? '', credits: s.credits,
      seat: !s.seat || s.seat === 'unknown' ? 'Unknown' : s.seat === 'waitlist' ? 'Waitlist' : s.seat === 'full' ? 'Full' : `Seats left: ${s.seatsLeft ?? '-'}`};
    const timed = s.meetings.map(m => ({...common, day: DAY[m.day], _d: m.day, _s: m.start,
      time: `${fmtMin(m.start)}-${fmtMin(m.end)}`, startDate: m.startDate ?? '', endDate: m.endDate ?? '', venue: m.venue ?? ''}));
    const unknown = s.tba?.length ? s.tba : s.meetings.length ? [] : [{}];
    return [...timed, ...unknown.map(m => ({...common, day: 'TBA', _d: 8, _s: 0, time: 'TBA',
      startDate: m.startDate ?? '', endDate: m.endDate ?? '', venue: m.venue ?? ''}))];
  }).sort((a, b) => a._d - b._d || a._s - b._s || a.startDate.localeCompare(b.startDate)).map(({ _d, _s, ...r }) => r);
}
export function toCSV(schedule) {
  const rows = toPrintRows(schedule); if (!rows.length) return '';
  // Quoting alone does not prevent spreadsheets from executing a source title as a formula.
  const esc = value => {
    let text = value == null ? '' : String(value);
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\ufeff' + [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(esc).join(','))].join('\r\n');
}

export { toICS } from './l1_building_blocks/icalendar.js';
