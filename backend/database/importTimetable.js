const path = require('node:path');
const fs = require('node:fs/promises');
const { createHash } = require('node:crypto');
const mysql = require('mysql2/promise');
const { readDbConfig } = require('./db');
const { readWorkbook } = require('./l1_building_blocks/readWorkbook');
const { parseTimetableRows } = require('./l0_axioms/timetableRows');
const { importCatalog } = require('./l2_workflows/importCatalog');
async function main() {
  const file = process.argv[2] || path.join(__dirname, '../../Database/2026-27 class_timetable_20260902.xlsx');
  const hash = createHash('sha256').update(await fs.readFile(file)).digest('hex');
  const parsed = parseTimetableRows(await readWorkbook(file));
  const connection = await mysql.createConnection(readDbConfig(true));
  try { console.log(JSON.stringify({ sourceSha256: hash, counts: await importCatalog(connection, parsed, hash) }, null, 2)); }
  finally { await connection.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
