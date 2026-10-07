import { isDate } from '../l0_axioms/time.js';

const weekdays = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const escapeText = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n')
  .replace(/;/g, '\\;').replace(/,/g, '\\,');
const utcStamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
// Source times are modern Hong Kong wall time (UTC+08:00); UTC output needs no VTIMEZONE.
const utcTime = (date, minutes) => utcStamp(new Date(Date.parse(`${date}T00:00:00Z`) + (minutes - 480) * 60000));

function foldLine(line) {
  const encoder = new TextEncoder();
  const parts = []; let part = '', bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) { parts.push(part); part = ' '; bytes = 1; }
    part += character; bytes += size;
  }
  parts.push(part); return parts.join('\r\n');
}

/** Export distinct date-bounded series with stable identifiers and escaped, folded text. */
export function toICS(schedule, termInfo = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HKUPlan//EN', 'CALSCALE:GREGORIAN'];
  const seen = new Set(), stamp = utcStamp(new Date());
  for (const section of schedule.sections) for (const meeting of section.meetings) {
    const from = meeting.startDate ?? termInfo.startDate, to = meeting.endDate ?? termInfo.endDate;
    if (!isDate(from) || !isDate(to) || from > to) throw new Error('Calendar export requires valid teaching dates');
    if (!Number.isInteger(meeting.day) || meeting.day < 1 || meeting.day > 7 ||
        !Number.isInteger(meeting.start) || !Number.isInteger(meeting.end) ||
        meeting.start < 0 || meeting.end > 1440 || meeting.start >= meeting.end) throw new Error('Calendar export requires valid meeting times');
    const date = new Date(`${from}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + (meeting.day - (date.getUTCDay() || 7) + 7) % 7);
    const first = date.toISOString().slice(0, 10);
    if (first > to) continue;
    const identity = [section.courseCode, section.id, termInfo.id ?? '', from, to,
      meeting.day, meeting.start, meeting.end, meeting.venue ?? ''];
    const uid = `${encodeURIComponent(JSON.stringify(identity))}@hkuplan.local`;
    if (seen.has(uid)) continue;
    seen.add(uid);
    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`,
      `SUMMARY:${escapeText(`${section.courseCode} ${section.type ?? 'CLASS'} ${section.id}`)}`,
      `LOCATION:${escapeText(meeting.venue)}`, `DTSTART:${utcTime(first, meeting.start)}`,
      `DTEND:${utcTime(first, meeting.end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${weekdays[meeting.day]};UNTIL=${utcTime(to, 1439).replace(/00Z$/, '59Z')}`,
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
