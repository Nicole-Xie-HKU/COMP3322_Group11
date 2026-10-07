import {parentPort,workerData} from 'node:worker_threads';

// Node watch mode emits dependency messages before the scheduler's own response.
for(const message of [{'watch:import':['scheduler.js']},null,'status',{}])parentPort.postMessage(message);
switch(workerData.options.outcome) {
  case 'result': parentPort.postMessage({result:{schedules:[]}});break;
  case 'error': parentPort.postMessage({error:'Intentional worker failure'});break;
  case 'malformed': parentPort.postMessage({result:null});break;
  case 'timeout': setInterval(()=>{},1000);break;
}
