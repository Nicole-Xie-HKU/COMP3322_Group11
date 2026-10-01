const { getPool } = require('./db');
const { toAlgorithmFormat } = require('./courseMapper');

async function getTerms() {
  const [rows] = await getPool().query(
    'SELECT term, MIN(start_date) AS startDate, MAX(end_date) AS endDate FROM meetings GROUP BY term ORDER BY term');
  return rows.map(r => ({ id: r.term, name: r.term, startDate: r.startDate, endDate: r.endDate }));
}

async function searchCourses(term, q, limit = 30) {
  const kw = String(q || '').trim();
  const [rows] = await getPool().query(
    `SELECT c.course_code AS code, c.course_title AS title, c.offer_dept AS dept, c.acad_career AS career,
            COUNT(s.class_number) AS sectionCount
       FROM courses c JOIN sections s ON s.course_code = c.course_code AND s.term = ?
      WHERE c.course_code LIKE ? OR c.course_title LIKE ?
      GROUP BY c.course_code
      ORDER BY (c.course_code LIKE ?) DESC, c.course_code
      LIMIT ?`,
    [term, `${kw}%`, `%${kw}%`, `${kw}%`, Number(limit)]);
  return rows;
}

async function getCoursesForScheduling(term, codes) {
  const list = [...new Set((codes || []).map(c => String(c).trim().toUpperCase()).filter(Boolean))];
  if (!list.length) return { courses: [], notFound: [] };
  const db = getPool();
  const [cRows] = await db.query('SELECT course_code, course_title, offer_dept FROM courses WHERE course_code IN (?)', [list]);
  const [sRows] = await db.query(
    'SELECT class_number, course_code, class_section FROM sections WHERE term = ? AND course_code IN (?) ORDER BY course_code, class_section',
    [term, list]);
  const nums = sRows.map(s => s.class_number);
  const [mRows] = nums.length ? await db.query(
    'SELECT class_number, day, start_time, end_time, start_date, end_date, venue FROM meetings WHERE term = ? AND class_number IN (?)',
    [term, nums]) : [[]];
  const [iRows] = nums.length ? await db.query(
    'SELECT class_number, instructor_name FROM instructors WHERE term = ? AND class_number IN (?)',
    [term, nums]) : [[]];
  return {
    courses: toAlgorithmFormat(cRows, sRows, mRows, iRows),
    notFound: list.filter(c => !sRows.some(r => r.course_code === c)),
  };
}

module.exports = { getTerms, searchCourses, getCoursesForScheduling };
