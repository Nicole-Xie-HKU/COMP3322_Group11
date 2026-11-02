import { fmtMin, isDate } from './time.js';

// A personal event becomes the same day + minutes + optional date range shape as a meeting.
const DAY = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Monday=1 to Sunday=7 for a calendar date.
export function weekdayOf(date) {
  return ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

function isBlock(value) {
  return Boolean(value) && Number.isInteger(value.day) && value.day >= 1 && value.day <= 7 &&
    Number.isInteger(value.start) && Number.isInteger(value.end) && value.start >= 0 &&
    value.end <= 1440 && value.start < value.end &&
    (value.startDate == null || (isDate(value.startDate) && isDate(value.endDate) && value.startDate <= value.endDate));
}

/** Normalize one personal event; returns `{ block }` or `{ error }` without throwing. */
export function normalizeBlock(value, index = 0) {
  const fail = message => ({ error: `Event ${index + 1}: ${message}` });
  if (!value || typeof value !== 'object') return fail('must be an object');
  const { start, end, day, date, startDate, endDate } = value;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 1440 || start >= end) {
    return fail('start must be before end within one day');
  }
  const label = typeof value.label === 'string' ? value.label.trim().slice(0, 100) : '';
  const hard = value.hard !== false;
  if (date != null) {
    if (!isDate(date)) return fail('date must be a valid YYYY-MM-DD');
    if ((startDate ?? date) !== date || (endDate ?? date) !== date) return fail('a one-off event covers exactly one date');
    if (day != null && day !== weekdayOf(date)) return fail('day does not match date');
    return { block: { ...value, day: weekdayOf(date), date, startDate: date, endDate: date, label, hard } };
  }
  if ((startDate == null) !== (endDate == null)) return fail('provide both startDate and endDate');
  if (!Number.isInteger(day) || day < 1 || day > 7) return fail('provide day 1-7 or a one-off date');
  if (startDate != null && (!isDate(startDate) || !isDate(endDate) || startDate > endDate)) {
    return fail('startDate must not be after endDate');
  }
  return { block: { ...value, startDate: startDate ?? undefined, endDate: endDate ?? undefined, label, hard } };
}

export function normalizeBlocks(values) {
  const blocks = [], errors = [];
  if (values == null) return { blocks, errors };
  if (!Array.isArray(values)) return { blocks, errors: ['Personal events must be an array'] };
  values.forEach((value, index) => {
    if (index >= 32) { errors.push(`Event ${index + 1}: at most 32 personal events are supported`); return; }
    const { block, error } = normalizeBlock(value, index);
    if (error) errors.push(error); else blocks.push(block);
  });
  return { blocks, errors };
}

// Cheap pass-through for already normalized events, compared once per meeting.
export function asBlock(value) {
  if (isBlock(value)) return value;
  return normalizeBlock(value).block ?? null;
}

// Human-readable label used by warnings, tags and the calendar legend.
export function describeBlock(block) {
  const name = block.label || 'Personal event';
  const time = `${fmtMin(block.start)}-${fmtMin(block.end)}`;
  if (block.date) return `${name} ${block.date} ${time}`;
  const days = block.startDate ? `${DAY[block.day]} ${block.startDate}–${block.endDate} ${time}` : `${DAY[block.day]} ${time}`;
  return `${name} ${days}`;
}
