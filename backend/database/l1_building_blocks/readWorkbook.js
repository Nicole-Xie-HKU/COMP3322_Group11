const ExcelJS = require('exceljs');
const { text } = require('../l0_axioms/timetableRows');
async function readWorkbook(file) {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, { sharedStrings: 'cache', worksheets: 'emit', styles: 'cache' });
  const rows = []; let header;
  for await (const worksheet of reader) {
    for await (const row of worksheet) {
      if (!header) {
        header = row.values.map(value => text(value)?.toUpperCase());
        // An absent column is a schema error, not an intentionally blank TBA cell.
        for (const required of ['TERM','COURSE CODE','CLASS SECTION','CLASS NUMBER','START DATE','END DATE',
          'START TIME','END TIME','MON','TUE','WED','THU','FRI','SAT','SUN']) {
          if (!header.includes(required)) throw new Error(`Missing workbook column: ${required}`);
        }
        if (new Set(header.filter(Boolean)).size !== header.filter(Boolean).length) throw new Error('Duplicate workbook column');
        continue;
      }
      const record = {};
      header.forEach((name, i) => { if (name) record[name] = row.values[i]; });
      rows.push(record);
      if (rows.length > 150000) throw new Error('Workbook exceeds the supported import size');
    }
    break;
  }
  return rows;
}
module.exports = { readWorkbook };
