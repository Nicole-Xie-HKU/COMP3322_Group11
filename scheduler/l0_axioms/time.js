export const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fmtMin = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const addDay = date => new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}
// Recurrences overlap only if the shared date interval contains this weekday.
export function datesOverlap(a, b) {
  const start = [a.startDate, b.startDate].filter(Boolean).sort().at(-1);
  const end = [a.endDate, b.endDate].filter(Boolean).sort()[0];
  if (!start || !end) return true;
  if (start > end) return false;
  const first = new Date(`${start}T00:00:00Z`);
  const delta = (a.day - ((first.getUTCDay() + 6) % 7 + 1) + 7) % 7;
  first.setUTCDate(first.getUTCDate() + delta);
  return first.toISOString().slice(0, 10) <= end;
}
export const meetingsOverlap = (a, b) => a.day === b.day && a.start < b.end && b.start < a.end && datesOverlap(a, b);
