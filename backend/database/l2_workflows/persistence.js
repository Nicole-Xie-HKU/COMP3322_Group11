const { randomUUID } = require('node:crypto');
const { catalogError } = require('../l0_axioms/catalog');
const { savedRow, selectSaved } = require('../l1_building_blocks/savedQueries');
async function getSession(pool, tokenHash) {
  const [rows] = await pool.execute('SELECT session_id AS id, expires_at AS expiresAt FROM guest_sessions WHERE token_hash=? AND expires_at>UTC_TIMESTAMP()', [tokenHash]);
  return rows[0] ? { ...rows[0], expiresAt: rows[0].expiresAt.replace(' ', 'T') + 'Z' } : null;
}
async function createSession(pool, tokenHash) {
  const id = randomUUID();
  await pool.execute('INSERT INTO guest_sessions(session_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))', [id, tokenHash]);
  return getSession(pool, tokenHash);
}
async function listSaved(pool, owner) {
  const [rows] = await pool.execute('SELECT * FROM saved_schedules WHERE owner_session_id=? ORDER BY schedule_id DESC', [owner]);
  return rows.map(savedRow);
}
async function writeSaved(pool, owner, selection, id = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Serialize writes per guest to enforce the quota under concurrent requests.
    const [sessions] = await connection.execute('SELECT session_id FROM guest_sessions WHERE session_id=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE', [owner]);
    if (!sessions.length) throw catalogError('SESSION_REQUIRED', 'A valid guest session is required.');
    if (id != null && !await selectSaved(connection, owner, id)) throw catalogError('SCHEDULE_NOT_FOUND', 'Saved schedule not found.');
    if (id == null) {
      const [[count]] = await connection.execute('SELECT COUNT(*) AS n FROM saved_schedules WHERE owner_session_id=?', [owner]);
      if (count.n >= 100) throw catalogError('SAVE_LIMIT', 'A guest can save at most 100 schedules.');
      const [result] = await connection.execute('INSERT INTO saved_schedules(owner_session_id,term_id,name,section_keys,blocked) VALUES(?,?,?,?,?)',
        [owner, selection.term, selection.name, JSON.stringify(selection.sectionKeys), JSON.stringify(selection.blocked)]);
      id = result.insertId;
    } else {
      await connection.execute('UPDATE saved_schedules SET term_id=?,name=?,section_keys=?,blocked=? WHERE owner_session_id=? AND schedule_id=?',
        [selection.term, selection.name, JSON.stringify(selection.sectionKeys), JSON.stringify(selection.blocked), owner, id]);
    }
    const saved = await selectSaved(connection, owner, id);
    await connection.commit(); return saved;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function deleteSaved(pool, owner, id) {
  const [result] = await pool.execute('DELETE FROM saved_schedules WHERE owner_session_id=? AND schedule_id=?', [owner, id]);
  if (!result.affectedRows) throw catalogError('SCHEDULE_NOT_FOUND', 'Saved schedule not found.');
}
module.exports = { getSession, createSession, listSaved, writeSaved, deleteSaved };
