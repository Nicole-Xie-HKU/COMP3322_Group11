// Public worker entry: HTTP requests never execute a large search on the event loop.
import { parentPort, workerData } from 'node:worker_threads';
import { generateSchedules } from './scheduler.js';
try { parentPort.postMessage({ result: generateSchedules(workerData.courses, workerData.options) }); }
catch (error) { parentPort.postMessage({ error: error.message }); }
