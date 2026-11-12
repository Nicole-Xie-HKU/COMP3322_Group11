const fs = require('node:fs');
const { randomBytes } = require('node:crypto');

function createSecret(file, supplied) {
  if (supplied?.startsWith('replace-with-')) throw new Error('Replace placeholder credentials before starting Docker.');
  if (fs.existsSync(file)) {
    if (supplied && fs.readFileSync(file, 'utf8') !== supplied) {
      throw new Error('Existing Docker secrets do not match .env. Keep the credentials used by this installation.');
    }
    return;
  }
  fs.writeFileSync(file, supplied || randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o444 });
}

createSecret('/run/runtime-secrets/db_password', process.env.DB_PASSWORD);
createSecret('/run/runtime-secrets/cursor_secret', process.env.CURSOR_SECRET);
createSecret('/run/admin-secrets/mysql_root_password', process.env.MYSQL_ROOT_PASSWORD);
console.log('Docker secrets ready.');
