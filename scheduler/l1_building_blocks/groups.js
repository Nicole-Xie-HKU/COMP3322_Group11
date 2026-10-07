import { seatStatus } from '../l0_axioms/identity.js';
import { hitsBlocked, sectionsConflict } from './conflicts.js';
import { hasUnknownMeetings, hasImpossibleMeetingDates } from '../l0_axioms/completeness.js';
export function buildGroups(courses, term, options) {
  const groups = [], skipped = [], invalidSections = [], unknownSections = [], invalidDateSections = [];
  for (const course of [...courses].sort((a, b) => a.code.localeCompare(b.code))) {
    const offering = course.offerings.find(o => o.term === term);
    if (!offering?.sections.length) { skipped.push({ course: course.code, reason: 'Not offered in this term' }); continue; }
    const types = new Map();
    for (const section of offering.sections) {
      if (!types.has(section.type)) types.set(section.type, []);
      types.get(section.type).push(section);
    }
    for (const [type, sections] of types) {
      const lock = options.locked?.[course.code]?.[type];
      const candidates = sections.filter(s => {
        if (lock && s.id !== lock) return false;
        if (options.excluded.includes(`${course.code}:${s.id}`) || options.excluded.includes(`${course.code}-${s.id}`)) return false;
        if (hasImpossibleMeetingDates(s)) {
          invalidDateSections.push(`${course.code}:${s.id}`);
          return false;
        }
        if (!options.includeUnknownTimes && hasUnknownMeetings(s)) {
          unknownSections.push(`${course.code}:${s.id}`);
          return false;
        }
        const seat = seatStatus(s);
        if (options.seatPolicy === 'openOnly' && seat !== 'open') return false;
        if (options.seatPolicy === 'allowWaitlist' && seat === 'full') return false;
        if (hitsBlocked(s, options.blocked.filter(b => b.hard !== false)).length) return false;
        // Internally conflicting imported meetings cannot form a valid section.
        const overlaps = s.meetings.some((a, i) => sectionsConflict({ meetings: [a] }, { meetings: s.meetings.slice(i + 1) }));
        if (overlaps) invalidSections.push(`${course.code}:${s.id}`);
        return !overlaps;
      }).sort((a, b) => a.id.localeCompare(b.id)).map(s => ({ ...s,
        courseCode: course.code, courseTitle: course.title, credits: course.credits ?? null,
        creditsKnown: course.credits != null, seat: seatStatus(s), alternatives: [],
      }));
      // Keep same-time sections distinct: they can have different parents or instructors.
      groups.push({ course: course.code, type, options: candidates, hasParent: sections.some(s => s.parent) });
    }
  }
  groups.sort((a, b) => Number(a.hasParent) - Number(b.hasParent) || a.options.length - b.options.length ||
    a.course.localeCompare(b.course) || a.type.localeCompare(b.type));
  return { groups, skipped, invalidSections, unknownSections, invalidDateSections };
}
