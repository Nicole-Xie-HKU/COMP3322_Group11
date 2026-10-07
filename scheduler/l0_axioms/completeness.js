import { datesOverlap } from './time.js';

export function hasUnknownMeetings(section) {
  return !section.meetings?.length || (Array.isArray(section.tba) ? section.tba.length > 0 : Boolean(section.tba));
}

/** Completeness belongs to the selected sections, not all alternatives in the catalogue. */
export function meetingCompleteness(sections) {
  const unknownSectionKeys = sections.filter(hasUnknownMeetings).map(s => `${s.courseCode}:${s.id}`).sort();
  return { fullyVerified: unknownSectionKeys.length === 0, unknownSectionKeys };
}
/** A declared weekday outside its entire teaching range cannot produce a calendar event. */
export function hasImpossibleMeetingDates(section) {
  return section.meetings.some(meeting => !datesOverlap(meeting, meeting));
}
