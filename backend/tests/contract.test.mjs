import test from 'node:test';
import assert from 'node:assert/strict';
import SwaggerParser from '@apidevtools/swagger-parser';
import {fileURLToPath} from 'node:url';
import {createHkuplanClient,HkuplanApiError} from '../client/hkuplan-api.js';

test('OpenAPI contract is structurally valid and documents every maintained route',async()=>{
  const spec=await SwaggerParser.validate(fileURLToPath(new URL('../docs/openapi.json',import.meta.url)));
  assert.equal(Object.keys(spec.paths).length,11);
  assert.ok(spec.paths['/guest-session'].post.responses[200]);
  assert.ok(spec.paths['/schedules/generate'].post.responses[409]);
});
test('frontend client maps GET/POST/PUT/DELETE, query encoding, cookies and cancellation',async()=>{
  const calls=[],controller=new AbortController();
  const api=createHkuplanClient({baseUrl:'/future-api/',fetchImpl:async(url,options)=>{
    calls.push({url,...options});return {ok:true,status:200,json:async()=>({ok:true})};
  }});
  await api.getTerms({signal:controller.signal});
  await api.searchCourses({term:'2026-27-S1',q:'web & database',limit:undefined});
  await api.getCourse('COMP/3322','2026-27-S1');
  await api.generateSchedules({term:'2026-27-S1',courseCodes:['COMP3322']});
  await api.checkConflicts({term:'2026-27-S1',sectionKeys:['COMP3322:1A']});
  await api.startGuestSession();await api.listSchedules();await api.saveSchedule({name:'My plan'});
  await api.getSchedule(7);await api.updateSchedule(7,{name:'Renamed'});await api.deleteSchedule(7);
  assert.deepEqual(calls.map(c=>c.method),['GET','GET','GET','POST','POST','POST','GET','POST','GET','PUT','DELETE']);
  assert.ok(calls.every(c=>c.credentials==='include'));assert.equal(calls[0].signal,controller.signal);
  assert.equal(new URL(calls[1].url,'http://localhost').searchParams.get('q'),'web & database');
  assert.match(calls[2].url,/COMP%2F3322/);assert.equal(calls[3].headers['Content-Type'],'application/json');
  assert.deepEqual(JSON.parse(calls[9].body),{name:'Renamed'});assert.equal(calls[10].url,'/future-api/schedules/7');
});
test('frontend client exposes safe server errors and rejects non-JSON responses',async()=>{
  const api=createHkuplanClient({fetchImpl:async()=>({ok:false,status:409,json:async()=>({error:{code:'CURSOR_STALE',message:'Restart',details:{field:'cursor'}},requestId:'test-id'})})});
  await assert.rejects(api.getTerms(),error=>error instanceof HkuplanApiError&&error.status===409&&error.code==='CURSOR_STALE'&&error.requestId==='test-id');
  const invalid=createHkuplanClient({fetchImpl:async()=>({ok:true,status:200,json:async()=>{throw new Error('Not JSON')}})});
  await assert.rejects(invalid.getTerms(),error=>error.code==='INVALID_RESPONSE');
});
