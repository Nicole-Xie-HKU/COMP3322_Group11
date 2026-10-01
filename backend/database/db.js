const mysql = require('mysql2/promise');
const path = require('node:path');
try { process.loadEnvFile(path.join(__dirname,'../../.env')); } catch (error) { if (error.code!=='ENOENT') throw error; }
function readDbConfig(admin = false) {
  const user = admin ? process.env.DB_ADMIN_USER : process.env.DB_USER;
  const password = admin ? process.env.DB_ADMIN_PASSWORD : process.env.DB_PASSWORD;
  if (!user || !password || password.startsWith('replace-with-')) throw new Error('Set database credentials in the ignored .env file');
  if (!admin && user === 'root') throw new Error('Use a non-root runtime database account');
  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid DB_PORT');
  return { host: process.env.DB_HOST || '127.0.0.1', port, user, password,
    database: process.env.DB_NAME || 'hkuplanner', dateStrings: true, decimalNumbers: true,
    charset: 'utf8mb4', timezone: 'Z', connectTimeout: 10000, multipleStatements: false };
}
let pool;
function getPool() { return pool ??= mysql.createPool({ ...readDbConfig(), connectionLimit: 10, queueLimit: 50 }); }
module.exports = { readDbConfig, getPool, get dbConfig() { return readDbConfig(); } };
