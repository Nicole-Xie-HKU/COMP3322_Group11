import { weeklyOccurrences, consecutivePairs } from '../l1_building_blocks/occurrences.js';
import { normalizeVenue } from '../l1_building_blocks/venues.js';
import { findCampusRoute } from './routing.js';

/** Only actual occurrences in the inclusive displayed week can form a class transfer. */
export async function getWeeklyTransfers(schedule, range, term = {}) {
  const { days, uncertain } = weeklyOccurrences(schedule, range, term);
  // Unknown-time classes could intervene anywhere; do not assert adjacency for provisional schedules.
  if (uncertain) return { transfers: [], notice: 'Transfers are unavailable while class times or teaching dates are unknown.' };
  const transfers = [];
  for (const meetings of days) for (const [from, to] of consecutivePairs(meetings)) {
    if (from.venue && to.venue && normalizeVenue(from.venue) === normalizeVenue(to.venue)) continue;
    const route = await findCampusRoute(from.venue, to.venue);
    const gap = to.start - from.end;
    transfers.push({ id: `${from.date}:${from.course}:${from.sectionId}:${from.start}:${to.course}:${to.start}`,
      date: from.date, day: from.day, fromCourse: from.course, toCourse: to.course,
      fromVenue: from.venue || 'Venue TBA', toVenue: to.venue || 'Venue TBA',
      endTime: from.end, startTime: to.start, gap, route,
      tight: route.minutes !== null && route.minutes > gap });
  }
  return { transfers, notice: '' };
}
