import test from 'node:test';
import assert from 'node:assert/strict';
import { detectConflicts } from '../scheduler/scheduler.js';

const base = process.env.TEST_URL || 'http://127.0.0.1:3001';
const term = '2026-27 Sem 1';
const params = new URLSearchParams({ term });
async function generate(body) {
  return fetch(`${base}/api/schedules/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

test('production frontend and database health are reachable', async () => {
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /HKUPlan/);
});

test('terms, browse list, course search and class details come from MySQL', async () => {
  const terms = await (await fetch(`${base}/api/terms`)).json();
  assert.ok(terms.some(item => item.id === term && item.startDate));
  const browse = await (await fetch(`${base}/api/courses?${params}`)).json();
  assert.equal(browse.length, 30);
  const search = await (await fetch(`${base}/api/courses?${params}&q=COMP3322`)).json();
  assert.equal(search[0].code, 'COMP3322');
  const course = await (await fetch(`${base}/api/courses/COMP3322?${params}`)).json();
  assert.equal(course.sections.length, 1);
  assert.equal(course.sections[0].id, '1A');
  assert.equal(course.sections[0].meetings.length, 2);
});

test('real HKU courses generate eight conflict-free schedules', async () => {
  const response = await generate({ term, courseCodes: ['COMP3322', 'COMP3230', 'MATH1013'] });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.schedules.length, 8);
  for (const schedule of result.schedules) assert.deepEqual(detectConflicts(schedule.sections), []);
});

test('incompatible locked classes produce a clear empty result', async () => {
  const response = await generate({ term, courseCodes: ['COMP3230', 'MATH1013'], locked: { COMP3230: '1A', MATH1013: '1B' } });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.schedules.length, 0);
  assert.ok(result.diagnosis.length);
});

test('pinning reduces results and every returned schedule keeps that section', async () => {
  const body = { term, courseCodes: ['COMP3322', 'COMP3230', 'MATH1013'] };
  const all = await (await generate(body)).json();
  const pinned = await (await generate({ ...body, locked: { COMP3230: '1A' } })).json();
  assert.ok(pinned.schedules.length > 0 && pinned.schedules.length < all.schedules.length);
  assert.ok(pinned.schedules.every(schedule => schedule.sections.find(section => section.courseCode === 'COMP3230').id === '1A'));
  const unpinned = await (await generate(body)).json();
  assert.equal(unpinned.schedules.length, all.schedules.length);
});

test('invalid inputs return 400 and unavailable courses return 404', async () => {
  for (const body of [{ term, courseCodes: [] }, { term, courseCodes: ['COMP3322'], maxResults: -1 },
    { term, courseCodes: ['COMP3322'], blocked: null }]) {
    assert.equal((await generate(body)).status, 400);
  }
  assert.equal((await generate({ term: 'not-a-term', courseCodes: ['COMP3322'] })).status, 404);
  assert.equal((await fetch(`${base}/api/courses/MISSING?${params}`)).status, 404);
  assert.equal((await fetch(`${base}/api/does-not-exist`)).status, 404);
});
