const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const text = value => value == null ? null : String(value?.richText ? value.richText.map(v => v.text).join('') : value).trim() || null;
function termId(name) {
  const match = /^(\d{4}-\d{2})\s+(?:Sem\s*([12])|Sum Sem)$/i.exec(name);
  if (!match) throw new Error(`Unrecognized term: ${name}`);
  return `${match[1]}-${match[2] ? `S${match[2]}` : 'SU'}`;
}
function excelDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(Math.round((value - 25569) * 86400000)).toISOString().slice(0, 10);
  throw new Error('Missing or invalid source date');
}
function excelMinutes(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  if (value instanceof Date) return value.getUTCHours() * 60 + value.getUTCMinutes();
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round((value % 1) * 1440);
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value).trim());
  if (match && Number(match[1]) <= 23 && Number(match[2]) <= 59) return Number(match[1]) * 60 + Number(match[2]);
  if (/^(TBA|TBC|ARR)$/i.test(String(value).trim())) return null;
  throw new Error('Unrecognized source time');
}
function parseTimetableRows(rows) {
  const terms = new Map(), courses = new Map(), sections = new Map();
  const stats = { rows: rows.length, blank: 0, tba: 0, multiDay: 0 };
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!Object.values(row).some(v => v != null && v !== '')) { stats.blank++; continue; }
    try {
      const name = text(row.TERM), code = text(row['COURSE CODE']), section = text(row['CLASS SECTION']);
      if (!name || !code || !section) throw new Error('Missing term, course or section identity');
      const term = termId(name), startDate = excelDate(row['START DATE']), endDate = excelDate(row['END DATE']);
      if (startDate > endDate) throw new Error('Reversed date range');
      const termRow = terms.get(term) ?? { id: term, name, startDate, endDate };
      termRow.startDate = [termRow.startDate, startDate].sort()[0];
      termRow.endDate = [termRow.endDate, endDate].sort().at(-1); terms.set(term, termRow);
      courses.set(code, [code, text(row['COURSE TITLE']) ?? code, text(row['OFFER DEPT']), text(row.ACAD_CAREER)]);
      const key = `${term}|${code}|${section}`;
      const classNumber = Number(row['CLASS NUMBER']) || null;
      const record = sections.get(key) ?? { term, code, section, classNumber, instructors: new Set(), meetings: new Map() };
      if (record.classNumber !== classNumber) throw new Error('Multiple class numbers for one section identity');
      (text(row.INSTRUCTOR) ?? '').split(/;\s*/).filter(Boolean).forEach(name => record.instructors.add(name));
      let days = DAYS.map((day, i) => text(row[day]) ? i + 1 : null).filter(day => day != null);
      if (days.length > 1) stats.multiDay++;
      let start = excelMinutes(row['START TIME']), end = excelMinutes(row['END TIME']);
      if (!days.length || start == null || end == null) { stats.tba++; days = [null]; start = null; end = null; }
      else if (!(start >= 0 && start < end && end <= 1440)) throw new Error('Invalid time interval');
      for (const day of days) {
        const meeting = [day, start, end, startDate, endDate, text(row.VENUE)];
        record.meetings.set(JSON.stringify(meeting), meeting);
      }
      sections.set(key, record);
    } catch (error) { throw new Error(`Workbook row ${index + 2}: ${error.message}`); }
  }
  if (!sections.size) throw new Error('Source contains no usable sections; database left unchanged');
  return { terms, courses, sections, stats };
}
module.exports = { text, termId, excelDate, excelMinutes, parseTimetableRows };
