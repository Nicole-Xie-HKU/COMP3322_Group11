const { Worker } = require('node:worker_threads');
const { ApiError } = require('../l0_axioms/errors');
function createWorkerRunner(entry, config) {
  const active = new Set();
  function run(courses, options) {
    if (active.size >= config.maxWorkers) return Promise.reject(new ApiError(503,'SCHEDULER_BUSY','Scheduling is busy; retry shortly.'));
    return new Promise((resolve,reject) => {
      const worker = new Worker(entry, { workerData: { courses,options }, resourceLimits: { maxOldGenerationSizeMb: 128 } });
      active.add(worker); let settled = false;
      function finish(error,result) {
        if (settled) return; settled = true; clearTimeout(timer); active.delete(worker);
        void worker.terminate(); if (error) reject(error); else resolve(result);
      }
      const timer = setTimeout(() => finish(new ApiError(503,'SCHEDULER_TIMEOUT','Search exceeded its time budget. Reduce the selected courses.')), config.workerTimeoutMs);
      worker.on('message', message => {
        // Node --watch sends dependency notifications before the scheduler's own response.
        // Keep listening without treating those notifications as a result or resetting the timeout.
        if (!message || typeof message !== 'object') return;
        if (Object.hasOwn(message,'error')) return finish(new ApiError(500,'SCHEDULER_FAILED','Schedule generation failed.'));
        if (!Object.hasOwn(message,'result')) return;
        if (!message.result || typeof message.result !== 'object' || !Array.isArray(message.result.schedules)) {
          return finish(new ApiError(500,'SCHEDULER_FAILED','Schedule generation failed.'));
        }
        finish(null,message.result);
      });
      worker.once('error', () => finish(new ApiError(500,'SCHEDULER_FAILED','Schedule generation failed.')));
      worker.once('exit', () => { if (!settled) finish(new ApiError(503,'SCHEDULER_STOPPED','Scheduling worker stopped.')); });
    });
  }
  return { run, close: () => Promise.all([...active].map(worker => worker.terminate())) };
}
module.exports = { createWorkerRunner };
