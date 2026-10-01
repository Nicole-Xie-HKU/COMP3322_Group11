export const sectionKey = section => `${section.courseCode}:${section.id}`;
export const scheduleId = sections => sections.map(sectionKey).sort().join(',');
export function seatStatus(section) {
  if (section.seatsLeft == null) return 'unknown';
  if (section.seatsLeft > 0) return 'open';
  return section.waitlist?.open ? 'waitlist' : 'full';
}
export function creditSummary(courses) {
  const knownCredits = courses.reduce((sum, course) => sum + (course.credits ?? 0), 0);
  const creditsKnown = courses.every(course => course.credits != null);
  return { totalCredits: creditsKnown ? knownCredits : null, knownCredits, creditsKnown };
}
