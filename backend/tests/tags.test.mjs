import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionTags, scheduleTags } from '../../scheduler/scheduler.js';
import { section, meeting } from './fixtures.mjs';
const ids = tags => tags.map(tag => tag.id);
const labels = tags => tags.map(tag => tag.label);
const tones = new Set(['warn', 'info', 'muted', 'good']);

test('section tags describe timetable shape, data trust and seat state', () => {
  assert.ok(ids(sectionTags(section('1A', [meeting(1, 480, 530)]))).includes('early'));
  assert.ok(ids(sectionTags(section('1B', [meeting(2, 1140, 1200)]))).includes('late'));
  assert.ok(labels(sectionTags(section('1C', [meeting(6, 600, 650)]))).some(label => label.startsWith('Weekend')));
  assert.ok(ids(sectionTags(section('1D', [meeting(1, 540, 720)]))).includes('long'));
  assert.ok(labels(sectionTags(section('1E', [meeting(1, 600, 650, { venue: 'A' }), meeting(3, 600, 650, { venue: 'B' })])))
    .some(label => label.includes('2 venues')));
  assert.ok(labels(sectionTags(section('1F', [meeting(1, 600, 650, { startDate: '2026-09-01', endDate: '2026-10-06' }),
    meeting(1, 600, 650, { startDate: '2026-10-20', endDate: '2026-11-30' })]))).some(label => label.includes('2 ranges')));
  assert.ok(ids(sectionTags(section('1G', []))).includes('tba'));
  assert.ok(labels(sectionTags(section('1H', [meeting(1, 600, 650)], { seatsLeft: 0, waitlist: { open: true } }))).includes('Waitlist'));
  assert.ok(labels(sectionTags(section('1I', [meeting(1, 600, 650)], { seatsLeft: null }))).includes('Seats unknown'));
  assert.ok(labels(sectionTags(section('1J', [meeting(1, 600, 650)], { seatsLeft: 0, waitlist: { open: false } }))).includes('Full'));
  assert.deepEqual(sectionTags(null), []);
  assert.deepEqual(sectionTags(section('1K', [])).map(tag => tag.tone).filter(tone => !tones.has(tone)), []);
});

test('schedule tags summarise days, gaps, contact hours and event collisions', () => {
  const first = { ...section('1A', [meeting(1, 600, 650)]), courseCode: 'COMP3322' };
  const second = { ...section('1B', [meeting(3, 660, 710)]), courseCode: 'COMP3230' };
  const tags = scheduleTags({ sections: [first, second] });
  assert.ok(labels(tags).includes('2 class days'));
  assert.ok(tags.some(tag => tag.id === 'hours' && tag.label === '1.7h contact'));
  assert.ok(labels(tags).includes('No gaps'));
  assert.ok(labels(tags).includes('Seats unknown'));
  const gapped = scheduleTags({ sections: [{ ...section('1C', [meeting(1, 600, 650), meeting(1, 710, 760)]), courseCode: 'X' }] });
  assert.ok(labels(gapped).includes('1h free between classes'));
  const collided = scheduleTags({ sections: [first] }, { blocked: [{ day: 1, start: 600, end: 650, label: 'Work' }] });
  assert.ok(labels(collided).includes('1 event collision'));
  assert.ok(labels(scheduleTags({ sections: [{ ...section('1D', []), courseCode: 'X' }] })).includes('Partial TBA'));
  assert.deepEqual(scheduleTags({ sections: [] }), []);
});

test('tags are deterministic and free of duplicated identifiers', () => {
  const schedule = { sections: [{ ...section('1A', [meeting(1, 600, 650), meeting(1, 600, 650, { venue: 'B' })]), courseCode: 'COMP3322' }] };
  const once = sectionTags(schedule.sections[0]), twice = sectionTags(schedule.sections[0]);
  assert.deepEqual(once, twice);
  assert.equal(new Set(once.map(tag => tag.id)).size, once.length);
  assert.deepEqual(scheduleTags(schedule), scheduleTags(schedule));
});

test('split teaching ranges report one weekly slot, not one per date range', () => {
  const split = section('1A', [
    meeting(2, 720, 830, { startDate: '2026-09-01', endDate: '2026-10-06' }),
    meeting(2, 720, 830, { startDate: '2026-10-20', endDate: '2026-11-24' }),
    meeting(5, 720, 770, { startDate: '2026-09-04', endDate: '2026-10-09' }),
    meeting(5, 720, 770, { startDate: '2026-10-23', endDate: '2026-11-27' }),
  ]);
  assert.equal(sectionTags(split).find(tag => tag.id === 'hours').label, '2.7h/week');
  const schedule = { sections: [{ ...split, courseCode: 'COMP3322' }] };
  assert.equal(scheduleTags(schedule).find(tag => tag.id === 'hours').label, '2.7h contact');
  assert.equal(scheduleTags(schedule).find(tag => tag.id === 'days').label, '2 class days');
});
