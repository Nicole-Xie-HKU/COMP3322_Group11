import { buildGroups } from '../l1_building_blocks/groups.js';
import { sectionsConflict } from '../l1_building_blocks/conflicts.js';
import { scoreSchedule } from '../l1_building_blocks/score.js';
import { creditSummary, scheduleId } from '../l0_axioms/identity.js';
import { hasUnknownMeetings, meetingCompleteness } from '../l0_axioms/completeness.js';
import { normalizeBlocks } from '../l0_axioms/blocks.js';

// Group event-removed sections by course so the UI can explain why options shrank.
function eventImpact(blockedSections) {
  const byCourse = new Map();
  for (const item of blockedSections) {
    const course = item.key.split(':')[0];
    if (!byCourse.has(course)) byCourse.set(course, []);
    byCourse.get(course).push({ key: item.key, type: item.type, labels: item.labels });
  }
  return [...byCourse.keys()].sort().map(course => ({ course, removed: byCourse.get(course) }));
}

/** Resumable form of the team's backtracking search. State is bound/signed by the API, not trusted as an HTTP payload. */
export function generateSchedules(courses, options = {}) {
  const opts = { blocked: [], excluded: [], seatPolicy: 'allowWaitlist', maxResults: 100, maxNodes: 500000, prefs: {}, ...options };
  if (!opts.term) throw new Error('A term is required');
  if (!Number.isInteger(opts.maxResults) || opts.maxResults < 1 || !Number.isInteger(opts.maxNodes) || opts.maxNodes < 1) {
    throw new Error('Search limits must be positive integers');
  }
  const events = normalizeBlocks(opts.blocked);
  opts.blocked = events.blocks;
  const { groups, skipped, invalidSections, unknownSections, invalidDateSections, blockedSections } = buildGroups(courses, opts.term, opts);
  const credits = creditSummary(courses), impact = eventImpact(blockedSections), warnings = [];
  if (events.errors.length) warnings.push(`Ignored ${events.errors.length} invalid personal event(s): ${events.errors.slice(0, 3).join('; ')}.`);
  if (blockedSections.length) warnings.push(`${blockedSections.length} section(s) are hidden by your personal events: ${blockedSections.slice(0, 3).map(b => `${b.key} (${b.labels[0]})`).join(', ')}${blockedSections.length > 3 ? ', ...' : ''}.`);
  if (invalidDateSections.length) warnings.push(`Sections excluded because a stated weekday never occurs within its teaching dates: ${invalidDateSections.join(', ')}. The source dates need correction; no replacement date was guessed.`);
  if (invalidSections.length) warnings.push(`${invalidSections.length} sections have overlapping source meetings and were excluded (${invalidSections.slice(0,5).join(', ')}${invalidSections.length>5?', ...':''}). Ask the database team to verify possible room/date overrides; no override was guessed.`);
  const sections = courses.flatMap(c => c.offerings.find(o => o.term === opts.term)?.sections ?? []);
  const hasUnknownTimes = sections.some(hasUnknownMeetings);
  if (!credits.creditsKnown) warnings.push('Some credits are unknown; totalCredits is not a verified total.');
  if (sections.some(s => s.seatsLeft == null)) warnings.push('Some seat counts are unknown; this is not live registration availability.');
  if (unknownSections.length) warnings.push(`${unknownSections.length} section(s) with unknown meeting times excluded. Enable provisional results to include them.`);
  if (opts.maxCredits && credits.totalCredits != null && credits.totalCredits > opts.maxCredits) warnings.push('Known credits exceed the requested limit.');
  const base = { term: opts.term, ...credits, warnings, skipped, hasUnknownTimes, eventImpact: impact };
  if (!groups.length || skipped.length || groups.some(g => !g.options.length)) {
    return { ...base, schedules: [], total: 0, totalExact: true, returnedCount: 0, searchComplete: true, truncated: false, continuation: null,
      diagnosis: [{ message: skipped.length ? 'A requested course is not offered in this term.' : unknownSections.length
        ? 'No fully timed combination matches. Change a section or explicitly include provisional results with unknown times.'
        : impact.length ? 'Every candidate section overlaps a personal event. Make an event flexible, move it, or remove it to see options again.'
        : 'No section combination satisfies the selection constraints.' }] };
  }
  const state = opts.state ? structuredClone(opts.state) : { depth: 0, next: Array(groups.length).fill(0), chosen: Array(groups.length).fill(0), emitted: 0 };
  if (!Number.isInteger(state.depth) || state.depth < 0 || state.depth >= groups.length ||
      state.next?.length !== groups.length || state.chosen?.length !== groups.length || !Number.isSafeInteger(state.emitted) || state.emitted < 0 ||
      state.next.some((n, i) => !Number.isInteger(n) || n < 0 || n > groups[i].options.length) ||
      state.chosen.some((n, i) => !Number.isInteger(n) || n < 0 || n >= groups[i].options.length)) throw new Error('Invalid search state');
  const found = []; let nodes = 0;
  while (state.depth >= 0 && nodes < opts.maxNodes && found.length < opts.maxResults) {
    const depth = state.depth;
    if (state.next[depth] >= groups[depth].options.length) { state.next[depth] = 0; state.depth--; continue; }
    const index = state.next[depth]++; nodes++;
    const candidate = groups[depth].options[index];
    const chosen = state.chosen.slice(0, depth).map((n, i) => groups[i].options[n]);
    if (candidate.parent && !chosen.some(s => s.courseCode === candidate.courseCode && s.type === 'LEC' && s.id === candidate.parent)) continue;
    if (chosen.some(s => sectionsConflict(s, candidate))) continue;
    state.chosen[depth] = index;
    if (depth + 1 === groups.length) {
      const selection = [...chosen, candidate]; state.emitted++;
      found.push({ id: scheduleId(selection), sections: selection, credits: credits.totalCredits, ...meetingCompleteness(selection),
        ...scoreSchedule(selection, { ...opts.prefs, blocked: opts.blocked }) });
    } else { state.depth++; state.next[state.depth] = 0; }
  }
  // Unwind exhausted frames without consuming budget; exact final pages need no empty follow-up.
  while (state.depth >= 0 && state.next[state.depth] >= groups[state.depth].options.length) {
    state.next[state.depth] = 0; state.depth--;
  }
  const searchComplete = state.depth < 0;
  if (!searchComplete) warnings.push('Search is incomplete. Follow nextCursor to continue; total is only a lower bound.');
  if (Object.keys(opts.prefs).length) found.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { ...base, schedules: found, total: state.emitted, totalExact: searchComplete, returnedCount: found.length,
    searchComplete, truncated: !searchComplete, continuation: searchComplete ? null : state,
    ...(searchComplete && state.emitted === 0 ? { diagnosis: [{ message: 'No combination satisfies all time and selection constraints.' }] } : {}) };
}
