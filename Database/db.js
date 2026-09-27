// 数据库连接配置：从环境变量读取（不要把真实密码提交到 GitHub）
const mysql = require('mysql2/promise');
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'hkuplanner',
  dateStrings: true,                 // DATE 列返回 'YYYY-MM-DD' 字符串，避免时区问题
};
let pool;
const getPool = () => (pool ??= mysql.createPool({ ...dbConfig, connectionLimit: 10 }));
module.exports = { dbConfig, getPool };
