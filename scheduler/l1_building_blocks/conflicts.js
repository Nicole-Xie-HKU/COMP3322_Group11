import { meetingsOverlap } from '../l0_axioms/time.js';
import { sectionKey } from '../l0_axioms/identity.js';
export const sectionsConflict = (a, b) => a.meetings.some(x => b.meetings.some(y => meetingsOverlap(x, y)));
export const hitsBlocked = (section, blocked = []) => blocked.filter(b => section.meetings.some(m => meetingsOverlap(m, b)));
export function detectConflicts(sections, blocked = []) {
  const conflicts = [];
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      if (sectionsConflict(sections[i], sections[j])) conflicts.push({ a: sectionKey(sections[i]), b: sectionKey(sections[j]) });
    }
    for (const block of hitsBlocked(sections[i], blocked)) {
      conflicts.push({ a: sectionKey(sections[i]), blocked: block.label ?? 'Blocked time', hard: block.hard !== false });
    }
  }
  return conflicts;
}
