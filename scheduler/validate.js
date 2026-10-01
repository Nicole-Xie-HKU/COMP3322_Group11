import { normalizeCourses } from './l0_axioms/normalize.js';
import { isDate } from './l0_axioms/time.js';
const TYPES = new Set(['CLASS', 'LEC', 'TUT', 'LAB', 'SEM', 'OTH']);
export function validateCourses(courses, term = "__flat__") {
  courses = normalizeCourses(courses, term);
  const errors = [];
  if (!Array.isArray(courses)) return ['courses must be an array'];
  for (const course of courses) {
    if (!course?.code) { errors.push('Missing course code'); continue; }
    if (course.credits != null && (!Number.isFinite(course.credits) || course.credits < 0)) errors.push(`${course.code}: invalid credits`);
    const offering = course.offerings?.find(o => o.term === term);
    if (!offering?.sections?.length) { errors.push(`${course.code}: no sections in requested term`); continue; }
    const ids = new Set();
    for (const section of offering.sections) {
      const prefix = `${course.code}:${section.id}`;
      if (!section.id || ids.has(section.id)) errors.push(`${prefix}: duplicate or missing section id`);
      ids.add(section.id);
      if (!TYPES.has(section.type)) errors.push(`${prefix}: unsupported section type`);
      if (section.parent && !offering.sections.some(s => s.type === 'LEC' && s.id === section.parent && !s.parent)) errors.push(`${prefix}: invalid lecture parent`);
      if (!Array.isArray(section.meetings)) { errors.push(`${prefix}: missing meetings`); continue; }
      for (const meeting of section.meetings) {
        if (!Number.isInteger(meeting.day) || meeting.day < 1 || meeting.day > 7) errors.push(`${prefix}: invalid weekday`);
        if (!Number.isInteger(meeting.start) || !Number.isInteger(meeting.end) || meeting.start < 0 || meeting.end > 1440 || meeting.start >= meeting.end) errors.push(`${prefix}: invalid time`);
        const hasDate = meeting.startDate != null || meeting.endDate != null;
        if (hasDate && (!isDate(meeting.startDate) || !isDate(meeting.endDate) || meeting.startDate > meeting.endDate)) errors.push(`${prefix}: invalid date range`);
      }
    }
  }
  return errors;
}
