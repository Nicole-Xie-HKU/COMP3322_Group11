import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createRequire} from 'node:module';
import {fakeDatabase} from './fakeDatabase.mjs';
import {term,course} from './fixtures.mjs';
const require=createRequire(import.meta.url);
const {createApp}=require('../app');
const {readConfig}=require('../src/l1_building_blocks/config');
async function setup(t,overrides={}) {
  const db=fakeDatabase(),config={...readConfig({CURSOR_SECRET:'a'.repeat(40)}),...overrides};
  const app=await createApp({db,config,logger:{info(){},error(){}}});t.after(()=>app.locals.close());return {db,app,agent:request.agent(app)};
}
const selection={term,sectionKeys:['COMP3322:1A','COMP3230:1A'],name:'My schedule'};
test('live/readiness, catalogue and detail routes work with normalized terms',async t=>{
  const {app,db}=await setup(t);await request(app).get('/api/health/live').expect(200);await request(app).get('/api/health/ready').expect(200);
  assert.equal((await request(app).get('/api/terms').expect(200)).body[0].id,term);
  assert.equal((await request(app).get('/api/courses').query({term,q:'comp33'}).expect(200)).body[0].code,'COMP3322');
  const detail=(await request(app).get('/api/courses/comp3322').query({term:'2026-27 Sem 1'}).expect(200)).body;
  assert.equal(detail.sections.length,2);assert.equal(detail.credits,null);
  db.unavailable=true;await request(app).get('/api/health/ready').expect(503);
});
test('malformed requests, missing resources, JSON failures and body limits have explicit errors',async t=>{
  const {app,db}=await setup(t);
  for(const url of ['/api/courses','/api/courses?term=bad&q=test'])await request(app).get(url).expect(400);
  await request(app).get('/api/courses/X').query({term}).expect(404);
  await request(app).get('/api/courses').query({term:'2027-28-S1',q:'x'}).expect(404);
  await request(app).post('/api/schedules/generate').send({term,courseCodes:['X']}).expect(404);
  db.courses.push(course('NONE1001',[]));
  const missing=await request(app).post('/api/schedules/generate').send({term,courseCodes:['NONE1001']}).expect(400);
  assert.equal(missing.body.error.code,'COURSE_NOT_OFFERED');
  await request(app).post('/api/schedules/generate').set('Content-Type','application/json').send('{').expect(400);
  await request(app).post('/api/schedules/generate').send({text:'x'.repeat(70000)}).expect(413);
});
test('generation uses real worker, signed pagination, v3 locks and stale-cursor rejection',async t=>{
  const {app,db}=await setup(t),input={term,courseCodes:['COMP3322','COMP3230'],maxResults:1};
  const first=(await request(app).post('/api/schedules/generate').send(input).expect(200)).body;
  assert.equal(first.truncated,true);assert.equal(first.totalExact,false);assert.ok(first.nextCursor);
  let cursor=first.nextCursor;const ids=[first.schedules[0].id];
  while(cursor){const page=(await request(app).post('/api/schedules/generate').send({...input,cursor}).expect(200)).body;ids.push(...page.schedules.map(s=>s.id));cursor=page.nextCursor;}
  assert.equal(new Set(ids).size,4);
  const locked=(await request(app).post('/api/schedules/generate').send({...input,locked:{COMP3322:'1B'}}).expect(200)).body;
  assert.ok(locked.schedules.every(s=>s.sections.find(s=>s.courseCode==='COMP3322').id==='1B'));
  await request(app).post('/api/schedules/generate').send({...input,cursor:first.nextCursor+'z'}).expect(400);
  db.revision++;const stale=await request(app).post('/api/schedules/generate').send({...input,cursor:first.nextCursor}).expect(409);assert.equal(stale.body.error.code,'CURSOR_STALE');
});
test('conflicts are determined from server data, not client-provided times',async t=>{
  const {app}=await setup(t);
  const result=await request(app).post('/api/schedules/conflicts').send({...selection,name:undefined}).expect(200);
  assert.deepEqual(result.body.conflicts,[]);
  await request(app).post('/api/schedules/conflicts').send({...selection,name:undefined,sections:[]}).expect(400);
  await request(app).post('/api/schedules/generate').send({term,courseCodes:['COMP3322'],locked:{COMP3322:'BAD'}}).expect(400);
});
test('guest session owns CRUD; cookie loss and other guests do not grant access',async t=>{
  const {app,agent}=await setup(t);
  await agent.post('/api/schedules').send(selection).expect(401);
  const session=await agent.post('/api/guest-session').send({}).expect(201);
  assert.match(session.headers['set-cookie'][0],/HttpOnly/);assert.match(session.headers['set-cookie'][0],/SameSite=Lax/);
  const saved=(await agent.post('/api/schedules').send(selection).expect(201)).body;
  assert.equal(saved.schedule.sections.length,2);
  await agent.post('/api/guest-session').send({}).expect(200);
  assert.equal((await agent.get('/api/schedules').expect(200)).body.length,1);
  const other=request.agent(app);await other.post('/api/guest-session').send({}).expect(201);
  await other.get(`/api/schedules/${saved.id}`).expect(404);await other.put(`/api/schedules/${saved.id}`).send({name:'steal'}).expect(404);
  await other.delete(`/api/schedules/${saved.id}`).expect(404);
  assert.equal((await agent.put(`/api/schedules/${saved.id}`).send({name:'Renamed'}).expect(200)).body.name,'Renamed');
  await agent.delete(`/api/schedules/${saved.id}`).expect(200);await agent.get(`/api/schedules/${saved.id}`).expect(404);
});
test('expired sessions and stale catalogue selections fail safely',async t=>{
  const {agent,db}=await setup(t);await agent.post('/api/guest-session').send({}).expect(201);
  const saved=(await agent.post('/api/schedules').send(selection).expect(201)).body;
  db.courses[0].sections=db.courses[0].sections.filter(s=>s.id!=='1A');
  const stale=await agent.get(`/api/schedules/${saved.id}`).expect(409);assert.equal(stale.body.error.code,'SAVED_SCHEDULE_STALE');
  for(const session of db.sessions.values())session.expired=true;
  await agent.get('/api/schedules').expect(401);
});
test('CORS, cross-site writes and rate limiting reject requests',async t=>{
  const {app}=await setup(t,{rateLimit:6});
  await request(app).post('/api/guest-session').set('Origin','https://evil.invalid').send({}).expect(403);
  await request(app).post('/api/guest-session').set('Sec-Fetch-Site','cross-site').send({}).expect(403);
  const ok=await request(app).get('/api/terms').set('Origin','http://localhost:5173').expect(200);
  assert.equal(ok.headers['access-control-allow-origin'],'http://localhost:5173');
  for(let i=0;i<4;i++)await request(app).get('/api/terms');await request(app).get('/api/terms').expect(429);
});
test('unknown frontend API can be adapted through a configurable prefix',async t=>{
  const {app}=await setup(t,{apiPrefix:'/future-api'});
  await request(app).get('/future-api/terms').expect(200);await request(app).get('/api/terms').expect(404);
});
test('production cookies are private and stored tokens are hashes, not bearer values',async t=>{
  const {app,db}=await setup(t,{production:true,allowedOrigins:['https://hkuplan.example'],publicOrigin:'https://hkuplan.example'});
  const response=await request(app).post('/api/guest-session').set('Origin','https://hkuplan.example').send({}).expect(201);
  const cookie=response.headers['set-cookie'][0],raw=cookie.match(/hkuplan_guest=([^;]+)/)[1];
  assert.match(cookie,/; Secure/);assert.match(cookie,/; HttpOnly/);assert.match(cookie,/Path=\/api/);
  assert.equal(raw.length,43);assert.equal([...db.sessions.keys()][0].length,64);assert.equal(db.sessions.has(raw),false);
});
test('unexpected database errors do not expose SQL or internal messages',async t=>{
  const {app,db}=await setup(t);
  db.getTerms=async()=>{throw Object.assign(new Error('SELECT private_internal_value FROM secret_table'),{code:'ER_BAD_FIELD_ERROR'})};
  const response=await request(app).get('/api/terms').expect(500);
  assert.equal(response.body.error.code,'INTERNAL_ERROR');assert.ok(response.body.requestId);
  assert.doesNotMatch(JSON.stringify(response.body),/private_internal_value|secret_table|SELECT/);
});
