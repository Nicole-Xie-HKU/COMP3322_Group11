// Turn extracted syllabus text (one PDF per programme) into course entries.
// The PDF text extraction step is external; this parser only needs plain text.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [input, output] = process.argv.slice(2).filter(argument => !argument.startsWith('--'));
if (!input || !output) {
  console.error('Usage: node parse-syllabus-text.mjs <syllabus.txt> <out.json> [--source <url>]');
  process.exit(1);
}
const source = process.argv.includes('--source') ? process.argv[process.argv.indexOf('--source') + 1] : null;

const HEADER = /^([A-Z]{2,5}\d{4}[A-Z]?)\.\s+(.+?)\s*\((\d+)\s*credits?\)\s*$/;
const STOP = /^(Prerequisite|Co-requisite|Mutually exclusive|Assessment|Remarks|Course Learning Outcomes|Learning Outcomes)\b/i;

const text = await readFile(input, 'utf8');
const lines = text.split('\n').map(line => line.replace(/\s+/g, ' ').trim());
const entries = {};

for (let index = 0; index < lines.length; index += 1) {
  const header = lines[index].match(HEADER);
  if (!header) continue;
  const [, code, title, credits] = header;
  const body = [];
  let prerequisite = null, assessment = null;
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    if (!line) continue;
    if (HEADER.test(line)) break;
    if (/^Prerequisite/i.test(line)) { prerequisite = line.replace(/^Prerequisite(s)?\s*:\s*/i, '').trim(); continue; }
    if (/^Assessment/i.test(line)) { assessment = line.replace(/^Assessment\s*:\s*/i, '').trim(); continue; }
    if (STOP.test(line)) continue;
    if (/^Mutually exclusive/i.test(line)) continue;
    body.push(line);
  }
  const description = body.join(' ').replace(/\s+/g, ' ').trim();
  if (description.length < 40) continue;
  if (entries[code]) continue;
  entries[code] = { title: title.trim(), description, credits: Number(credits),
    prerequisites: prerequisite || null, assessment: assessment || null, source };
}

const sorted = Object.fromEntries(Object.keys(entries).sort().map(code => [code, entries[code]]));
await writeFile(output, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(JSON.stringify({ input, parsed: Object.keys(sorted).length, output }));
