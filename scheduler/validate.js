export function validateCourses(courses) {
  const errors = [];
  if (!Array.isArray(courses)) return ['courses 必须是数组'];
  courses.forEach((c, ci) => {
    const p = `courses[${ci}](${c?.code ?? '?'})`;
    if (!c?.code) errors.push(`${p}: 缺少 code`);
    if (!Array.isArray(c?.sections)) { errors.push(`${p}: 缺少 sections 数组`); return; }
    c.sections.forEach((s, si) => {
      const sp = `${p}.sections[${si}](${s?.id ?? '?'})`;
      if (s?.id == null) errors.push(`${sp}: 缺少 id`);
      (s?.meetings || []).forEach((m, mi) => {
        const mp = `${sp}.meetings[${mi}]`;
        if (!(m.day >= 1 && m.day <= 7)) errors.push(`${mp}: day 必须是 1-7`);
        if (!(m.start >= 0 && m.end <= 1440 && m.start < m.end)) errors.push(`${mp}: start/end 非法`);
        if (m.startDate && m.endDate && m.startDate > m.endDate) errors.push(`${mp}: 日期范围非法`);
      });
    });
  });
  return errors;
}
