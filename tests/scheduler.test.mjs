import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateSchedules, meetingsOverlap, detectConflicts } from '../scheduler/scheduler.js';
import { toFullCalendarEvents } from '../scheduler/export.js';

const require = createRequire(import.meta.url);
const { toAlgorithmFormat } = require('../Database/courseMapper');
const meeting = (start, end, extra = {}) => ({ day: 1, start, end, ...extra });
const courses = [
  { code: 'A', credits: 6, creditsKnown: false, sections: [{ id: '1A', meetings: [meeting(540, 600)] }] },
  { code: 'B', credits: 6, creditsKnown: false, sections: [
    { id: '1A', meetings: [meeting(570, 630)] },
    { id: '1B', meetings: [meeting(600, 660)] },
  ] },
];

test('back-to-back classes and disjoint teaching dates do not conflict', () => {
  assert.equal(meetingsOverlap(meeting(540, 600), meeting(600, 660)), false);
  assert.equal(meetingsOverlap(meeting(540, 600, { startDate: '2026-09-01', endDate: '2026-09-30' }),
    meeting(540, 600, { startDate: '2026-10-01', endDate: '2026-10-31' })), false);
});

test('generation excludes overlaps and respects a locked class', () => {
  const result = generateSchedules(courses, { term: 'test' });
  assert.equal(result.schedules.length, 1);
  assert.deepEqual(detectConflicts(result.schedules[0].sections), []);
  assert.equal(result.schedules[0].sections.find(section => section.courseCode === 'B').id, '1B');
  const impossible = generateSchedules(courses, { term: 'test', locked: { B: '1A' } });
  assert.equal(impossible.schedules.length, 0);
  assert.ok(impossible.diagnosis.length);
});

test('estimated credits remain marked as unknown', () => {
  const result = generateSchedules(courses, { term: 'test' });
  assert.ok(result.schedules[0].sections.every(section => section.creditsKnown === false));
});

test('result limit reports omitted schedules', () => {
  const many = [{ code: 'A', sections: [0, 1, 2].map(i => ({ id: String(i), meetings: [meeting(600 + i * 60, 650 + i * 60)] })) }];
  const result = generateSchedules(many, { term: 'test', maxResults: 1 });
  assert.equal(result.schedules.length, 1);
  assert.equal(result.truncated, true);
});

test('calendar export includes the last teaching date and distinguishes date ranges', () => {
  const schedule = { sections: [{ courseCode: 'COMP3322', id: '1A', meetings: [
    meeting(720, 770, { startDate: '2026-09-01', endDate: '2026-09-30' }),
    meeting(720, 770, { startDate: '2026-10-01', endDate: '2026-11-27' }),
  ] }] };
  const events = toFullCalendarEvents(schedule);
  assert.equal(events[1].endRecur, '2026-11-28');
  assert.notEqual(events[0].id, events[1].id);
});

test('unknown class times remain visible as TBA metadata', () => {
  const mapped = toAlgorithmFormat([{ course_code: 'A' }], [{ course_code: 'A', class_number: 1, class_section: '1A' }],
    [{ class_number: 1, day: null, start_time: null, end_time: null }], []);
  assert.equal(mapped[0].sections[0].tba, true);
  assert.deepEqual(mapped[0].sections[0].meetings, []);
});
