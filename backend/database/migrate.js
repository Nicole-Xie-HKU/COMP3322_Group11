const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const mysql = require('mysql2/promise');
const { readDbConfig } = require('./db');
async function migrate(connection) {
  const [[lock]] = await connection.query("SELECT GET_LOCK('hkuplan_schema_migration',10) AS acquired");
  if (!lock.acquired) throw new Error('Another migration is running');
  try {
    const [columns] = await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sections'");
    if (columns.length && !columns.some(c => c.COLUMN_NAME==='term')) {
      throw new Error('Not the merged-main schema. Use a separate database; no existing tables have been changed.');
    }
    await connection.query('CREATE TABLE IF NOT EXISTS backend_migrations(version VARCHAR(50) PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    const source = await fs.readFile(path.join(__dirname,'../../Database/schema.sql'),'utf8');
    const extension = await fs.readFile(path.join(__dirname,'backend-schema.sql'),'utf8');
    const checksum = createHash('sha256').update(source+extension).digest('hex');
    const [applied] = await connection.execute('SELECT checksum FROM backend_migrations WHERE version=?',['001-main-extension']);
    if (applied.length) {
      if (applied[0].checksum!==checksum) throw new Error('Applied schema checksum changed; add a migration instead.');
      return { applied:false,version:'001-main-extension' };
    }
    // MySQL DDL commits independently. Restartable CREATEs are not a transactional rollback.
    for (const sql of [source,extension]) for (const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)) await connection.query(statement);
    await connection.execute('INSERT INTO backend_migrations(version,checksum) VALUES(?,?)',['001-main-extension',checksum]);
    return { applied:true,version:'001-main-extension' };
  } finally { await connection.query("SELECT RELEASE_LOCK('hkuplan_schema_migration')"); }
}
async function main() {
  const connection = await mysql.createConnection(readDbConfig(true));
  try { console.log(JSON.stringify(await migrate(connection))); }
  finally { await connection.end(); }
}
if (require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports = { migrate, main };
