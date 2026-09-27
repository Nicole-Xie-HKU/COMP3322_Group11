// 集成测试：真实 MySQL 数据 → 数据访问层 → 排课算法 → 导出
// 前提：已执行 schema.sql 和 importTimetable.js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const repo = require('./courseRepository.js');
const { getPool } = require('./db.js');
const { generateSchedules, toMin } = await import('../scheduler/scheduler.js');
const { validateCourses } = await import('../scheduler/validate.js');
const { toFullCalendarEvents, toICS } = await import('../scheduler/export.js');

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('✓', name); };

await t('学期列表', async () => {
  const terms = await repo.getTerms();
  assert.deepEqual(terms.map(x => x.id), ['2026-27-S1', '2026-27-S2', '2026-27-SU']);
  console.log('  ', terms.map(x => `${x.name}: ${x.startDate} ~ ${x.endDate}`).join(' | '));
});

await t('搜索课程（代码 / 名称）', async () => {
  const a = await repo.searchCourses('2026-27-S1', 'comp33');
  assert.ok(a.some(c => c.code === 'COMP3322'));
  const b = await repo.searchCourses('2026-27-S1', 'operating systems');
  assert.ok(b.some(c => c.code === 'COMP3230'));
});

await t('COMP3322 真实数据 → 算法格式（阅读周前后两段已合并）', async () => {
  const { courses } = await repo.getCoursesForScheduling('2026-27-S1', ['comp3322']);
  const s = courses[0].offerings[0].sections[0];
  assert.equal(s.id, '1A');
  assert.deepEqual(s.meetings.map(m => [m.day, m.start, m.end, m.startDate, m.endDate]), [
    [2, toMin('12:00'), toMin('13:50'), '2026-09-01', '2026-11-24'],
    [5, toMin('12:00'), toMin('12:50'), '2026-09-04', '2026-11-27']]);
});

await t('全库数据格式校验（3 个学期所有课程）', async () => {
  for (const term of ['2026-27-S1', '2026-27-S2', '2026-27-SU']) {
    const [rows] = await getPool().query('SELECT DISTINCT course_code FROM sections WHERE term_id=?', [term]);
    const { courses } = await repo.getCoursesForScheduling(term, rows.map(r => r.course_code));
    const errs = validateCourses(courses, term);
    assert.deepEqual(errs.slice(0, 5), [], term);
    console.log(`   ${term}: ${courses.length} 门课校验通过`);
  }
});

await t('真实排课：COMP3322 + COMP3230 + MATH1013（第一学期）', async () => {
  const { courses } = await repo.getCoursesForScheduling('2026-27-S1', ['COMP3322', 'COMP3230', 'MATH1013']);
  const r = generateSchedules(courses, { term: '2026-27-S1', prefs: { noMorningBefore: toMin('10:00'), minimizeGaps: true } });
  assert.ok(r.total > 0);
  console.log(`   ${r.total} 个方案；最佳：${r.schedules[0].id}；扣分：${r.schedules[0].breakdown.map(b => b.why).join('、') || '无'}`);
  const ev = toFullCalendarEvents(r.schedules[0], { startDate: '2026-09-01', endDate: '2026-12-31' });
  assert.ok(ev.length > 0);
  assert.ok(toICS(r.schedules[0], { startDate: '2026-09-01', endDate: '2026-12-31' }).includes('BEGIN:VEVENT'));
});

await t('冲突诊断：COMP3322 与同时段课程', async () => {
  const { courses } = await repo.getCoursesForScheduling('2026-27-S1', ['COMP3322', 'COMP3230']);
  const r = generateSchedules(courses, { term: '2026-27-S1', blocked: [{ day: 1, start: 0, end: 1440, label: '周一' }] });
  // COMP3230 两个 section 都有周一课 → 应无解并给出原因
  assert.equal(r.total, 0); console.log('   诊断:', r.diagnosis[0].message);
});

await t('课程不存在 / 不在该学期', async () => {
  const { notFound } = await repo.getCoursesForScheduling('2026-27-S1', ['ABCD1234', 'COMP3322']);
  assert.deepEqual(notFound, ['ABCD1234']);
  const { courses } = await repo.getCoursesForScheduling('2026-27-SU', ['COMP3322']);
  const r = generateSchedules(courses, { term: '2026-27-SU' });
  assert.equal(r.skipped[0].course, 'COMP3322');
});

await t('性能：6 门 section 最多的第二学期课程', async () => {
  const [rows] = await getPool().query(`SELECT course_code, COUNT(*) n FROM sections WHERE term_id='2026-27-S2'
      GROUP BY course_code ORDER BY n DESC LIMIT 6`);
  const t0 = Date.now();
  const { courses } = await repo.getCoursesForScheduling('2026-27-S2', rows.map(r => r.course_code));
  const t1 = Date.now();
  const r = generateSchedules(courses, { term: '2026-27-S2' });
  console.log(`   ${rows.map(r => r.course_code + '×' + r.n).join(' ')}\n   查库 ${t1 - t0}ms，算法 ${Date.now() - t1}ms，方案 ${r.total}${r.truncated ? '+(截断)' : ''}`);
  assert.ok(Date.now() - t0 < 5000);
});

await getPool().end();
console.log(`\n集成测试 ${n} 项全部通过`);
