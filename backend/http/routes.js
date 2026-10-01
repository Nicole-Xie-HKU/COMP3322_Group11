const express = require('express');
const request = require('../src/l0_axioms/requests');
const { ApiError } = require('../src/l0_axioms/errors');
const { limiter } = require('../src/l1_building_blocks/security');
// Preserve the merged frontend contract while exposing the additional backend workflows.
function createRoutes({ db,catalogue,saved,sessions,config }) {
  const router = express.Router(), parse = request.parse;
  router.get('/health',async (req,res) => {
    try { await db.ready(); res.json({ status: 'ok' }); }
    catch { throw new ApiError(503,'NOT_READY','Database/schema is not ready.'); }
  });
  router.get('/health/live',(req,res) => res.json({ status: 'ok' }));
  router.get('/health/ready',async (req,res) => {
    try { await db.ready(); res.json({ status: 'ready' }); }
    catch { throw new ApiError(503,'NOT_READY','Database/schema is not ready.'); }
  });
  router.get('/terms',async (req,res) => res.json(await db.getTerms()));
  router.get('/courses',async (req,res) => {
    const query = parse(request.search,req.query);
    res.json(await db.searchCourses(query.term,query.q,query.limit));
  });
  router.get('/courses/:code',async (req,res) => {
    const query = parse(request.detail,req.query), code = parse(request.code,req.params.code);
    res.json(await catalogue.details(code,query.term));
  });
  router.post('/schedules/conflicts',limiter(config.generationRateLimit),async (req,res) => res.json(await catalogue.conflicts(parse(request.selection,req.body))));
  router.post('/schedules/generate',limiter(config.generationRateLimit),async (req,res) => res.json(await catalogue.generate(parse(request.generation,req.body))));
  router.post('/guest-session',limiter(30),async (req,res) => { parse(request.empty,req.body ?? {}); await sessions.establish(req,res); });
  router.get('/schedules',sessions.requireSession,async (req,res) => res.json(await saved.list(req.guestSession.id)));
  router.post('/schedules',sessions.requireSession,async (req,res) => {
    const created = await saved.create(req.guestSession.id,parse(request.save,req.body));
    res.status(201).location(`${config.apiPrefix}/schedules/${created.id}`).json(created);
  });
  router.get('/schedules/:id',sessions.requireSession,async (req,res) => res.json(await saved.get(req.guestSession.id,parse(request.id,req.params.id))));
  router.put('/schedules/:id',sessions.requireSession,async (req,res) => res.json(await saved.update(req.guestSession.id,
    parse(request.id,req.params.id),parse(request.update,req.body))));
  router.delete('/schedules/:id',sessions.requireSession,async (req,res) => {
    await saved.delete(req.guestSession.id,parse(request.id,req.params.id)); res.json({ deleted: true });
  });
  return router;
}
module.exports = { createRoutes };
