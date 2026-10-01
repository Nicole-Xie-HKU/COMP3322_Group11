const courses = require('./HKU_timetable_2026-2027.json');
const { getPool } = require('./db');

async function importData() {
  const db = await getPool().getConnection();
  try {
    const [existing] = await db.query('SELECT class_number, term FROM sections');
    const imported = new Set(existing.map(row => `${row.term}:${row.class_number}`));
    const rows = courses.filter(course => course['COURSE CODE'] && course.TERM && course.CLASS_NUMBER &&
      !imported.has(`${course.TERM}:${course.CLASS_NUMBER}`));
    if (!rows.length) { console.log('Course data is already imported.'); return; }

    const courseRows = rows.map(course => [course['COURSE CODE'], course.COURSE_TITLE, course.OFFER_DEPT, course.ACAD_CAREER]);
    const sectionRows = rows.map(course => [course.CLASS_NUMBER, course.TERM, course['COURSE CODE'], course['CLASS SECTION']]);
    const instructorRows = [];
    const meetingRows = [];
    for (const course of rows) {
      for (const instructor of course.INSTRUCTORS || []) {
        if (instructor) instructorRows.push([course.CLASS_NUMBER, course.TERM, instructor]);
      }
      for (const meeting of course.MEETINGS || []) {
        meetingRows.push([course.CLASS_NUMBER, course.TERM, course.START_DATE, course.END_DATE,
          meeting.DAY, meeting.START_TIME, meeting.END_TIME, meeting.VENUE]);
      }
    }

    await db.beginTransaction();
    await db.query('INSERT IGNORE INTO courses (course_code, course_title, offer_dept, acad_career) VALUES ?', [courseRows]);
    await db.query('INSERT INTO sections (class_number, term, course_code, class_section) VALUES ?', [sectionRows]);
    if (instructorRows.length) await db.query('INSERT INTO instructors (class_number, term, instructor_name) VALUES ?', [instructorRows]);
    if (meetingRows.length) await db.query('INSERT INTO meetings (class_number, term, start_date, end_date, day, start_time, end_time, venue) VALUES ?', [meetingRows]);
    await db.commit();
    console.log(`Imported ${sectionRows.length} sections and ${meetingRows.length} meetings.`);
  } catch (error) {
    await db.rollback();
    throw error;
  } finally { db.release(); }
}

if (require.main === module) {
  importData().catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => getPool().end());
}

module.exports = importData;
