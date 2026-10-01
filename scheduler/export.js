import { fmtMin } from './scheduler.js';

const PALETTE = ['#bed8b5', '#b9d5df', '#e5d3ac', '#d3c5df', '#e5bdba', '#b9d8cc', '#e1d7b5', '#c9cee5'];
export const colorFor = (code, codes) => PALETTE[Math.max(0, codes.indexOf(code)) % PALETTE.length];

function nextDate(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function toFullCalendarEvents(schedule, termInfo = {}, blocked = []) {
  const codes = [...new Set(schedule.sections.map(s => s.courseCode))].sort();
  const ev = schedule.sections.flatMap(s => s.meetings.map(m => ({
    id: `${s.courseCode}-${s.id}-${m.day}-${m.start}-${m.startDate ?? ''}-${m.venue ?? ''}`,
    title: `${s.courseCode} ${s.id}`,
    daysOfWeek: [m.day % 7],
    startTime: fmtMin(m.start), endTime: fmtMin(m.end),
    startRecur: m.startDate ?? termInfo.startDate, endRecur: nextDate(m.endDate ?? termInfo.endDate),
    color: colorFor(s.courseCode, codes),
    extendedProps: { courseCode: s.courseCode, sectionId: s.id, venue: m.venue, instructor: s.instructor, alternatives: s.alternatives },
  })));
  const bl = blocked.map((b, i) => ({
    id: `blocked-${i}`, title: b.label ?? '不排课', daysOfWeek: [b.day % 7],
    startTime: fmtMin(b.start), endTime: fmtMin(b.end), display: 'background', color: '#9ca3af',
  }));
  return [...ev, ...bl];
}

const DAY = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export function toPrintRows(schedule) {
  return schedule.sections.flatMap(s => s.meetings.map(m => ({
    day: DAY[m.day], _d: m.day, _s: m.start, time: `${fmtMin(m.start)}-${fmtMin(m.end)}`,
    course: s.courseCode, title: s.courseTitle, section: s.id,
    venue: m.venue ?? '', instructor: s.instructor ?? '', credits: s.credits,
  }))).sort((a, b) => a._d - b._d || a._s - b._s).map(({ _d, _s, ...r }) => r);
}

export function toCSV(schedule) {
  const rows = toPrintRows(schedule); if (!rows.length) return '';
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  return '\ufeff' + [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(esc).join(','))].join('\r\n');
}

export function toICS(schedule, termInfo = {}) {
  const ymd = d => d.replaceAll('-', '');
  const BYDAY = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  const firstOn = (startDate, day) => {
    const d = new Date(startDate + 'T00:00:00Z');
    while (((d.getUTCDay() + 6) % 7) + 1 !== day) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const t = m => fmtMin(m).replace(':', '') + '00';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HKUPlan//EN', 'CALSCALE:GREGORIAN'];
  for (const s of schedule.sections) for (const m of s.meetings) {
    const from = m.startDate ?? termInfo.startDate, to = m.endDate ?? termInfo.endDate;
    if (!from || !to) continue;
    const d0 = ymd(firstOn(from, m.day));
    lines.push('BEGIN:VEVENT', `UID:${s.courseCode}-${s.id}-${m.day}-${m.start}@hkuplan`,
      `DTSTAMP:${d0}T000000Z`,
      `SUMMARY:${s.courseCode} ${s.id}`, `LOCATION:${m.venue ?? ''}`,
      `DTSTART;TZID=Asia/Hong_Kong:${d0}T${t(m.start)}`, `DTEND;TZID=Asia/Hong_Kong:${d0}T${t(m.end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[m.day]};UNTIL=${ymd(to)}T235959Z`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
