const { ApiError } = require('../l0_axioms/errors');
function createSavedSchedules(db, catalogue, scheduler) {
  async function requireSaved(owner,id) {
    const saved = await db.getSaved(owner,id);
    if (!saved) throw new ApiError(404,'SCHEDULE_NOT_FOUND','Saved schedule not found.');
    return saved;
  }
  async function reconstruct(saved, stale = false) {
    try {
      const result = await catalogue.resolveSelection(saved,true);
      if (result.conflicts.some(pair => pair.hard!==false)) throw new ApiError(400,'SCHEDULE_CONFLICT','Selected sections contain a conflict.', { conflicts: result.conflicts });
      const known = result.loaded.courses.every(course => course.credits!=null);
      return { ...saved, schedule: { id: scheduler.scheduleId(result.selected), sections: result.selected,
        ...scheduler.meetingCompleteness(result.selected),
        credits: known ? result.loaded.courses.reduce((sum,c) => sum+c.credits,0) : null }, warnings: result.warnings };
    } catch (error) {
      if (stale && [400,404].includes(error.status ?? (error.code==='TERM_NOT_FOUND' ? 404 : 0))) {
        throw new ApiError(409,'SAVED_SCHEDULE_STALE','Catalogue changes made this saved selection invalid.', { saved });
      }
      throw error;
    }
  }
  async function create(owner,input) {
    await reconstruct(input);
    return reconstruct(await db.writeSaved(owner,input),true);
  }
  async function update(owner,id,input) {
    const current = await requireSaved(owner,id), updated = { ...current,...input };
    await reconstruct(updated);
    return reconstruct(await db.writeSaved(owner,updated,id),true);
  }
  return { create, update, list: owner => db.listSaved(owner),
    get: async (owner,id) => reconstruct(await requireSaved(owner,id),true),
    delete: (owner,id) => db.deleteSaved(owner,id) };
}
module.exports = { createSavedSchedules };
