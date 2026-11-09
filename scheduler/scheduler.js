// Shared public interface: teammate v3 flat Course.sections is preferred; v2 offerings remain accepted.
import { normalizeCourses, normalizeOptions } from './l0_axioms/normalize.js';
import { generateSchedules as enumerate } from './l2_workflows/generate.js';
export function generateSchedules(courses, options = {}) {
  return enumerate(normalizeCourses(courses, options.term), normalizeOptions(options));
}
export { toMin, fmtMin, meetingsOverlap, isDate } from './l0_axioms/time.js';
export { scheduleId, seatStatus } from './l0_axioms/identity.js';
export { normalizeBlocks, normalizeBlock, describeBlock, weekdayOf } from './l0_axioms/blocks.js';
export { sectionsConflict, hitsBlocked, blockHitsMeeting, detectConflicts } from './l1_building_blocks/conflicts.js';
export { DEFAULT_WEIGHTS, scoreSchedule } from './l1_building_blocks/score.js';
export { sectionTags, scheduleTags } from './l1_building_blocks/tags.js';
export { validateCourses } from './validate.js';
export { hasUnknownMeetings, hasImpossibleMeetingDates, meetingCompleteness } from './l0_axioms/completeness.js';
export { toFullCalendarEvents, toPrintRows, toCSV, toICS, buildICS, calendarFileName } from './export.js';
