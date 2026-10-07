import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createRequire} from 'node:module';
import {generateSchedules,meetingCompleteness} from '../../scheduler/scheduler.js';
import {fakeDatabase} from './fakeDatabase.mjs';
import {term,course,section,meeting} from './fixtures.mjs';
const require=createRequire(import.meta.url);
const {createApp}=require('../app');
const {readConfig}=require('../src/l1_building_blocks/config');
const unknown=section('1B',[],{tba:[{startDate:'2026-09-01',endDate:'2026-11-30'}]});

test('unknown-time alternatives require opt-in and completeness belongs to each result',()=>{
  const courses=[course('TEST1001',[section('1A',[meeting()]),unknown])];
  const normal=generateSchedules(courses,{term});
  assert.equal(normal.schedules.length,1);assert.equal(normal.hasUnknownTimes,true);
  assert.equal(normal.schedules[0].fullyVerified,true);
  assert.deepEqual(normal.schedules[0].unknownSectionKeys,[]);
  const provisional=generateSchedules(courses,{term,includeUnknownTimes:true});
  assert.equal(provisional.schedules.length,2);
  assert.equal(provisional.schedules[1].fullyVerified,false);
  assert.deepEqual(provisional.schedules[1].unknownSectionKeys,['TEST1001:1B']);
});
test('TBA-only, mixed timed/TBA and empty sections cannot produce ordinary results',()=>{
  for(const candidate of [unknown,section('1C',[meeting()],{tba:[{}]}),section('1D')]) {
    const courses=[course('TEST1001',[candidate])];
    const normal=generateSchedules(courses,{term});
    assert.equal(normal.schedules.length,0);assert.match(normal.diagnosis[0].message,/provisional/);
    const provisional=generateSchedules(courses,{term,includeUnknownTimes:true});
    assert.equal(provisional.schedules.length,1);assert.equal(provisional.schedules[0].fullyVerified,false);
  }
  assert.equal(meetingCompleteness([{...section('1A',[meeting()],{tba:true}),courseCode:'LEGACY'}]).fullyVerified,false);
});
test('a weekday outside its date range is invalid, not an opt-in provisional result',()=>{
  const bad=course('TEST1001',[section('1A',[meeting(1,600,650,{startDate:'2026-09-01',endDate:'2026-09-01'})])]);
  for(const includeUnknownTimes of [false,true]) {
    const result=generateSchedules([bad],{term,includeUnknownTimes});
    assert.equal(result.schedules.length,0);assert.match(result.warnings.join(' '),/weekday never occurs/);
  }
});
test('typed locks, partial weights, policy-bound cursors and saved provisional results use real routes',async t=>{
  const db=fakeDatabase();db.courses[0].sections.push({...unknown,id:'1C'});
  const config={...readConfig({CURSOR_SECRET:'x'.repeat(40)}),generationRateLimit:100};
  const app=await createApp({db,config,logger:{info(){},error(){}}});t.after(()=>app.locals.close());
  const input={term,courseCodes:['COMP3322']};
  const locked=(await request(app).post('/api/schedules/generate')
    .send({...input,locked:{COMP3322:{CLASS:'1A'}},prefs:{weights:{morning:10}}}).expect(200)).body;
  assert.equal(locked.schedules.length,1);assert.equal(locked.schedules[0].sections[0].id,'1A');
  for(const extra of [{locked:{COMP3322:{INVALID:'1A'}}},{prefs:{weights:{invalid:10}}},{includeUnknownTimes:'yes'}]) {
    await request(app).post('/api/schedules/generate').send({...input,...extra}).expect(400);
  }
  const first=(await request(app).post('/api/schedules/generate').send({...input,maxResults:1}).expect(200)).body;
  assert.ok(first.nextCursor);
  await request(app).post('/api/schedules/generate')
    .send({...input,maxResults:1,includeUnknownTimes:true,cursor:first.nextCursor}).expect(409);
  const agent=request.agent(app);await agent.post('/api/guest-session').send({}).expect(201);
  // Save a TBA-only choice directly, as an older client or existing save may do.
  const saved=(await agent.post('/api/schedules')
    .send({term,name:'Provisional',sectionKeys:['COMP3322:1C']}).expect(201)).body;
  const reopened=(await agent.get(`/api/schedules/${saved.id}`).expect(200)).body;
  assert.equal(reopened.schedule.fullyVerified,false);
  assert.deepEqual(reopened.schedule.unknownSectionKeys,['COMP3322:1C']);
  const changed=db.courses[0].sections.find(s=>s.id==='1C');
  changed.tba=[];changed.meetings=[meeting(1,600,650,{startDate:'2026-09-01',endDate:'2026-09-01'})];
  await agent.get(`/api/schedules/${saved.id}`).expect(409);
  const invalid=await agent.post('/api/schedules').send({term,name:'Invalid',sectionKeys:['COMP3322:1C']}).expect(400);
  assert.equal(invalid.body.error.code,'INVALID_MEETING_DATES');
});
