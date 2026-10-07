const { ApiError } = require('../l0_axioms/errors');
const { fingerprint } = require('../l1_building_blocks/cursors');
function createCatalogScheduling(db, scheduler, worker, cursors, config) {
  async function load(term,codes) {
    const loaded = await db.getCoursesForScheduling(term,codes);
    if (loaded.notFound.length) throw new ApiError(404,'COURSE_NOT_FOUND','Some requested courses do not exist.', { courseCodes: loaded.notFound });
    if (loaded.notOffered.length) throw new ApiError(400,'COURSE_NOT_OFFERED','Some requested courses are not offered in this term.', { courseCodes: loaded.notOffered });
    if (scheduler.validateCourses(loaded.courses,term).length) throw new ApiError(500,'CATALOG_INVALID','Catalogue data needs correction before scheduling.');
    return loaded;
  }
  async function details(code,term) { return (await load(term,[code])).courses[0]; }
  async function resolveSelection(input, requireComplete = false) {
    const codes = [...new Set(input.sectionKeys.map(key => key.split(':')[0]))];
    if (codes.length > 12) throw new ApiError(400,'TOO_MANY_COURSES','Select at most 12 courses.');
    const loaded = await load(input.term,codes), selected = [];
    for (const key of input.sectionKeys) {
      const [code,id] = key.split(':'), course = loaded.courses.find(c => c.code === code);
      const section = course.sections.find(s => s.id === id);
      if (!section) throw new ApiError(400,'SECTION_NOT_FOUND','A selected section does not exist in this term.', { sectionKey: key });
      selected.push({ ...section, courseCode: code, courseTitle: course.title, credits: course.credits, seat: scheduler.seatStatus(section), alternatives: [] });
    }
    if (selected.some(scheduler.hasImpossibleMeetingDates)) {
      throw new ApiError(400,'INVALID_MEETING_DATES','A selected section has a weekday outside its teaching dates. The source dates need correction.');
    }
    if (requireComplete) {
      for (const course of loaded.courses) {
        const types = new Set(course.sections.map(s => s.type ?? 'CLASS'));
        for (const type of types) if (selected.filter(s => s.courseCode===course.code && (s.type ?? 'CLASS')===type).length !== 1) {
          throw new ApiError(400,'INCOMPLETE_SELECTION','Choose exactly one section of each required type per course.');
        }
      }
      if (selected.some(s => s.parent && !selected.some(p => p.courseCode===s.courseCode && p.type==='LEC' && p.id===s.parent))) {
        throw new ApiError(400,'PARENT_MISMATCH','A selected tutorial/lab does not belong to the selected lecture.');
      }
    }
    const conflicts = scheduler.detectConflicts(selected,input.blocked);
    const internalConflicts = selected.filter(s => s.meetings.some((a,i) => s.meetings.slice(i+1).some(b => scheduler.meetingsOverlap(a,b))))
      .map(s => ({ a: `${s.courseCode}:${s.id}`, internal: true }));
    const warnings = selected.some(scheduler.hasUnknownMeetings) ? ['Some selected meeting times are TBA; conflicts cannot be fully verified.'] : [];
    return { selected, conflicts: [...conflicts,...internalConflicts], warnings, loaded };
  }
  async function conflicts(input) {
    const result = await resolveSelection(input);
    return { term: input.term, conflicts: result.conflicts, warnings: result.warnings, fullyVerified: !result.warnings.length };
  }
  async function generate(input) {
    const { cursor,...request } = input;
    const payload = cursor ? cursors.verify(cursor) : null;
    const loaded = await load(input.term,input.courseCodes);
    for (const [code,lock] of Object.entries(input.locked)) {
      const course = loaded.courses.find(c => c.code===code);
      const locks = typeof lock==='string' ? { CLASS: lock } : lock;
      if (!course || Object.entries(locks).some(([type,id]) => !course.sections.some(s => (s.type ?? 'CLASS')===type && s.id===id))) {
        throw new ApiError(400,'INVALID_LOCK','A locked section is not a candidate for a selected course.');
      }
    }
    if (input.excluded.some(key => !loaded.courses.some(c => c.sections.some(s => `${c.code}:${s.id}`===key)))) {
      throw new ApiError(400,'INVALID_EXCLUSION','An excluded section is not a candidate for a selected course.');
    }
    const binding = fingerprint({ request, courses: loaded.courses, revision: loaded.revision });
    if (payload && payload.binding!==binding) throw new ApiError(409,'CURSOR_STALE','The selection or catalogue changed. Start a new search.');
    const result = await worker.run(loaded.courses,{ ...request, state: payload?.state, maxNodes: config.maxNodes });
    const { continuation,...response } = result;
    return { ...response, nextCursor: continuation ? cursors.sign(binding,continuation) : null,
      catalogRevision: loaded.revision, rankingScope: Object.keys(input.prefs).length ? 'page' : 'none' };
  }
  return { details, conflicts, generate, resolveSelection };
}
module.exports = { createCatalogScheduling };
