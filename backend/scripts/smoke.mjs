import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../..',import.meta.url)));
const base=`http://127.0.0.1:${process.env.PORT||3001}${process.env.API_PREFIX||'/api'}`;
if(process.argv.includes('--restart')&&!process.env.COMPOSE_PROJECT_NAME)throw new Error('Set COMPOSE_PROJECT_NAME to the isolated test project before restarting services');
let cookie='',savedId;
async function call(path,{method='GET',body,status=200,authenticated=true}={}) {
  const response=await fetch(base+path,{method,signal:AbortSignal.timeout(15000),headers:{
    ...(cookie&&authenticated?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.equal(response.status,status,`${method} ${path}: unexpected HTTP status`);
  const setCookie=response.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
  return response.json();
}
async function waitUntilReady() {
  for(let attempt=0;attempt<60;attempt++) {
    try { await call('/health/ready');return; } catch { await delay(1000); }
  }
  throw new Error('Backend did not become ready within 60 attempts');
}
function compose(...args) { execFileSync('docker',['compose','-p',process.env.COMPOSE_PROJECT_NAME,...args],{stdio:'ignore',timeout:120000}); }
try {
  await waitUntilReady();await call('/health/live');
  const terms=await call('/terms');assert.equal(terms.length,3);
  const term='2026-27-S1';
  const hits=await call(`/courses?term=${term}&q=comp33`);assert.ok(hits.some(c=>c.code==='COMP3322'));
  const course=await call(`/courses/COMP3322?term=${term}`);assert.equal(course.credits,null);assert.equal(course.sections[0].meetings.length,4);
  const result=await call('/schedules/generate',{method:'POST',body:{term,courseCodes:['COMP3322','COMP3230','MATH1013']}});
  assert.ok(result.schedules.length>0);assert.equal(result.totalCredits,null);
  await call('/guest-session',{method:'POST',body:{},status:201});
  const keys=result.schedules[0].sections.map(s=>`${s.courseCode}:${s.id}`);
  const saved=await call('/schedules',{method:'POST',body:{term,name:`Smoke ${Date.now()}`,sectionKeys:keys},status:201});savedId=saved.id;
  const conflicts=await call('/schedules/conflicts',{method:'POST',body:{term,sectionKeys:keys}});assert.equal(conflicts.conflicts.length,0);
  if(process.argv.includes('--restart')) {
    // Explicit opt-in only. Restart the isolated services, never remove a database or volume.
    compose('stop','mysql');
    try { await call('/health/live');await call('/health/ready',{status:503}); }
    finally { compose('start','mysql'); }
    await waitUntilReady();compose('restart','app');await waitUntilReady();
  }
  const restored=await call(`/schedules/${savedId}`);assert.deepEqual(restored.sectionKeys,keys);
  await call(`/schedules/${savedId}`,{method:'PUT',body:{name:'Smoke renamed'}});
  assert.ok((await call('/schedules')).some(s=>s.id===savedId));
  await call(`/schedules/${savedId}`,{authenticated:false,status:401});
  console.log(JSON.stringify({status:'passed',terms:terms.length,generated:result.returnedCount,
    guestCrud:true,restartPersistence:process.argv.includes('--restart')}));
} finally {
  if(savedId)await call(`/schedules/${savedId}`,{method:'DELETE'});
}
