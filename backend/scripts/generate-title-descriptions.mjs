// Fill courses that have no official description with a one-line summary built only from
// catalogue fields (title, department). Nothing about content is inferred or invented.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const catalogue = JSON.parse(await readFile(join(root, 'Database', 'HKU_timetable_2026-2027.json'), 'utf8'));
const snapshotFile = join(root, 'backend', 'data', 'course-descriptions.json');
const snapshot = JSON.parse(await readFile(snapshotFile, 'utf8'));

const courses = new Map();
for (const row of catalogue) {
  const code = row['COURSE CODE'];
  if (!code || courses.has(code)) continue;
  courses.set(code, { title: row.COURSE_TITLE ?? null, dept: row.OFFER_DEPT ?? null, career: row.ACAD_CAREER ?? null });
}

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const sentence = ({ title, dept }) => {
  const name = clean(title);
  const parts = [];
  if (name) parts.push(/[.!?]$/.test(name) ? name : `${name}.`);
  if (clean(dept)) parts.push(`Offered by ${clean(dept)}.`);
  return parts.join(' ');
};

let generated = 0;
for (const [code, course] of courses) {
  if (snapshot[code]) continue;
  const description = sentence(course);
  if (!description) continue;
  snapshot[code] = { title: clean(course.title) || null, description, descriptionKind: 'title',
    prerequisites: null, assessment: null, credits: null, source: null };
  generated += 1;
}

const sorted = Object.fromEntries(Object.keys(snapshot).sort().map(code => [code, snapshot[code]]));
await writeFile(snapshotFile, `${JSON.stringify(sorted, null, 2)}\n`);
const kinds = {};
for (const entry of Object.values(sorted)) kinds[entry.descriptionKind] = (kinds[entry.descriptionKind] ?? 0) + 1;
console.log(JSON.stringify({ catalogue: courses.size, generated, total: Object.keys(sorted).length, kinds }, null, 2));
