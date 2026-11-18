// Merge externally collected descriptions (SIS export, Moodle copy, hand-written CSV) into the snapshot.
// Usage: node backend/scripts/merge-descriptions.mjs <file.csv|file.json> [--force]
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const snapshot = join(root, 'backend', 'data', 'course-descriptions.json');
const catalogue = join(root, 'Database', 'HKU_timetable_2026-2027.json');
const force = process.argv.includes('--force');
const input = process.argv.slice(2).find(argument => !argument.startsWith('--'));

if (!input) {
  console.error('Usage: node backend/scripts/merge-descriptions.mjs <file.csv|file.json> [--force]');
  process.exit(1);
}

/** Minimal quoted-CSV reader: handles "" escapes, embedded commas and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (character !== '\r') field += character;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(entry => entry.some(cell => cell.trim()));
}

const codes = new Set(JSON.parse(await readFile(catalogue, 'utf8')).map(row => row['COURSE CODE']).filter(Boolean));
const existing = JSON.parse(await readFile(snapshot, 'utf8').catch(() => '{}'));
const raw = await readFile(input, 'utf8');
const records = [];

if (input.toLowerCase().endsWith('.json')) {
  const parsed = JSON.parse(raw);
  for (const [code, value] of Object.entries(parsed)) {
    records.push({ code, ...(typeof value === 'string' ? { description: value } : value) });
  }
} else {
  const rows = parseCsv(raw.replace(/^\ufeff/, ''));
  const header = rows.shift().map(cell => cell.trim().toLowerCase());
  const pick = (cells, names) => names.map(name => cells[header.indexOf(name)]).find(value => value && value.trim()) ?? '';
  for (const cells of rows) {
    records.push({
      code: pick(cells, ['course_code', 'course code', 'code', 'course']).trim().toUpperCase(),
      description: pick(cells, ['description', 'course description', 'calendar entry']).trim(),
      title: pick(cells, ['title', 'course title']).trim(),
      prerequisites: pick(cells, ['prerequisites', 'prerequisite', 'pre-requisite(s)', 'pre-requisites']).trim(),
      assessment: pick(cells, ['assessment']).trim(),
      source: pick(cells, ['source', 'url']).trim(),
    });
  }
}

const added = [], updated = [], skipped = [], unknown = [];
for (const record of records) {
  const code = String(record.code ?? '').trim().toUpperCase();
  if (!code) continue;
  if (!codes.has(code)) { unknown.push(code); continue; }
  const description = String(record.description ?? '').trim();
  if (!description) { skipped.push(code); continue; }
  if (existing[code] && !force) { skipped.push(code); continue; }
  const wasThere = Boolean(existing[code]);
  existing[code] = {
    title: record.title || existing[code]?.title || null,
    description,
    descriptionKind: record.descriptionKind || existing[code]?.descriptionKind || 'calendar',
    prerequisites: record.prerequisites || existing[code]?.prerequisites || null,
    assessment: record.assessment || existing[code]?.assessment || null,
    credits: record.credits ?? existing[code]?.credits ?? null,
    source: record.source || existing[code]?.source || null,
  };
  (wasThere ? updated : added).push(code);
}

const sorted = Object.fromEntries(Object.keys(existing).sort().map(code => [code, existing[code]]));
await writeFile(snapshot, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(JSON.stringify({ input, added: added.length, updated: updated.length,
  skippedExisting: skipped.length, unknownCodes: unknown.length,
  unknownSample: unknown.slice(0, 10), total: Object.keys(sorted).length }, null, 2));
