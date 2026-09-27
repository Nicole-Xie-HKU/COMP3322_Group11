/**
 * HKUPlan 排课核心算法 —— 纯函数、无依赖，前端和后端都能 import
 * 时间约定：day 1=周一 … 7=周日；start/end 为当天 0 点起的分钟数（09:30 → 570），区间左闭右开
 */
export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fmtMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/* ---------------- 1. 冲突检测 ---------------- */
function datesOverlap(a, b) {
  if (!a.startDate || !b.startDate) return true;           // 未标注日期 = 整个学期
  return !(a.endDate < b.startDate || b.endDate < a.startDate);
}
export function meetingsOverlap(a, b) {
  return a.day === b.day && a.start < b.end && b.start < a.end && datesOverlap(a, b);
}
export function sectionsConflict(s1, s2) {
  return s1.meetings.some(a => s2.meetings.some(b => meetingsOverlap(a, b)));
}
/** 与用户自定义的“不想上课时段”是否重叠 */
export function hitsBlocked(section, blocked = []) {
  return blocked.filter(b => section.meetings.some(m => meetingsOverlap(m, b)));
}
/** 前端实时检测：给定当前手动选中的 sections，返回所有冲突对（用于标红） */
export function detectConflicts(sections, blocked = []) {
  const out = [];
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++)
      if (sectionsConflict(sections[i], sections[j])) out.push({ a: key(sections[i]), b: key(sections[j]) });
    for (const b of hitsBlocked(sections[i], blocked)) out.push({ a: key(sections[i]), blocked: b.label ?? '自定义时段' });
  }
  return out;
}
const key = s => `${s.courseCode}-${s.id}`;

/* ---------------- 2. 名额状态 ---------------- */
// 返回 'open' | 'waitlist' | 'full'
export function seatStatus(s) {
  if (s.seatsLeft == null || s.seatsLeft > 0) return 'open';
  return s.waitlist?.open ? 'waitlist' : 'full';
}

/* ---------------- 3. 构建待选组 ---------------- */
function buildGroups(courses, term, opts) {
  const groups = []; const skipped = [];
  for (const c of courses) {
    const off = c.offerings.find(o => o.term === term);
    if (!off) { skipped.push({ course: c.code, reason: `该学期不开课` }); continue; }
    const byType = {};
    for (const s of off.sections) (byType[s.type] ??= []).push(s);
    for (const [type, secs] of Object.entries(byType)) {
      const lock = opts.locked?.[c.code]?.[type];
      const reasons = { full: 0, blocked: 0, excluded: 0, locked: 0 };
      const map = new Map();
      for (const raw of secs) {
        const st = seatStatus(raw);
        if (lock && raw.id !== lock) { reasons.locked++; continue; }
        if (opts.excluded?.includes(`${c.code}-${raw.id}`)) { reasons.excluded++; continue; }
        if (st === 'full' && opts.seatPolicy !== 'ignore') { reasons.full++; continue; }
        if (st === 'waitlist' && opts.seatPolicy === 'openOnly') { reasons.full++; continue; }
        const hardHits = hitsBlocked(raw, opts.blocked.filter(b => b.hard !== false));
        if (hardHits.length) { reasons.blocked++; continue; }
        const s = { ...raw, courseCode: c.code, courseTitle: c.title, credits: c.credits, seat: st, alternatives: [] };
        // 同课型 + 同时间 + 同 parent 的 section 合并成一个选项（大幅减少组合爆炸）
        const k = (s.parent ?? '') + '#' + s.meetings.map(m => `${m.day}-${m.start}-${m.end}-${m.startDate ?? ''}-${m.endDate ?? ''}`).sort().join('|');
        const ex = map.get(k);
        if (!ex) map.set(k, s);
        else if (s.seat === 'open' && ex.seat !== 'open') { s.alternatives = [...ex.alternatives, ex.id]; map.set(k, s); } // 有名额的做代表
        else ex.alternatives.push(s.id);
      }
      groups.push({ course: c.code, type, options: [...map.values()], hasParent: secs.some(s => s.parent), reasons, total: secs.length });
    }
  }
  return { groups, skipped };
}

/* ---------------- 4. 偏好打分（可解释） ---------------- */
export const DEFAULT_WEIGHTS = { morning: 3, freeDay: 4, avoidDay: 8, lunch: 2, gapHour: 1, lateEvening: 2, softBlocked: 5, waitlist: 6 };

export function scoreSchedule(sections, prefs = {}) {
  const w = { ...DEFAULT_WEIGHTS, ...prefs.weights };
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
      for (const m of ms.slice(1)) { const g = m.start - end; if (g > 10) gap += g; end = Math.max(end, m.end); }  // HKU 课一般 :50 下课，10 分钟换课不算空堂
      if (gap) add(-w.gapHour * gap / 60, `周${d}空堂 ${gap} 分钟`);  // 课间 10 分钟不计（见下方）
    }
    if (prefs.lunchBreak) {
      const L0 = prefs.lunchBreak.from ?? 720, L1 = prefs.lunchBreak.to ?? 840, need = prefs.lunchBreak.minutes ?? 60;
      const iv = ms.filter(m => m.start < L1 && m.end > L0).map(m => [Math.max(m.start, L0), Math.min(m.end, L1)]);
      let free = 0, cur = L0; for (const [a, b] of iv) { free = Math.max(free, a - cur); cur = Math.max(cur, b); }
      free = Math.max(free, L1 - cur);
      if (free < need) add(-w.lunch, `周${d}午饭时间只有 ${free} 分钟`);
    }
  }
  for (const s of sections) {
    if (s.seat === 'waitlist') add(-w.waitlist, `${s.courseCode} ${s.id} 需排候补`);
    for (const b of hitsBlocked(s, (prefs.blocked || []).filter(b => b.hard === false))) add(-w.softBlocked, `${s.courseCode} ${s.id} 占用「${b.label ?? '自定义时段'}」`);
  }
  return { score: Math.round(breakdown.reduce((t, x) => t + x.pts, 0) * 10) / 10, breakdown };
}

/* ---------------- 5. 主函数：回溯 + 剪枝 ---------------- */
/**
 * @param courses  用户选的课程（完整结构见 INTERFACE.md）
 * @param options  { term, blocked, locked, excluded, seatPolicy, maxCredits, prefs, maxResults, maxNodes }
 */
export function generateSchedules(courses, options = {}) {
  const opts = { blocked: [], seatPolicy: 'allowWaitlist', maxResults: 100, maxNodes: 500000, prefs: {}, ...options };
  if (!opts.term) throw new Error('必须指定 term');
  const prefs = { ...opts.prefs, blocked: opts.blocked };
  const { groups, skipped } = buildGroups(courses, opts.term, opts);
  const offered = courses.filter(c => c.offerings.some(o => o.term === opts.term));
  const totalCredits = offered.reduce((t, c) => t + (c.credits || 0), 0);
  const base = { term: opts.term, skipped, totalCredits, warnings: [] };
  if (opts.maxCredits && totalCredits > opts.maxCredits)
    base.warnings.push(`总学分 ${totalCredits} 超过上限 ${opts.maxCredits}`);

  const dead = groups.filter(g => g.options.length === 0);
  if (dead.length) return { ...base, schedules: [], total: 0, truncated: false,
    diagnosis: dead.map(g => ({ course: g.course, type: g.type, message: explainDead(g) })) };

  const all = groups.flatMap(g => g.options); all.forEach((s, i) => (s._i = i));
  const conflict = all.map(a => all.map(b => a !== b && a.courseCode + a.id !== b.courseCode + b.id && sectionsConflict(a, b)));
  // 先排无 parent 的组（保证 parent 先确定），再按选项数升序（MRV）
  groups.sort((a, b) => (a.hasParent - b.hasParent) || (a.options.length - b.options.length));

  const found = []; const chosen = []; let nodes = 0, truncated = false;
  const limit = opts.maxResults * 5;
  (function dfs(i) {
    if (truncated) return;
    if (++nodes > opts.maxNodes) { truncated = true; return; }
    if (i === groups.length) {
      const sections = chosen.map(({ _i, ...s }) => s);
      found.push({ id: scheduleId(sections), sections, credits: totalCredits, ...scoreSchedule(sections, prefs) });
      if (found.length >= limit) truncated = true;
      return;
    }
    for (const opt of groups[i].options) {
      if (opt.parent) {  // 导修/实验必须属于已选的那个 subclass
        const p = chosen.find(c => c.courseCode === opt.courseCode && (c.id === opt.parent || c.alternatives.includes(opt.parent)));
        if (!p) continue;
      }
      if (chosen.some(c => conflict[c._i][opt._i])) continue;
      chosen.push(opt); dfs(i + 1); chosen.pop();
    }
  })(0);

  found.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const res = { ...base, schedules: found.slice(0, opts.maxResults), total: found.length, truncated };
  if (!found.length && !opts._noDiagnose) res.diagnosis = findConflictPairs(courses, opts);
  return res;
}

function explainDead(g) {
  const r = g.reasons; const parts = [];
  if (r.full) parts.push(`${r.full} 个已满`);
  if (r.blocked) parts.push(`${r.blocked} 个落在你屏蔽的时段`);
  if (r.locked) parts.push(`${r.locked} 个因锁定其他 section 被排除`);
  if (r.excluded) parts.push(`${r.excluded} 个被你手动排除`);
  return `${g.course} ${g.type} 共 ${g.total} 个 section 都不可用：${parts.join('，')}`;
}

/** 稳定 ID：同一组 section 永远得到同一个 ID —— 用于保存/分享/去重 */
export function scheduleId(sections) {
  return sections.map(s => `${s.courseCode}:${s.id}`).sort().join(',');
}

/** 没有任何可行方案时，找出两两冲突的课程，给用户可操作的提示 */
export function findConflictPairs(courses, options) {
  const out = [];
  const offered = courses.filter(c => c.offerings.some(o => o.term === options.term));
  for (let i = 0; i < offered.length; i++) for (let j = i + 1; j < offered.length; j++) {
    const r = generateSchedules([offered[i], offered[j]], { ...options, maxResults: 1, prefs: {}, _noDiagnose: true });
    if (r.total === 0 && !r.diagnosis?.some(d => d.type)) out.push({ courses: [offered[i].code, offered[j].code], message: `${offered[i].code} 与 ${offered[j].code} 的所有组合都时间冲突` });
  }
  if (out.length) return out;
  return [{ message: offered.length <= 1 ? '该课程内部的讲座/导修/实验无法同时排开（或与屏蔽时段冲突）' : '任意两门课都能排开，但三门及以上组合后没有可行方案，请尝试移除一门课或放宽屏蔽时段' }];
}
