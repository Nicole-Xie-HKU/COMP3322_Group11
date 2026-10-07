import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Node can exit successfully for an unmatched test glob. Required suites must fail closed.
const directories = process.argv.slice(2);
if (!directories.length) throw new Error('Provide at least one required test directory');
const files = directories.flatMap(directory => {
  const matches = readdirSync(directory).filter(name => name.endsWith('.test.mjs')).sort();
  if (!matches.length) throw new Error(`No tests found in required suite: ${directory}`);
  return matches.map(name => resolve(directory, name));
});
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
