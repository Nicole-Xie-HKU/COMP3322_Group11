import { fmtMin } from '../l0_axioms/time.js';
import { seatStatus } from '../l0_axioms/identity.js';
import { hasUnknownMeetings } from '../l0_axioms/completeness.js';
import { describeBlock } from '../l0_axioms/blocks.js';
import { hitsBlocked } from './conflicts.js';

const DAY = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const tag = (id, label, tone) => ({ id, label, tone });
const tick = value => Math.round(value * 10) / 10;

/** Derived labels for one section: schedule shape, data trust and seat state. */
export function sectionTags(section) {
  if (!section) return [];
  const meetings = section.meetings ?? [];
  const tags = [], starts = meetings.map(m => m.start), ends = meetings.map(m => m.end);
  const days = [...new Set(meetings.map(m => m.day))].sort((a, b) => a - b);
  const venues = new Set(meetings.map(m => m.venue).filter(Boolean));
  const ranges = new Set(meetings.map(m => `${m.startDate ?? ''}/${m.endDate ?? ''}`));
  if (meetings.some(m => m.start < 540)) tags.push(tag('early', `Early ${fmtMin(Math.min(...starts))}`, 'warn'));
  if (meetings.some(m => m.end > 1110)) tags.push(tag('late', `Until ${fmtMin(Math.max(...ends))}`, 'warn'));
  if (days.some(day => day >= 6)) tags.push(tag('weekend', `Weekend ${days.filter(d => d >= 6).map(d => DAY[d]).join('/')}`, 'warn'));
  if (meetings.some(m => m.end - m.start >= 150)) tags.push(tag('long', 'Long block', 'info'));
  if (venues.size > 1) tags.push(tag('venue', `${venues.size} venues`, 'info'));
  if (days.length > 1) tags.push(tag('days', `${days.length} days/week`, 'info'));
  if (ranges.size > 1) tags.push(tag('split', `Split ${ranges.size} ranges`, 'info'));
  // Split teaching ranges repeat the same weekly slot; count each slot once.
  const slots = new Map(meetings.map(m => [`${m.day}|${m.start}|${m.end}`, m]));
  const hours = [...slots.values()].reduce((total, m) => total + (m.end - m.start), 0) / 60;
  if (hours) tags.push(tag('hours', `${tick(hours)}h/week`, 'info'));
  if (hasUnknownMeetings(section)) tags.push(tag('tba', 'Time TBA', 'warn'));
  const seat = seatStatus(section);
  if (seat === 'full') tags.push(tag('full', 'Full', 'warn'));
  else if (seat === 'waitlist') tags.push(tag('waitlist', 'Waitlist', 'warn'));
  else if (seat === 'unknown') tags.push(tag('seats', 'Seats unknown', 'muted'));
  return tags;
}

/** Labels for a whole timetable: days, gaps, uncovered time and event collisions. */
export function scheduleTags(schedule, { blocked = [] } = {}) {
  const sections = schedule?.sections ?? [];
  if (!sections.length) return [];
  const meetings = sections.flatMap(s => s.meetings ?? []);
  // A schedule with no timed meeting (all TBA) is exactly the case that must not look verified.
  if (!meetings.length) return [tag('tba', 'Partial TBA', 'warn')];
  const byDay = new Map();
  for (const meeting of meetings) {
    if (!byDay.has(meeting.day)) byDay.set(meeting.day, []);
    byDay.get(meeting.day).push(meeting);
  }
  let gap = 0;
  for (const list of byDay.values()) {
    const sorted = [...list].sort((a, b) => a.start - b.start);
    let end = sorted[0].end;
    for (const meeting of sorted.slice(1)) {
      if (meeting.start - end > 10) gap += meeting.start - end; // 10 minutes between rooms is not a gap
      end = Math.max(end, meeting.end);
    }
  }
  const days = [...byDay.keys()].sort((a, b) => a - b), tags = [];
  tags.push(tag('days', `${days.length} class days`, 'info'));
  const slots = new Map(meetings.map(m => [`${m.day}|${m.start}|${m.end}`, m]));
  tags.push(tag('hours', `${tick([...slots.values()].reduce((total, m) => total + (m.end - m.start), 0) / 60)}h contact`, 'info'));
  if (meetings.some(m => m.start < 510)) tags.push(tag('early', `Earliest ${fmtMin(Math.min(...meetings.map(m => m.start)))}`, 'warn'));
  if (meetings.some(m => m.end > 1110)) tags.push(tag('late', `Latest ${fmtMin(Math.max(...meetings.map(m => m.end)))}`, 'warn'));
  if (days.some(day => day >= 6)) tags.push(tag('weekend', 'Weekend class', 'warn'));
  if (gap) tags.push(tag('gaps', `${tick(gap / 60)}h free between classes`, 'info'));
  else if (days.length > 1) tags.push(tag('nogap', 'No gaps', 'good'));
  if (sections.some(hasUnknownMeetings)) tags.push(tag('tba', 'Partial TBA', 'warn'));
  if (sections.some(section => seatStatus(section) === 'waitlist')) tags.push(tag('waitlist', 'Contains waitlist', 'warn'));
  if (sections.some(section => seatStatus(section) === 'unknown')) tags.push(tag('seats', 'Seats unknown', 'muted'));
  const collisions = [...new Set(sections.flatMap(section => hitsBlocked(section, blocked)).map(describeBlock))];
  if (collisions.length) tags.push(tag('events', `${collisions.length} event collision${collisions.length > 1 ? 's' : ''}`, 'warn'));
  return tags;
}
