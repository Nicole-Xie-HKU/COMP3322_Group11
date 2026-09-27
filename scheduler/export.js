// 导出工具：FullCalendar 事件 / 打印表格 / .ics 日历文件
import { fmtMin } from './scheduler.js';

const PALETTE = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626'];
export const colorFor = (code, codes) => PALETTE[codes.indexOf(code) % PALETTE.length];

/** FullCalendar 重复事件；termInfo = {startDate,endDate} 限定学期范围 */
export function toFullCalendarEvents(schedule, termInfo = {}, blocked = []) {
  const codes = [...new Set(schedule.sections.map(s => s.courseCode))];
  const ev = schedule.sections.flatMap(s => s.meetings.map(m => ({
    id: `${s.courseCode}-${s.id}-${m.day}-${m.start}`,
    title: `${s.courseCode} ${s.type} ${s.id}`,
    daysOfWeek: [m.day % 7], startTime: fmtMin(m.start), endTime: fmtMin(m.end),
    startRecur: m.startDate ?? termInfo.startDate, endRecur: m.endDate ?? termInfo.endDate,
    color: colorFor(s.courseCode, codes),
    extendedProps: { venue: m.venue, instructor: s.instructor, seat: s.seat, seatsLeft: s.seatsLeft, alternatives: s.alternatives },
  })));
  const bl = blocked.map((b, i) => ({ id: `blocked-${i}`, title: b.label ?? '不排课', daysOfWeek: [b.day % 7],
    startTime: fmtMin(b.start), endTime: fmtMin(b.end), display: 'background', color: '#9ca3af' }));
  return [...ev, ...bl];
}

/** 打印/导出 CSV 用的平铺表格，按星期和时间排序 */
const DAY = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export function toPrintRows(schedule) {
  return schedule.sections.flatMap(s => s.meetings.map(m => ({
    day: DAY[m.day], _d: m.day, _s: m.start, time: `${fmtMin(m.start)}-${fmtMin(m.end)}`,
    course: s.courseCode, title: s.courseTitle, type: s.type, section: s.id,
    venue: m.venue ?? '', instructor: s.instructor ?? '', credits: s.credits,
    seat: s.seat === 'waitlist' ? '候补' : s.seat === 'full' ? '已满' : `剩余 ${s.seatsLeft ?? '-'}`,
  }))).sort((a, b) => a._d - b._d || a._s - b._s).map(({ _d, _s, ...r }) => r);
}
export function toCSV(schedule) {
  const rows = toPrintRows(schedule); if (!rows.length) return '';
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  return '\ufeff' + [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(esc).join(','))].join('\r\n');
}

/** 导出 .ics，可导入 Google/Apple/Outlook 日历（本地时间 Asia/Hong_Kong） */
export function toICS(schedule, termInfo) {
  const ymd = d => d.replaceAll('-', '');
  const BYDAY = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  const firstOn = (startDate, day) => { const d = new Date(startDate + 'T00:00:00Z'); while (((d.getUTCDay() + 6) % 7) + 1 !== day) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
  const t = m => fmtMin(m).replace(':', '') + '00';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HKUPlan//EN', 'CALSCALE:GREGORIAN'];
  for (const s of schedule.sections) for (const m of s.meetings) {
    const from = m.startDate ?? termInfo.startDate, to = m.endDate ?? termInfo.endDate, d0 = ymd(firstOn(from, m.day));
    lines.push('BEGIN:VEVENT', `UID:${s.courseCode}-${s.id}-${m.day}-${m.start}@hkuplan`,
      `DTSTAMP:${d0}T000000Z`,
      `SUMMARY:${s.courseCode} ${s.type} ${s.id}`, `LOCATION:${m.venue ?? ''}`,
      `DTSTART;TZID=Asia/Hong_Kong:${d0}T${t(m.start)}`, `DTEND;TZID=Asia/Hong_Kong:${d0}T${t(m.end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[m.day]};UNTIL=${ymd(to)}T235959Z`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
