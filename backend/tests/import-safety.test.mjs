import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,rm,writeFile,mkdir,copyFile,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {workbookWithHeader} from './workbookFixture.mjs';
const require=createRequire(import.meta.url);
const {readWorkbook}=require('../database/l1_building_blocks/readWorkbook');

test('absent time, date and weekday headers fail instead of converting courses to TBA',async t=>{
  for(const header of ['START TIME','END TIME','START DATE','END DATE','MON','SUN']) {
    await assert.rejects(readWorkbook(await workbookWithHeader(t,header,header.replaceAll(' ','_')+'_MISSING')),
      new RegExp(`Missing workbook column: ${header}`));
  }
});
test('test runner fails closed for missing or empty suites, and propagates failures',async t=>{
  const folder=await mkdtemp(join(tmpdir(),'hkuplan-runner-'));t.after(()=>rm(folder,{recursive:true,force:true}));
  const runner=new URL('../scripts/run-tests.mjs',import.meta.url).pathname;
  // Node's test-child marker suppresses nested test discovery; this probe is an independent CLI invocation.
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const run=(...args)=>spawnSync(process.execPath,[runner,...args],{encoding:'utf8',env});
  for(const args of [[],[folder],[join(folder,'missing')]])assert.notEqual(run(...args).status,0);
  const file=join(folder,'probe.test.mjs');
  await writeFile(file,"import test from 'node:test'; test('probe',()=>{});\n");
  assert.equal(run(folder).status,0);
  await writeFile(file,"import test from 'node:test'; test('probe',()=>{throw new Error('Expected failure')});\n");
  assert.notEqual(run(folder).status,0);
});
test('environment setup generates private secrets once and refuses to overwrite them',async t=>{
  const folder=await mkdtemp(join(tmpdir(),'hkuplan-env-'));t.after(()=>rm(folder,{recursive:true,force:true}));
  await mkdir(join(folder,'backend/scripts'),{recursive:true});
  const script=join(folder,'backend/scripts/create-local-env.cjs');
  await copyFile(new URL('../scripts/create-local-env.cjs',import.meta.url),script);
  await copyFile(new URL('../../.env.example',import.meta.url),join(folder,'.env.example'));
  assert.equal(spawnSync(process.execPath,[script]).status,0);
  const before=await readFile(join(folder,'.env'),'utf8');
  assert.doesNotMatch(before,/replace-with/);assert.match(before,/CURSOR_SECRET=[a-f0-9]{64}/);
  assert.equal((await stat(join(folder,'.env'))).mode&0o777,0o600);
  assert.notEqual(spawnSync(process.execPath,[script]).status,0);
  assert.equal(await readFile(join(folder,'.env'),'utf8'),before);
});
