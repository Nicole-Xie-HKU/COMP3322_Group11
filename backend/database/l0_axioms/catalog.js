function catalogError(code, message, details) { return Object.assign(new Error(message), { code, details }); }
function mapMeetings(rows) {
  return rows.map(m => ({ day: m.day_of_week, start: m.start_min, end: m.end_min,
    startDate: m.start_date, endDate: m.end_date, venue: m.venue ?? null }));
}
function toAlgorithmFormat(term, courseRows, sectionRows, meetingRows, instructorRows = []) {
  const meetingsBySection = new Map(), instructorsBySection = new Map();
  for (const meeting of meetingRows) {
    if (!meetingsBySection.has(meeting.section_id)) meetingsBySection.set(meeting.section_id, []);
    meetingsBySection.get(meeting.section_id).push(meeting);
  }
  for (const row of instructorRows) {
    if (!instructorsBySection.has(row.section_id)) instructorsBySection.set(row.section_id, []);
    instructorsBySection.get(row.section_id).push(row.instructor_name);
  }
  return courseRows.map(course => {
    const sections = sectionRows.filter(s => s.course_code === course.course_code).map(s => {
      const meetings = meetingsBySection.get(s.section_id) ?? [];
      const instructors = instructorsBySection.get(s.section_id) ?? [];
      return { id: s.class_section, type: s.section_type, parent: s.parent_section ?? null,
        classNumber: s.class_number ?? null, instructor: instructors.join('; ') || null, instructors,
        campus: s.campus ?? null, seatsLeft: s.seats_left ?? null,
        waitlist: s.waitlist_open == null ? null : { open: Boolean(s.waitlist_open), count: s.waitlist_count ?? null },
        meetings: mapMeetings(meetings.filter(m => m.day_of_week != null)),
        tba: meetings.filter(m => m.day_of_week == null).map(m => ({ startDate: m.start_date, endDate: m.end_date, venue: m.venue ?? null })),
      };
    });
    return { code: course.course_code, title: course.course_title, dept: course.offer_dept ?? null,
      career: course.acad_career ?? null, credits: course.credits == null ? null : Number(course.credits),
      creditsKnown: course.credits != null, sections };
  });
}
module.exports = { catalogError, mapMeetings, toAlgorithmFormat };
