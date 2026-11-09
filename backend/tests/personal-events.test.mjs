import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createRequire } from 'node:module';
import { generateSchedules, detectConflicts, toFullCalendarEvents, blockHitsMeeting, normalizeBlocks } from '../../scheduler/scheduler.js';
import { fakeDatabase } from './fakeDatabase.mjs';
import { term, course, section, meeting } from './fixtures.mjs';
const require = createRequire(import.meta.url);
const { createApp } = require('../app');
const { readConfig } = require('../src/l1_building_blocks/config');

const single = [course('COMP3322', [section('1A', [meeting(1, 600, 650)]), section('1B', [meeting(3, 840, 890)])])];
const weekly = (extra = {}) => ({ day: 1, start: 570, end: 700, label: 'Work shift', ...extra });
const ids = result => result.schedules.map(s => s.id).sort();

test('weekly personal events hide overlapping sections and report the impact per course', () => {
  const all = generateSchedules(single, { term });
  assert.equal(all.total, 2);
  assert.deepEqual(all.eventImpact, []);
  const result = generateSchedules(single, { term, blocked: [weekly()] });
  assert.equal(result.total, 1);
  assert.deepEqual(ids(result), ['COMP3322:1B']);
  assert.deepEqual(result.eventImpact, [{ course: 'COMP3322', removed: [
    { key: 'COMP3322:1A', type: 'CLASS', labels: ['Work shift Mon 09:30-11:40'] }] }]);
  assert.ok(result.warnings.some(line => line.includes('hidden by your personal events')));
});

test('one-off events only remove sections whose teaching dates include that weekday', () => {
  assert.deepEqual(ids(generateSchedules(single, { term, blocked: [{ date: '2026-09-07', start: 570, end: 700 }] })), ['COMP3322:1B']);
  // 2026-09-02 is a Wednesday: the Monday class still meets, so nothing is removed.
  assert.equal(generateSchedules(single, { term, blocked: [{ date: '2026-09-02', start: 570, end: 700 }] }).total, 2);
  // A weekly rule limited to a summer window never meets the September class.
  assert.equal(generateSchedules(single, { term, blocked: [weekly({ startDate: '2026-06-01', endDate: '2026-08-31' })] }).total, 2);
  assert.equal(generateSchedules(single, { term, blocked: [weekly({ startDate: '2026-10-01', endDate: '2026-10-31' })] }).total, 1);
  assert.equal(blockHitsMeeting(meeting(1, 600, 650), { day: 1, start: 600, end: 650, startDate: '2026-09-01', endDate: '2026-09-04' }), false);
});

test('soft personal events rank lower without hiding a section', () => {
  const result = generateSchedules(single, { term, prefs: { minimizeGaps: true }, blocked: [weekly({ hard: false })] });
  assert.equal(result.total, 2);
  const penalised = result.schedules.find(s => s.sections[0].id === '1A');
  assert.ok(penalised.breakdown.some(item => item.why.includes('Work shift')));
  assert.ok(result.schedules.at(-1).sections[0].id === '1A');
});

test('invalid personal events are reported instead of silently applied', () => {
  const result = generateSchedules(single, { term, blocked: [{ day: 1, start: 700, end: 600 }, { date: '2026-02-30', start: 100, end: 200 }, weekly()] });
  assert.equal(result.total, 1);
  assert.ok(result.warnings.some(line => line.includes('Ignored 2 invalid personal event(s)')));
  const parsed = normalizeBlocks([{ date: '2026-09-07', start: 570, end: 700 }, { day: 3, start: 600, end: 650 }]);
  assert.deepEqual(parsed.blocks.map(block => block.day), [1, 3]);
  assert.deepEqual(parsed.errors, []);
});

test('date-aware conflicts explain which event blocks which section', () => {
  const sections = single[0].sections.map(section => ({ ...section, courseCode: 'COMP3322' }));
  const conflicts = detectConflicts(sections, [{ date: '2026-09-07', start: 590, end: 660, label: 'Call' }]);
  assert.deepEqual(conflicts, [{ a: 'COMP3322:1A', blocked: 'Call', hard: true, date: '2026-09-07' }]);
  assert.deepEqual(detectConflicts(sections, [{ day: 1, start: 590, end: 660, label: 'Call', hard: false }])[0].hard, false);
});

test('dated events render only inside their own range on the weekly grid', () => {
  const schedule = { sections: [{ ...section('1A', [meeting(1, 600, 650)]), courseCode: 'COMP3322' }] };
  const events = toFullCalendarEvents(schedule, {}, [{ date: '2026-10-07', start: 900, end: 1000, label: 'Trip' }, weekly()]);
  const dated = events.find(event => event.title === 'Trip'), repeating = events.find(event => event.title === 'Work shift');
  assert.equal(dated.startRecur, '2026-10-07'); assert.equal(dated.endRecur, '2026-10-08'); assert.deepEqual(dated.daysOfWeek, [3]);
  assert.equal(repeating.startRecur, undefined);
  assert.equal(toFullCalendarEvents(schedule, {}, [{ day: 1 }]).length, 1);
});

test('generation, conflicts and saves accept dated personal events over HTTP', async t => {
  const db = fakeDatabase();
  const app = await createApp({ db, config: { ...readConfig({ CURSOR_SECRET: 'e'.repeat(40) }), generationRateLimit: 100 }, logger: { info() {}, error() {} } });
  t.after(() => app.locals.close());
  const generated = (await request(app).post('/api/schedules/generate')
    .send({ term, courseCodes: ['COMP3322'], blocked: [{ day: 1, start: 570, end: 700, label: 'Work shift' }] }).expect(200)).body;
  assert.equal(generated.schedules.length, 1);
  assert.equal(generated.eventImpact[0].removed[0].key, 'COMP3322:1A');
  for (const blocked of [[{ day: 1, date: '2026-09-07', start: 570, end: 700 }], [{ day: 1, start: 700, end: 600 }],
    [{ date: '2026-09-07', startDate: '2026-09-07', endDate: '2026-09-08', start: 570, end: 700 }]]) {
    await request(app).post('/api/schedules/generate').send({ term, courseCodes: ['COMP3322'], blocked }).expect(400);
  }
  const conflict = (await request(app).post('/api/schedules/conflicts')
    .send({ term, sectionKeys: ['COMP3322:1A'], blocked: [{ date: '2026-09-07', start: 570, end: 700, label: 'Dentist' }] }).expect(200)).body;
  assert.equal(conflict.conflicts[0].blocked, 'Dentist');

  const agent = request.agent(app);
  await agent.post('/api/guest-session').send({}).expect(201);
  const saved = (await agent.post('/api/schedules')
    .send({ term, name: 'Dentist week', sectionKeys: ['COMP3322:1B'], blocked: [{ date: '2026-09-07', start: 570, end: 700, label: 'Dentist' }] }).expect(201)).body;
  assert.equal(saved.blocked[0].date, '2026-09-07');
  assert.equal((await agent.get(`/api/schedules/${saved.id}`).expect(200)).body.blocked[0].label, 'Dentist');
  const clash = (await agent.post('/api/schedules')
    .send({ term, name: 'Clash', sectionKeys: ['COMP3322:1A'], blocked: [{ date: '2026-09-07', start: 570, end: 700 }] }).expect(400)).body;
  assert.equal(clash.error.code, 'SCHEDULE_CONFLICT');
});
