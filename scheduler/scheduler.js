// Shared public interface: teammate v3 flat Course.sections is preferred; v2 offerings remain accepted.
import { normalizeCourses, normalizeOptions } from './l0_axioms/normalize.js';
import { generateSchedules as enumerate } from './l2_workflows/generate.js';
export function generateSchedules(courses, options = {}) {
  return enumerate(normalizeCourses(courses, options.term), normalizeOptions(options));
}
export { toMin, fmtMin, meetingsOverlap } from './l0_axioms/time.js';
export { scheduleId, seatStatus } from './l0_axioms/identity.js';
export { sectionsConflict, hitsBlocked, detectConflicts } from './l1_building_blocks/conflicts.js';
export { DEFAULT_WEIGHTS, scoreSchedule } from './l1_building_blocks/score.js';
export { validateCourses } from './validate.js';
export { toFullCalendarEvents, toPrintRows, toCSV, toICS } from './export.js';
