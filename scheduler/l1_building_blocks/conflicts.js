import { meetingsOverlap } from '../l0_axioms/time.js';
import { sectionKey } from '../l0_axioms/identity.js';
import { asBlock } from '../l0_axioms/blocks.js';
export const sectionsConflict = (a, b) => a.meetings.some(x => b.meetings.some(y => meetingsOverlap(x, y)));
export const blockHitsMeeting = (meeting, block) => {
  const value = asBlock(block);
  return Boolean(value) && meetingsOverlap(meeting, value);
};
// Hard or soft events that share a weekday, clock time and, when dated, a date.
export const hitsBlocked = (section, blocked = []) => {
  const hits = [];
  for (const value of blocked) {
    const block = asBlock(value);
    if (block && (section.meetings ?? []).some(meeting => meetingsOverlap(meeting, block))) hits.push(block);
  }
  return hits;
};
export function detectConflicts(sections, blocked = []) {
  const conflicts = [];
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      if (sectionsConflict(sections[i], sections[j])) conflicts.push({ a: sectionKey(sections[i]), b: sectionKey(sections[j]) });
    }
    for (const block of hitsBlocked(sections[i], blocked)) {
      conflicts.push({ a: sectionKey(sections[i]), blocked: block.label || 'Personal event', hard: block.hard !== false,
        ...(block.date ? { date: block.date } : {}) });
    }
  }
  return conflicts;
}
