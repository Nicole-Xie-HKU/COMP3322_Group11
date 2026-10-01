const { selectTerm, selectCourses, searchRows, termRows } = require('../l1_building_blocks/catalogQueries');
const { catalogError, toAlgorithmFormat } = require('../l0_axioms/catalog');
async function withSnapshot(pool, operation) {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit(); return result;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function requireTerm(connection, term) {
  const found = await selectTerm(connection, term);
  if (!found) throw catalogError('TERM_NOT_FOUND', 'The requested term does not exist.');
  return found;
}
async function getTerms(pool) {
  const [rows] = await pool.query(`${termRows} GROUP BY s.term ORDER BY s.term`);
  return rows;
}
async function searchCourses(pool, term, query, limit = 30) {
  return withSnapshot(pool, async connection => {
    await requireTerm(connection, term); return searchRows(connection, term, query, limit);
  });
}
async function getCoursesForScheduling(pool, term, codes) {
  const list = [...new Set(codes.map(code => code.trim().toUpperCase()))].sort();
  return withSnapshot(pool, async connection => {
    const termInfo = await requireTerm(connection, term);
    const rows = await selectCourses(connection, term, list);
    const courses = toAlgorithmFormat(term, rows.courseRows, rows.sectionRows, rows.meetingRows, rows.instructorRows);
    const notFound = list.filter(code => !courses.some(course => course.code === code));
    const notOffered = courses.filter(course => !course.sections.length).map(course => course.code);
    const [[latest]] = await connection.query('SELECT COALESCE(MAX(import_id), 0) AS revision FROM catalog_imports');
    return { termInfo, courses, notFound, notOffered, revision: latest.revision };
  });
}
module.exports = { withSnapshot, getTerms, searchCourses, getCoursesForScheduling };
