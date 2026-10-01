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
      worker.once('message', message => message.error ? finish(new ApiError(500,'SCHEDULER_FAILED','Schedule generation failed.')) : finish(null,message.result));
      worker.once('error', () => finish(new ApiError(500,'SCHEDULER_FAILED','Schedule generation failed.')));
      worker.once('exit', () => { if (!settled) finish(new ApiError(503,'SCHEDULER_STOPPED','Scheduling worker stopped.')); });
    });
  }
  return { run, close: () => Promise.all([...active].map(worker => worker.terminate())) };
}
module.exports = { createWorkerRunner };
