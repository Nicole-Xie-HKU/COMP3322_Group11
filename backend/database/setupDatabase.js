const mysql = require('mysql2/promise');
const { readDbConfig } = require('./db');
const { migrate } = require('./migrate');
const { main: importTimetable } = require('./importTimetable');
async function main() {
  const config=readDbConfig(true), connection=await mysql.createConnection(config);
  try {
    console.log(JSON.stringify(await migrate(connection)));
    const user=process.env.DB_USER;
    if (!user || user==='root') throw new Error('DB_USER must be a dedicated non-root runtime account');
    await connection.query(`REVOKE ALL PRIVILEGES ON ${mysql.escapeId(config.database)}.* FROM ${mysql.escape(user)}@'%'`);
    await connection.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ${mysql.escapeId(config.database)}.* TO ${mysql.escape(user)}@'%'`);
  } finally { await connection.end(); }
  await importTimetable();
}
if (require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={ main };
