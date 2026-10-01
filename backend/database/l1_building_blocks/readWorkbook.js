const ExcelJS = require('exceljs');
const { text } = require('../l0_axioms/timetableRows');
async function readWorkbook(file) {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, { sharedStrings: 'cache', worksheets: 'emit', styles: 'cache' });
  const rows = []; let header;
  for await (const worksheet of reader) {
    for await (const row of worksheet) {
      if (!header) {
        header = row.values.map(value => text(value)?.toUpperCase());
        for (const required of ['TERM','COURSE CODE','CLASS SECTION','START DATE','END DATE']) {
          if (!header.includes(required)) throw new Error(`Missing workbook column: ${required}`);
        }
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
