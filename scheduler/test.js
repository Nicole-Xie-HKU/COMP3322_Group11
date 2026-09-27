import assert from 'node:assert/strict';
import { generateSchedules, detectConflicts, meetingsOverlap, toMin, scheduleId } from './scheduler.js';
import { toFullCalendarEvents, toCSV, toICS } from './export.js';
import { validateCourses } from './validate.js';
import { COURSES, TERMS } from './sample-data.js';

const pick = codes => COURSES.filter(c => codes.includes(c.code));
const ids = s => s.sections.map(x => `${x.courseCode}:${x.id}`).sort();
let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓', name); };

t('首尾相接不冲突', () => assert.equal(meetingsOverlap({ day: 1, start: 570, end: 620 }, { day: 1, start: 620, end: 700 }), false));
t('半学期课：日期不重叠 → 不冲突', () => assert.equal(meetingsOverlap(
  { day: 4, start: 570, end: 680, startDate: '2026-09-01', endDate: '2026-10-15' },
  { day: 4, start: 570, end: 680, startDate: '2026-10-19', endDate: '2026-11-30' }), false));
t('数据校验', () => {
  assert.deepEqual(validateCourses(COURSES.filter(c => c.offerings.some(o => o.term === '2026-27-S1')), '2026-27-S1'), []);
  assert.ok(validateCourses([{ code: 'X', credits: 6, offerings: [{ term: 'T', sections: [{ id: 'a', type: 'BAD', meetings: [{ day: 9, start: 5, end: 1 }] }] }] }], 'T').length >= 3);
});

t('基本生成 + subclass 绑定 + 名额过滤', () => {
  const r = generateSchedules(pick(['COMP3322', 'COMP3230', 'MATH3603']), { term: '2026-27-S1' });
  assert.ok(r.total > 0);
  for (const s of r.schedules) {
    const lab = s.sections.find(x => x.type === 'LAB');
    assert.equal(lab.parent, '1B');                                          // LAB 属于所选 LEC
    assert.ok(!s.sections.some(x => x.courseCode === 'COMP3230' && x.id === '1A')); // 已满且不开放候补 → 排除
  }
  console.log('   方案数', r.total, '最佳:', ids(r.schedules[0]).join(' '));
});

t('同时间 section 合并（MATH3603 1A/1C）', () => {
  const r = generateSchedules(pick(['MATH3603']), { term: '2026-27-S1' });
  assert.equal(r.total, 2);
  assert.ok(r.schedules.some(s => s.sections[0].alternatives.length === 1));
});

t('硬屏蔽时段：周二下午不排课', () => {
  const blocked = [{ day: 2, start: toMin('13:00'), end: toMin('18:00'), label: '周二兼职' }];
  const r = generateSchedules(pick(['COMP3322', 'MATH3603']), { term: '2026-27-S1', blocked });
  for (const s of r.schedules) assert.equal(detectConflicts(s.sections, blocked).length, 0);
  assert.ok(r.schedules.every(s => s.sections.find(x => x.courseCode === 'MATH3603').id === '1D'));
});

t('软屏蔽 + 偏好打分可解释', () => {
  const blocked = [{ day: 5, start: 0, end: 1440, label: '周五', hard: false }];
  const r = generateSchedules(pick(['COMP3322', 'COMP3230']), { term: '2026-27-S1', blocked,
    prefs: { noMorningBefore: toMin('10:00'), lunchBreak: { from: 720, to: 840, minutes: 60 }, minimizeGaps: true } });
  assert.ok(r.schedules[0].score >= r.schedules.at(-1).score);
  console.log('   最佳方案扣分明细:', r.schedules[0].breakdown.map(b => `${b.why}(${b.pts})`).join('；'));
});

t('名额策略 openOnly：排除候补 T2', () => {
  const r = generateSchedules(pick(['COMP3322']), { term: '2026-27-S1', seatPolicy: 'openOnly' });
  assert.ok(r.schedules.every(s => !s.sections.some(x => x.id === 'T2')));
});

t('锁定 section（用户固定某个 TUT）', () => {
  const r = generateSchedules(pick(['COMP3322', 'COMP3230']), { term: '2026-27-S1', locked: { COMP3322: { TUT: 'T3' } } });
  assert.ok(r.total > 0 && r.schedules.every(s => s.sections.some(x => x.id === 'T3')));
});

t('按学期过滤 + 学分统计 + 学分上限', () => {
  const r = generateSchedules(pick(['COMP3322', 'ECON1210']), { term: '2026-27-SU', maxCredits: 3 });
  assert.equal(r.total, 1); assert.equal(r.totalCredits, 6);
  assert.deepEqual(r.skipped.map(s => s.course), ['COMP3322']);
  assert.equal(r.warnings.length, 1);
});

t('无解时给出诊断', () => {
  const blocked = [{ day: 1, start: 0, end: 1440, label: '周一' }];
  const r = generateSchedules(pick(['COMP3322']), { term: '2026-27-S1', blocked });
  assert.equal(r.total, 0); console.log('   诊断:', r.diagnosis[0].message);
  const clash = [...pick(['COMP3322']), { code: 'X', credits: 6, offerings: [{ term: '2026-27-S1', sections: [{ id: 'A', type: 'LEC', meetings: [{ day: 4, start: 600, end: 660 }] }] }] }];
  const r2 = generateSchedules(clash, { term: '2026-27-S1' });
  console.log('   诊断:', r2.diagnosis[0].message);
  assert.deepEqual(r2.diagnosis[0].courses, ['COMP3322', 'X']);
});

t('导出 FullCalendar / CSV / ICS', () => {
  const r = generateSchedules(pick(['COMP3230', 'CCST9001']), { term: '2026-27-S1' });
  const term = TERMS[0];
  const ev = toFullCalendarEvents(r.schedules[0], term, [{ day: 5, start: 0, end: 600, label: '睡觉' }]);
  assert.ok(ev.some(e => e.display === 'background'));
  assert.equal(ev.find(e => e.title.startsWith('CCST')).startRecur, '2026-10-19');
  assert.ok(toCSV(r.schedules[0]).includes('COMP3230'));
  const ics = toICS(r.schedules[0], term);
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY;BYDAY=WE') && ics.includes('DTSTART;TZID=Asia/Hong_Kong:20260902T143000'));
});

t('半学期课与全学期课同时段 → 冲突', () => {
  assert.equal(generateSchedules(pick(['COMP3322', 'CCST9001']), { term: '2026-27-S1' }).total, 0);
});

t('稳定 ID', () => assert.equal(scheduleId([{ courseCode: 'B', id: '1' }, { courseCode: 'A', id: '2' }]), 'A:2,B:1'));

t('压力测试：8 门课 × (1 LEC + 各 6 个 TUT/LAB)', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const slot = () => { const d = 1 + Math.floor(rnd() * 5), h = 9 + Math.floor(rnd() * 9); return { day: d, start: h * 60 + 30, end: h * 60 + 80 }; };
  const big = Array.from({ length: 8 }, (_, i) => ({ code: 'C' + i, credits: 6, offerings: [{ term: 'T', sections: [
    ...['1A', '1B'].map(id => ({ id, type: 'LEC', seatsLeft: 10, meetings: [slot(), slot()] })),
    ...Array.from({ length: 12 }, (_, k) => ({ id: 'X' + k, type: k % 2 ? 'TUT' : 'LAB', parent: k < 6 ? '1A' : '1B', seatsLeft: 5, meetings: [slot()] })),
  ]}]}));
  const t0 = Date.now(); const r = generateSchedules(big, { term: 'T', prefs: { minimizeGaps: true } });
  const ms = Date.now() - t0; console.log(`   找到 ${r.total}（截断=${r.truncated}），用时 ${ms}ms`);
  assert.ok(ms < 3000);
});
console.log(`\n全部 ${n} 项测试通过`);
