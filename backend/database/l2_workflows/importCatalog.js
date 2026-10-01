const { writeCatalog, writeMeetings } = require('../l1_building_blocks/importQueries');
async function importCatalog(connection, parsed, sourceHash, { afterSections = async () => {} } = {}) {
  const [[lock]] = await connection.query("SELECT GET_LOCK('hkuplan_catalog_import', 10) AS acquired");
  if (!lock.acquired) throw new Error('Another catalogue import is running');
  try {
    await connection.beginTransaction();
    const ids = await writeCatalog(connection, parsed);
    await afterSections(); // Injection point for rollback tests; not exposed through HTTP.
    if (ids.size !== parsed.sections.size) throw new Error('Section count reconciliation failed');
    const counts = { terms: parsed.terms.size, courses: parsed.courses.size, sections: ids.size,
      ...await writeMeetings(connection, parsed, ids), ...parsed.stats };
    const [[actual]] = await connection.query(`SELECT
      (SELECT COUNT(*) FROM meetings c JOIN sections s ON c.term=s.term AND c.class_number=s.class_number WHERE s.section_id IN (?)) AS meetings,
      (SELECT COUNT(*) FROM instructors c JOIN sections s ON c.term=s.term AND c.class_number=s.class_number WHERE s.section_id IN (?)) AS instructors`, [[...ids.values()],[...ids.values()]]);
    if (actual.meetings !== counts.meetings || actual.instructors !== counts.instructors) throw new Error('Child-row reconciliation failed');
    await connection.execute('INSERT INTO catalog_imports(source_sha256,counts) VALUES(?,?)', [sourceHash, JSON.stringify(counts)]);
    await connection.commit(); return counts;
  } catch (error) { await connection.rollback(); throw error; }
  finally { await connection.query("SELECT RELEASE_LOCK('hkuplan_catalog_import')"); }
}
module.exports = { importCatalog };
