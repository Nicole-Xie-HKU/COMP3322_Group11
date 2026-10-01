const fs = require('node:fs');
const path = require('node:path');
const { getPool } = require('./db');
const importData = require('./importCourses');

async function setup() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  for (const statement of schema.split(';')) {
    if (statement.trim()) await getPool().query(statement);
  }
  await importData();
}

setup().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => getPool().end());
