const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
process.chdir(require('node:path').resolve(__dirname,'../..'));
const root = randomBytes(32).toString('hex');
const source = fs.readFileSync('.env.example','utf8')
  .replace('replace-with-random-32-or-more-characters',randomBytes(32).toString('hex'))
  .replace('replace-with-random-password',randomBytes(32).toString('hex'))
  .replace('replace-with-different-random-password',root)
  .replace('replace-with-same-value-as-MYSQL_ROOT_PASSWORD',root);
fs.writeFileSync('.env',source,{ flag:'wx',mode:0o600 });
console.log('Created ignored .env; existing files are never overwritten.');
