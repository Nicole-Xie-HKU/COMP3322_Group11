import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {term} from './fixtures.mjs';

// A real watched process is required: ordinary unit tests never see Node's watch messages.
test('watched HTTP server generates real worker schedules and rejects invalid input',{timeout:30000},async t=>{
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const child=spawn(process.execPath,['--watch',fileURLToPath(new URL('./fixtures/watch-http.mjs',import.meta.url))],
    {env,stdio:['ignore','pipe','pipe']});
  const exited=once(child,'exit');let diagnostics='';
  child.stderr.on('data',chunk=>{diagnostics+=chunk;});
  t.after(async()=>{
    if(child.exitCode!==null||child.signalCode!==null)return;
    child.kill('SIGTERM');
    const deadline=setTimeout(()=>child.kill('SIGKILL'),5000).unref();
    try {await exited;} finally {clearTimeout(deadline);}
  });
  const base=await new Promise((resolve,reject)=>{
    let output='';
    const deadline=setTimeout(()=>reject(new Error(`Watched server did not start: ${diagnostics}`)),20000);
    const cleanup=()=>{clearTimeout(deadline);child.stdout.off('data',read);child.off('error',fail);child.off('exit',ended);};
    const fail=error=>{cleanup();reject(error);};
    const ended=code=>fail(new Error(`Watched server exited ${code}: ${diagnostics}`));
    function read(chunk) {
      output+=chunk;
      const match=output.match(/\{"url":"([^"\n]+)"\}/);
      if(match){cleanup();resolve(match[1]);}
    }
    child.stdout.on('data',read);child.once('error',fail);child.once('exit',ended);
  });
  async function generate(body) {
    return fetch(`${base}/api/schedules/generate`,{method:'POST',signal:AbortSignal.timeout(10000),
      headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  }
  for(let attempt=0;attempt<2;attempt++) {
    const response=await generate({term,courseCodes:['COMP3322','COMP3230']});
    const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
    assert.equal(result.schedules.length,4);
    assert.ok(result.schedules.every(schedule=>schedule.sections.length===2));
  }
  assert.equal((await generate({term,courseCodes:[]})).status,400);
});
