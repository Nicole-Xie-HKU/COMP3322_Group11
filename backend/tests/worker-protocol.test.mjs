import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createWorkerRunner}=require('../src/l1_building_blocks/workers');
const entry=new URL('./fixtures/noisy-worker.mjs',import.meta.url);

function setup(t,workerTimeoutMs=2000) {
  const runner=createWorkerRunner(entry,{maxWorkers:1,workerTimeoutMs});
  t.after(()=>runner.close());return runner;
}
test('worker ignores monitoring messages and returns the actual result',async t=>{
  const runner=setup(t);
  assert.deepEqual(await runner.run([],{outcome:'result'}),{schedules:[]});
  assert.deepEqual(await runner.run([],{outcome:'result'}),{schedules:[]});
});
test('worker error after monitoring messages is not mistaken for success',async t=>{
  await assert.rejects(setup(t).run([],{outcome:'error'}),{code:'SCHEDULER_FAILED'});
});
test('malformed scheduler results fail explicitly',async t=>{
  await assert.rejects(setup(t).run([],{outcome:'malformed'}),{code:'SCHEDULER_FAILED'});
});
test('worker exiting after monitoring messages still reports a stopped worker',async t=>{
  await assert.rejects(setup(t).run([],{outcome:'exit'}),{code:'SCHEDULER_STOPPED'});
});
test('monitoring messages do not bypass timeout or concurrency limits',async t=>{
  const runner=setup(t,200);
  const timedOut=assert.rejects(runner.run([],{outcome:'timeout'}),{code:'SCHEDULER_TIMEOUT'});
  await assert.rejects(runner.run([],{outcome:'result'}),{code:'SCHEDULER_BUSY'});
  await timedOut;
  assert.deepEqual(await runner.run([],{outcome:'result'}),{schedules:[]});
});
