const mysql = require('mysql2/promise');
const fs = require('node:fs');
const path = require('node:path');
const envFile = path.join(__dirname, '../.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'hkuplanner',
  dateStrings: true,
};
let pool;
const getPool = () => (pool ??= mysql.createPool({ ...dbConfig, connectionLimit: 10 }));
module.exports = { dbConfig, getPool };
