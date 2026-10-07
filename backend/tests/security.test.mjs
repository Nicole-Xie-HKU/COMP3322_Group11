import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createCursors,fingerprint}=require('../src/l1_building_blocks/cursors');
const {readConfig}=require('../src/l1_building_blocks/config');
const {createWorkerRunner}=require('../src/l1_building_blocks/workers');
const {parse,generation}=require('../src/l0_axioms/requests');
test('cursor signature, expiry and stable input fingerprint',()=>{
  let now=1000; const cursors=createCursors('a'.repeat(40),()=>now); const token=cursors.sign('binding',{depth:0});
  assert.equal(cursors.verify(token).binding,'binding');
  assert.throws(()=>cursors.verify(token+'a'),{code:'INVALID_CURSOR'});
  now+=3600001; assert.throws(()=>cursors.verify(token),{code:'CURSOR_EXPIRED'});
  assert.equal(fingerprint({b:1,a:2}),fingerprint({a:2,b:1}));
});
test('request schema normalizes v3 term and rejects invalid/unknown controls',()=>{
  const input=parse(generation,{term:'2026-27 Sem 1',courseCodes:['comp3322'],locked:{COMP3322:'1A'}});
  assert.equal(input.term,'2026-27 Sem 1'); assert.equal(input.courseCodes[0],'COMP3322');
  for(const extra of [{maxResults:0},{maxNodes:1},{blocked:[{day:8,start:0,end:60}]},{locked:{COMP3322:5}}]) {
    assert.throws(()=>parse(generation,{term:'2026-27-S1',courseCodes:['COMP3322'],...extra}),{code:'INVALID_REQUEST'});
  }
});
test('production rejects default secrets, non-HTTPS origins and broad proxy trust',()=>{
  assert.throws(()=>readConfig({}),/CURSOR_SECRET/);
  assert.throws(()=>readConfig({CURSOR_SECRET:'a'.repeat(40),NODE_ENV:'production'}),/HTTPS/);
  assert.throws(()=>readConfig({CURSOR_SECRET:'a'.repeat(40),TRUST_PROXY:'true'}),/TRUST_PROXY/);
});
test('worker concurrency guard and timeout leave no leaked worker',async()=>{
  const runner=createWorkerRunner(new URL('./fixtures/stall-worker.mjs',import.meta.url),{maxWorkers:1,workerTimeoutMs:60});
  const timeout=assert.rejects(runner.run([],{}),{code:'SCHEDULER_TIMEOUT'});
  await assert.rejects(runner.run([],{}),{code:'SCHEDULER_BUSY'}); await timeout; await runner.close();
});
