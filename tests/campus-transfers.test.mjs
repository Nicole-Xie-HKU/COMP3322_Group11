import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeeklyTransfers, findCampusRoute } from '../frontend/src/campus/public.js';

const range = { startDate: '2026-09-07', endDate: '2026-09-13' };
const term = { startDate: '2026-09-01', endDate: '2026-11-30' };
const section = (code, venue, start, end, extra = {}) => ({ courseCode: code, id: '1A', tba: [],
  meetings: [{ day: 1, start, end, venue, ...term, ...extra }] });
const scheduleOf = (...sections) => ({ sections });

test('warnings use strictly greater-than, including zero and equal gaps', async () => {
  const minutes = (await findCampusRoute('KKLG106', 'MB217')).minutes;
  for (const gap of [0, minutes - 1, minutes, minutes + 1]) {
    const result = await getWeeklyTransfers(scheduleOf(section('A', 'KKLG106', 600, 650),
      section('B', 'MB217', 650 + gap, 710 + gap)), range, term);
    assert.equal(result.transfers.length, 1); assert.equal(result.transfers[0].tight, minutes > gap);
  }
});

test('same normalized room is omitted and aliases still share the same building', async () => {
  let result = await getWeeklyTransfers(scheduleOf(section('A', 'KK-LG106', 600, 650),
    section('B', 'kklg106', 660, 710)), range, term);
  assert.equal(result.transfers.length, 0);
  result = await getWeeklyTransfers(scheduleOf(section('A', 'KK101', 600, 650),
    section('B', 'KKLG106', 660, 710)), range, term);
  assert.equal(result.transfers[0].route.status, 'same-building'); assert.equal(result.transfers[0].route.minutes, 3);
});

test('an unknown intervening venue is retained and never bridged over', async () => {
  const result = await getWeeklyTransfers(scheduleOf(section('A', 'MB217', 600, 650),
    section('B', '', 660, 710), section('C', 'KB223', 720, 770)), range, term);
  assert.equal(result.transfers.length, 2);
  for (const transfer of result.transfers) { assert.equal(transfer.route.status, 'unavailable'); assert.equal(transfer.tight, false); }
  assert.ok(!result.transfers.some(t => t.fromCourse === 'A' && t.toCourse === 'C'));
});

test('disjoint teaching dates and reading-week gaps do not create phantom transfers', async () => {
  const first = section('A', 'MB217', 600, 650, { endDate: '2026-09-30' });
  const later = section('B', 'KB223', 660, 710, { startDate: '2026-11-01' });
  assert.equal((await getWeeklyTransfers(scheduleOf(first, later), range, term)).transfers.length, 0);
  const split = section('A', 'MB217', 600, 650, { endDate: '2026-09-06' });
  split.meetings.push({ ...split.meetings[0], startDate: '2026-09-14', endDate: term.endDate });
  assert.equal((await getWeeklyTransfers(scheduleOf(split, section('B', 'KB223', 660, 710)), range, term)).transfers.length, 0);
});

test('inclusive dates, weekend meetings, duplicate occurrences and term fallback align with the calendar', async () => {
  const a = section('A', 'MB217', 600, 650, { day: 7, startDate: '2026-09-13', endDate: '2026-09-13' });
  a.meetings.push({ ...a.meetings[0] });
  const b = section('B', 'KB223', 660, 710, { day: 7, startDate: null, endDate: null });
  const result = await getWeeklyTransfers(scheduleOf(a, b), range, term);
  assert.equal(result.transfers.length, 1); assert.equal(result.transfers[0].date, '2026-09-13');
  const next = { startDate: '2026-09-14', endDate: '2026-09-20' };
  assert.equal((await getWeeklyTransfers(scheduleOf(a, b), next, term)).transfers.length, 0);
});

test('overlapping or nested meetings suppress ambiguous transfers without skipping past them', async () => {
  const result = await getWeeklyTransfers(scheduleOf(section('A', 'MB217', 600, 800),
    section('B', 'KB223', 620, 650), section('C', 'MWT1', 660, 710), section('D', 'KK101', 810, 860)), range, term);
  assert.equal(result.transfers.length, 0);
});

test('unknown dates or unknown-time classes cannot yield false adjacency', async () => {
  const a = section('A', 'MB217', 600, 650), b = section('B', 'KB223', 660, 710);
  b.tba = [{}];
  assert.match((await getWeeklyTransfers(scheduleOf(a, b), range, term)).notice, /unknown/);
  b.tba = []; b.meetings[0].startDate = '2026-02-30';
  assert.equal((await getWeeklyTransfers(scheduleOf(a, b), range, term)).transfers.length, 0);
  assert.equal((await getWeeklyTransfers(scheduleOf(a), null, term)).transfers.length, 0);
});
