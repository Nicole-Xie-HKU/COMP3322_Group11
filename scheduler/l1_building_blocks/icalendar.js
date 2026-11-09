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

/** Short content fingerprint. Not a security hash; identical events must keep identical UIDs. */
function fingerprint(value) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16)}${(h1 >>> 0).toString(16)}`;
}

/** Export date-bounded series with stable identifiers and folded text; unknown times are reported, never invented. */
export function buildICS(schedule, termInfo = {}, options = {}) {
  const { now = new Date(), alarmMinutes = 0, calendarName = 'HKUPlan' } = options;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HKUPlan//EN', 'CALSCALE:GREGORIAN'];
  if (calendarName) lines.push(`X-WR-CALNAME:${escapeText(calendarName)}`);
  const seen = new Set(), stamp = utcStamp(now), skippedTba = [];
  let eventCount = 0, tbaCount = 0;
  for (const section of schedule.sections) {
    const tbaRows = Array.isArray(section.tba) ? section.tba.length : section.tba ? 1 : 0;
    const unknown = tbaRows || (section.meetings?.length ? 0 : 1);
    if (unknown) { skippedTba.push(`${section.courseCode}:${section.id}`); tbaCount += unknown; }
    const summary = `${section.courseCode} ${section.type ?? 'CLASS'} ${section.id}`;
    const description = [section.courseTitle, section.instructor, section.credits != null ? `${section.credits} credits` : null,
      `Section ${section.id}`, 'Exported from HKUPlan'].filter(Boolean).join('\n');
    for (const meeting of section.meetings ?? []) {
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
        meeting.day, meeting.start, meeting.end, meeting.venue ?? ''].join('|');
      const uid = `${fingerprint(identity)}@hkuplan.local`;
      if (seen.has(uid)) continue;
      seen.add(uid); eventCount++;
      lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, `SUMMARY:${escapeText(summary)}`,
        `DESCRIPTION:${escapeText(description)}`);
      if (meeting.venue) lines.push(`LOCATION:${escapeText(meeting.venue)}`);
      lines.push(`DTSTART:${utcTime(first, meeting.start)}`, `DTEND:${utcTime(first, meeting.end)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${weekdays[meeting.day]};UNTIL=${utcTime(to, 1439).replace(/00Z$/, '59Z')}`,
        'STATUS:CONFIRMED');
      if (alarmMinutes > 0) {
        lines.push('BEGIN:VALARM', `TRIGGER:-PT${alarmMinutes}M`, 'ACTION:DISPLAY',
          `DESCRIPTION:${escapeText(summary)}`, 'END:VALARM');
      }
      lines.push('END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return { text: lines.map(foldLine).join('\r\n') + '\r\n', eventCount, tbaCount, skippedTba };
}

export const toICS = (schedule, termInfo = {}, options = {}) => buildICS(schedule, termInfo, options).text;
