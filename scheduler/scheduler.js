export const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
export const fmtMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const datesOverlap = (a, b) =>
  (!a.startDate || !b.startDate) ? true : !(a.endDate < b.startDate || b.endDate < a.startDate);

export function meetingsOverlap(a, b) {
  return a.day === b.day && a.start < b.end && b.start < a.end && datesOverlap(a, b);
}
export function sectionsConflict(s1, s2) {
  return s1.meetings.some(a => s2.meetings.some(b => meetingsOverlap(a, b)));
}
export function hitsBlocked(section, blocked = []) {
  return blocked.filter(b => section.meetings.some(m => meetingsOverlap(m, b)));
}
const key = (s) => `${s.courseCode}-${s.id}`;

export function detectConflicts(sections, blocked = []) {
  const out = [];
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++)
      if (sectionsConflict(sections[i], sections[j])) out.push({ a: key(sections[i]), b: key(sections[j]) });
    for (const b of hitsBlocked(sections[i], blocked)) out.push({ a: key(sections[i]), blocked: b.label ?? '自定义时段' });
  }
  return out;
}

export const DEFAULT_WEIGHTS = { morning: 3, freeDay: 4, avoidDay: 8, lunch: 2, gapHour: 1, lateEvening: 2, softBlocked: 5 };

export function scoreSchedule(sections, prefs = {}) {
  const w = { ...DEFAULT_WEIGHTS, ...(prefs.weights || {}) };
  const byDay = {}; const breakdown = [];
  const add = (pts, why) => { if (pts) breakdown.push({ pts: Math.round(pts * 10) / 10, why }); };
  for (const s of sections) for (const m of s.meetings) (byDay[m.day] ??= []).push(m);
  for (let d = 1; d <= 7; d++) {
    const ms = (byDay[d] || []).slice().sort((a, b) => a.start - b.start);
    if (!ms.length) { if (d <= 5 && prefs.preferFreeDays) add(w.freeDay, `周${d}全天无课`); continue; }
    if (prefs.avoidDays?.includes(d)) add(-w.avoidDay, `周${d}有课（希望避开）`);
    if (prefs.noMorningBefore != null && ms[0].start < prefs.noMorningBefore) add(-w.morning, `周${d} ${fmtMin(ms[0].start)} 早课`);
    if (prefs.noEveningAfter != null && ms.at(-1).end > prefs.noEveningAfter) add(-w.lateEvening, `周${d}晚课到 ${fmtMin(ms.at(-1).end)}`);
    if (prefs.minimizeGaps) {
      let gap = 0, end = ms[0].end;
      for (const m of ms.slice(1)) { const g = m.start - end; if (g > 10) gap += g; end = Math.max(end, m.end); } // HKU :50 下课，10 分钟换教室不算空堂
      if (gap) add(-w.gapHour * gap / 60, `周${d}空堂 ${Math.round(gap)} 分钟`);
    }
    if (prefs.lunchBreak) {
      const L0 = prefs.lunchBreak.from ?? 720, L1 = prefs.lunchBreak.to ?? 840, need = prefs.lunchBreak.minutes ?? 60;
      const iv = ms.filter(m => m.start < L1 && m.end > L0).map(m => [Math.max(m.start, L0), Math.min(m.end, L1)]);
      let free = 0, cur = L0; for (const [a, b] of iv) { free = Math.max(free, a - cur); cur = Math.max(cur, b); }
      free = Math.max(free, L1 - cur);
      if (free < need) add(-w.lunch, `周${d}午饭时间只有 ${free} 分钟`);
    }
  }
  const soft = (prefs.blocked || []).filter(b => b.hard === false);
  for (const s of sections) for (const b of hitsBlocked(s, soft))
    add(-w.softBlocked, `${s.courseCode} ${s.id} 占用「${b.label ?? '自定义时段'}」`);
  return { score: Math.round(breakdown.reduce((t, x) => t + x.pts, 0) * 10) / 10, breakdown };
}

function sectionSoftScore(s, soft, prefs = {}) {
  let sc = 0;
  for (const m of s.meetings) {
    if (prefs.noMorningBefore != null && m.start < prefs.noMorningBefore) sc -= DEFAULT_WEIGHTS.morning;
    if (prefs.noEveningAfter != null && m.end > prefs.noEveningAfter) sc -= DEFAULT_WEIGHTS.lateEvening;
    if (prefs.avoidDays?.includes(m.day)) sc -= DEFAULT_WEIGHTS.avoidDay;
  }
  sc -= hitsBlocked(s, soft).length * DEFAULT_WEIGHTS.softBlocked;
  return sc;
}

function buildOptions(courses, opts) {
  const hard = opts.blocked.filter(b => b.hard !== false);
  const soft = opts.blocked.filter(b => b.hard === false);
  const groups = [], skipped = [];
  for (const c of courses) {
    if (!c.sections?.length) { skipped.push({ course: c.code, reason: '该学期没有开课数据' }); continue; }
    const lock = opts.locked?.[c.code];
    const reasons = { blocked: 0, locked: 0, excluded: 0 };
    let pool = c.sections;
    const total = c.sections.length;
    if (lock) { pool = pool.filter(s => s.id === lock); reasons.locked = total - pool.length; }
    if (pool.length) { const n = pool.length; pool = pool.filter(s => !opts.excluded?.includes(`${c.code}-${s.id}`)); reasons.excluded = n - pool.length; }
    if (pool.length) { const n = pool.length; pool = pool.filter(s => !hitsBlocked(s, hard).length); reasons.blocked = n - pool.length; }

    const map = new Map();
    for (const raw of pool) {
      const s = { ...raw, courseCode: c.code, courseTitle: c.title, credits: c.credits ?? 6, creditsKnown: c.credits != null, alternatives: [] };
      const k = s.meetings.map(m => `${m.day}-${m.start}-${m.end}-${m.startDate ?? ''}-${m.endDate ?? ''}`).sort().join('|');
      const ex = map.get(k);
      if (!ex) map.set(k, s); else ex.alternatives.push(s.id);
    }
    const options = [...map.values()];
    for (const s of options) s._soft = sectionSoftScore(s, soft, opts.prefs);
    options.sort((a, b) => b._soft - a._soft || String(a.id).localeCompare(String(b.id)));  // 软分高者先被枚举
    groups.push({ course: c.code, options, reasons, total });
  }
  return { groups, skipped };
}

function explainDead(g) {
  const r = g.reasons, parts = [];
  if (r.blocked) parts.push(`${r.blocked} 个落在你屏蔽的时段`);
  if (r.locked) parts.push(`${r.locked} 个因锁定其他 sub-class 被排除`);
  if (r.excluded) parts.push(`${r.excluded} 个被你手动排除`);
  return `${g.course} 共 ${g.total} 个 sub-class 全部不可用${parts.length ? '：' + parts.join('，') : ''}`;
}

export function generateSchedules(courses, options = {}) {
  const opts = { blocked: [], locked: {}, excluded: [], prefs: {}, maxResults: 100, maxNodes: 500000, maxCredits: 36, ...options };
  if (!opts.term) throw new Error('必须指定 term');
  const prefs = { ...opts.prefs, blocked: opts.blocked };
  const { groups, skipped } = buildOptions(courses, opts);
  const totalCredits = courses.filter(c => c.sections?.length).reduce((t, c) => t + (c.credits ?? 6), 0);
  const base = { term: opts.term, skipped, totalCredits, warnings: [] };
  if (opts.maxCredits && totalCredits > opts.maxCredits)
    base.warnings.push(`总学分 ${totalCredits} 超过上限 ${opts.maxCredits}`);

  const dead = groups.filter(g => !g.options.length);
  if (dead.length) return { ...base, schedules: [], total: 0, truncated: false,
    diagnosis: dead.map(g => ({ course: g.course, message: explainDead(g) })) };
  if (!groups.length) return { ...base, schedules: [], total: 0, truncated: false,
    diagnosis: [{ message: '所选课程在该学期均无开课数据' }] };

  const all = groups.flatMap(g => g.options); all.forEach((s, i) => (s._i = i));
  const conflict = all.map(a => all.map(b => a !== b && key(a) !== key(b) && sectionsConflict(a, b)));
  groups.sort((a, b) => a.options.length - b.options.length);   // MRV：候选最少的课程先定

  const found = [], chosen = []; let nodes = 0, truncated = false;
  const limit = opts.maxResults * 5;
  (function dfs(i) {
    if (truncated) return;
    if (++nodes > opts.maxNodes) { truncated = true; return; }
    if (i === groups.length) {
      const sections = chosen.map(({ _i, _soft, ...s }) => s);
      found.push({ id: scheduleId(sections), sections, credits: totalCredits, ...scoreSchedule(sections, prefs) });
      if (found.length >= limit) truncated = true;
      return;
    }
    for (const opt of groups[i].options) {
      if (chosen.some(c => conflict[c._i][opt._i])) continue;   // 冲突剪枝
      chosen.push(opt); dfs(i + 1); chosen.pop();
    }
  })(0);

  found.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const res = { ...base, schedules: found.slice(0, opts.maxResults), total: found.length, truncated };
  if (!found.length && !opts._noDiagnose) res.diagnosis = findConflictPairs(courses, opts);
  return res;
}

export function scheduleId(sections) {
  return sections.map(s => `${s.courseCode}:${s.id}`).sort().join(',');
}

export function findConflictPairs(courses, options) {
  const out = [];
  const usable = courses.filter(c => c.sections?.length);
  for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) {
    const r = generateSchedules([usable[i], usable[j]], { ...options, maxResults: 1, prefs: {}, _noDiagnose: true });
    if (r.total === 0) out.push({ courses: [usable[i].code, usable[j].code], message: `${usable[i].code} 与 ${usable[j].code} 的所有组合都时间冲突` });
  }
  if (out.length) return out;
  return [{ message: usable.length <= 1
    ? '该课程的全部 sub-class 与屏蔽时段冲突'
    : '任意两门课都能排开，但三门及以上组合后没有可行方案，请尝试移除一门课或放宽屏蔽时段' }];
}
