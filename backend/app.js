const path = require('node:path');
const express = require('express');
const { createDatabase } = require('./database/public');
const { readConfig } = require('./src/l1_building_blocks/config');
const { createCursors } = require('./src/l1_building_blocks/cursors');
const { createWorkerRunner } = require('./src/l1_building_blocks/workers');
const { installSecurity } = require('./src/l1_building_blocks/security');
const { errorMiddleware } = require('./src/l1_building_blocks/errorMiddleware');
const { ApiError } = require('./src/l0_axioms/errors');
const { createCatalogScheduling } = require('./src/l3_diplomacy/catalogScheduling');
const { createSavedSchedules } = require('./src/l3_diplomacy/savedSchedules');
const { createGuestSessions } = require('./src/l3_diplomacy/guestSessions');
const { createRoutes } = require('./http/routes');
const defaultLogger = { info: entry => console.log(JSON.stringify(entry)), error: entry => console.error(JSON.stringify(entry)) };
async function createApp({ config = readConfig(), db = createDatabase(), logger = defaultLogger, worker: injectedWorker } = {}) {
  const scheduler = await import('../scheduler/scheduler.js');
  const worker = injectedWorker || createWorkerRunner(path.join(__dirname,'../scheduler/worker.js'),config);
  const catalogue = createCatalogScheduling(db,scheduler,worker,createCursors(config.cursorSecret),config);
  const saved = createSavedSchedules(db,catalogue,scheduler), sessions = createGuestSessions(db,config);
  const app = express(); installSecurity(app,config,logger);
  app.use(express.json({ limit: '64kb', strict: true }));
  app.use(config.apiPrefix,createRoutes({ db,catalogue,saved,sessions,config }));
  app.use(express.static(path.join(__dirname,'../frontend/dist')));
  app.use((req,res,next) => next(new ApiError(404,'ROUTE_NOT_FOUND','API route not found.')));
  app.use(errorMiddleware(logger));
  app.locals.close = async () => { await worker.close(); await db.close(); };
  return app;
}
module.exports = { createApp };
