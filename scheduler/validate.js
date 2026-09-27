// 输入数据校验：后端收到数据/从数据库拼好数据后先调用，失败返回 400
const TYPES = ['CLASS', 'LEC', 'TUT', 'LAB', 'SEM', 'OTH'];   // HKU 课表不区分课型，统一为 CLASS

export function validateCourses(courses, term) {
  const errors = [];
  if (!Array.isArray(courses)) return ['courses 必须是数组'];
  courses.forEach((c, ci) => {
    const p = `courses[${ci}](${c?.code ?? '?'})`;
    if (!c?.code) errors.push(`${p}: 缺少 code`);
    if (typeof c?.credits !== 'number') errors.push(`${p}: credits 必须是数字`);
    const off = (c?.offerings || []).find(o => o.term === term);
    if (!off) { errors.push(`${p}: 在学期 ${term} 没有开课`); return; }
    const ids = new Set(off.sections.map(s => s.id));
    off.sections.forEach((s, si) => {
      const sp = `${p}.sections[${si}](${s.id})`;
      if (!TYPES.includes(s.type)) errors.push(`${sp}: type 必须是 ${TYPES.join('/')}`);
      if (s.parent && !ids.has(s.parent)) errors.push(`${sp}: parent ${s.parent} 不存在`);
      (s.meetings || []).forEach((m, mi) => {
        const mp = `${sp}.meetings[${mi}]`;
        if (!(m.day >= 1 && m.day <= 7)) errors.push(`${mp}: day 必须是 1-7`);
        if (!(m.start >= 0 && m.end <= 1440 && m.start < m.end)) errors.push(`${mp}: start/end 非法`);
      });
    });
  });
  return errors;
}
