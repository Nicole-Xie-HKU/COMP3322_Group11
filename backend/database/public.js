// Public database workflow boundary. Other modules must not import query or pool internals.
const { getPool } = require('./db');
const catalog = require('./l2_workflows/catalog');
const persistence = require('./l2_workflows/persistence');
const { selectSaved } = require('./l1_building_blocks/savedQueries');
function createDatabase(pool = getPool()) {
  return {
    getTerms: () => catalog.getTerms(pool),
    searchCourses: (term, query, limit) => catalog.searchCourses(pool, term, query, limit),
    getCoursesForScheduling: (term, codes) => catalog.getCoursesForScheduling(pool, term, codes),
    getSession: hash => persistence.getSession(pool, hash),
    createSession: hash => persistence.createSession(pool, hash),
    listSaved: owner => persistence.listSaved(pool, owner),
    getSaved: (owner, id) => selectSaved(pool, owner, id),
    writeSaved: (owner, selection, id) => persistence.writeSaved(pool, owner, selection, id),
    deleteSaved: (owner, id) => persistence.deleteSaved(pool, owner, id),
    async ready() {
      const [[row]] = await pool.query("SELECT version FROM backend_migrations WHERE version='001-main-extension'");
      if (!row) throw new Error('Schema is not ready');
      for (const table of ['terms','courses','sections','meetings','instructors','guest_sessions','saved_schedules','catalog_imports','backend_course_metadata','backend_section_metadata']) {
        await pool.query(`SELECT 1 FROM ${table} LIMIT 0`);
      }
      await pool.query('SELECT is_active FROM backend_section_metadata LIMIT 0');
      await pool.query('SELECT owner_session_id FROM saved_schedules LIMIT 0');
      return true;
    },
    close: () => pool.end(),
  };
}
module.exports = { createDatabase };
