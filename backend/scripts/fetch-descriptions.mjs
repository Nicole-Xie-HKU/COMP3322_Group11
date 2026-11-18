// Dev-time helper: copy public course descriptions from the HKU CS course pages.
// Run with `node backend/scripts/fetch-descriptions.mjs`; output is not served from the internet at runtime.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const sourceFile = join(root, 'Database', 'HKU_timetable_2026-2027.json');
const outputFile = join(root, 'backend', 'data', 'course-descriptions.json');
const YEAR = process.argv.includes('--year') ? process.argv[process.argv.indexOf('--year') + 1] : '2026';
const force = process.argv.includes('--force');
const DELAY_MS = 250;

const decode = text => text
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&#8217;/g, "'").replace(/&ndash;/g, '-')
  .replace(/&mdash;/g, '-');

const text = html => decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();

function pickTitle(html, code) {
  const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map(match => text(match[1]));
  const own = titles.find(title => title.toUpperCase().startsWith(code));
  return own ? own.replace(new RegExp(`^${code}\\s*`), '') : null;
}

// Some courses ship an empty calendar entry; their syllabus then only lists topic groups.
function topicList(html) {
  const start = html.search(/Detailed Description:\s*<\/u>/i);
  if (start < 0) return '';
  const section = html.slice(start, start + 20000);
  const items = [...section.matchAll(/<td valign="top">([\s\S]*?)<\/td>/gi)]
    .map(match => text(match[1]))
    .filter(value => value && !/^\d+$/.test(value));
  return [...new Set(items)].join('; ').slice(0, 600);
}

function parse(html, code) {
  const calendar = html.match(/Calendar Entry:\s*<\/u>\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>/i);
  const prerequisite = html.match(/Pre-requisite\(s\):<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  const credits = html.match(/No\. of credit\(s\):<\/td>\s*<td[^>]*>\s*([0-9.]+)/i);
  const assessment = html.match(/Assessment:\s*<\/u>\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>/i);
  const entry = calendar ? text(calendar[1]) : '';
  const topics = entry ? '' : topicList(html);
  if (!entry && !topics) return null;
  return {
    title: pickTitle(html, code),
    description: entry || topics,
    descriptionKind: entry ? 'calendar' : 'topics',
    prerequisites: prerequisite ? text(prerequisite[1]) || null : null,
    assessment: assessment ? text(assessment[1]) || null : null,
    credits: credits ? Number(credits[1]) : null,
    source: `https://www.cs.hku.hk/index.php/programmes/course-offered?infile=${YEAR}/${code.toLowerCase()}.html`,
  };
}

async function fetchPage(code) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(`https://www.cs.hku.hk/index.php/programmes/course-offered?infile=${YEAR}/${code.toLowerCase()}.html`,
        { headers: { 'User-Agent': 'hkuplan-course-project/1.0' } });
      if (!response.ok) return { error: `HTTP ${response.status}` };
      return { html: await response.text() };
    } catch (error) {
      if (attempt === 2) return { error: error.message };
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return { error: 'unreachable' };
}

const rows = JSON.parse(await readFile(sourceFile, 'utf8'));
const codes = [...new Set(rows.map(row => row['COURSE CODE']).filter(Boolean))].filter(code => code.startsWith('COMP')).sort();
const existing = !force && existsSync(outputFile) ? JSON.parse(await readFile(outputFile, 'utf8')) : {};
const result = { ...existing };
const failures = [];
let fetched = 0, skipped = 0;

for (const code of codes) {
  if (result[code] && !force) { skipped += 1; continue; }
  const page = await fetchPage(code);
  if (page.error) { failures.push(`${code}: ${page.error}`); continue; }
  const parsed = parse(page.html, code);
  if (!parsed) { failures.push(`${code}: no calendar entry`); continue; }
  result[code] = parsed;
  fetched += 1;
  if (fetched % 10 === 0) console.log(`  fetched ${fetched}/${codes.length}`);
  await new Promise(resolve => setTimeout(resolve, DELAY_MS));
}

await mkdir(dirname(outputFile), { recursive: true });
const sorted = Object.fromEntries(Object.keys(result).sort().map(code => [code, result[code]]));
await writeFile(outputFile, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(JSON.stringify({ year: YEAR, wanted: codes.length, fetched, skipped, stored: Object.keys(sorted).length, failures: failures.slice(0, 10) }));
