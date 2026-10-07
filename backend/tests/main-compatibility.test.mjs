import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createRequire} from 'node:module';
import {fakeDatabase} from './fakeDatabase.mjs';
import {toFullCalendarEvents} from '../../scheduler/export.js';
import {courses} from './fixtures.mjs';
const require=createRequire(import.meta.url);
const {createApp}=require('../app');
const {readConfig}=require('../src/l1_building_blocks/config');
test('merged frontend can browse without q and use legacy or canonical terms',async t=>{
  const app=await createApp({db:fakeDatabase(),config:readConfig({CURSOR_SECRET:'a'.repeat(40)}),logger:{info(){},error(){}}});
  t.after(()=>app.locals.close());
  await request(app).get('/api/health').expect(200,{status:'ok'});
  for(const term of ['2026-27-S1','2026-27 Sem 1']) {
    const rows=(await request(app).get('/api/courses').query({term}).expect(200)).body;
    assert.equal(rows.length,2);
  }
});
test('FullCalendar export retains frontend section-pinning properties',()=>{
  const s={...courses[0].sections[0],courseCode:'COMP3322'};
  const [event]=toFullCalendarEvents({sections:[s]});
  assert.equal(event.extendedProps.courseCode,'COMP3322');assert.equal(event.extendedProps.sectionId,'1A');
  assert.equal(event.title,'COMP3322 1A');assert.equal(event.color,'#bed8b5');
});
