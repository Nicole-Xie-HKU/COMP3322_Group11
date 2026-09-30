
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function toMinutes(t) {
  if (t == null) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(t).trim());
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
function dayNum(d) {
  const i = DAYS.indexOf(String(d || '').toUpperCase());
  return i < 0 ? null : i + 1;
}

function toAlgorithmFormat(courseRows, sectionRows, meetingRows, instructorRows) {
  const mtgBy = new Map(), instBy = new Map();
  for (const m of meetingRows || []) (mtgBy.get(m.class_number) ?? mtgBy.set(m.class_number, []).get(m.class_number)).push(m);
  for (const i of instructorRows || []) (instBy.get(i.class_number) ?? instBy.set(i.class_number, []).get(i.class_number)).push(i.instructor_name);

  return courseRows.map(c => ({
    code: c.course_code,
    title: c.course_title,
    credits: c.credits ?? 6,
    creditsKnown: c.credits != null,
    sections: sectionRows.filter(s => s.course_code === c.course_code).map(s => ({
      id: s.class_section,
      classNumber: s.class_number,
      instructor: (instBy.get(s.class_number) || []).join('; ') || null,
      meetings: (mtgBy.get(s.class_number) || []).flatMap(m => {
        const day = dayNum(m.day), st = toMinutes(m.start_time), en = toMinutes(m.end_time);
        if (day == null || st == null || en == null || en <= st) return [];   // TBA / 脏数据
        return [{ day, start: st, end: en, venue: m.venue ?? null, startDate: m.start_date ?? null, endDate: m.end_date ?? null }];
      }),
    })),
  }));
}

module.exports = { toAlgorithmFormat, toMinutes, dayNum };
