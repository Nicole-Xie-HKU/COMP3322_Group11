function savedRow(row) {
  if (!row) return null;
  const json = value => typeof value === 'string' ? JSON.parse(value) : value;
  return { id: row.schedule_id, term: row.term_id, name: row.name,
    sectionKeys: json(row.section_keys), blocked: json(row.blocked), createdAt: row.created_at, updatedAt: row.updated_at };
}
async function selectSaved(connection, owner, id) {
  const [rows] = await connection.execute('SELECT * FROM saved_schedules WHERE owner_session_id=? AND schedule_id=?', [owner, id]);
  return savedRow(rows[0]);
}
module.exports = { savedRow, selectSaved };
