// Preserved from teammate scheduler-v3, commit 34e23a0. Ranking is within a returned page, not a global optimum.
import { fmtMin } from '../l0_axioms/time.js';
import { hitsBlocked } from './conflicts.js';
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

