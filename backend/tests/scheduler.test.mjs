import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSchedules,meetingsOverlap,seatStatus,validateCourses } from '../../scheduler/scheduler.js';
import { toFullCalendarEvents } from '../../scheduler/export.js';
import { term,meeting,course,section,courses } from './fixtures.mjs';
function enumerate(input,maxResults=1,maxNodes=500000,extra={}) {
  const ids=[]; let state, result; let pages=0;
  do {
    result=generateSchedules(input,{term,maxResults,maxNodes,...extra,state});
    ids.push(...result.schedules.map(s=>s.id)); state=result.continuation;
    assert.ok(++pages<10000,'pagination must terminate');
  } while (state);
  assert.equal(result.total,ids.length); assert.equal(result.totalExact,true);
  return ids;
}
test('adjacent classes, date-disjoint ranges and weekday-free intersection do not conflict',()=>{
  assert.equal(meetingsOverlap(meeting(),meeting(1,650,700)),false);
  assert.equal(meetingsOverlap(meeting(1,600,650,{endDate:'2026-09-07'}),meeting(1,600,650,{startDate:'2026-09-08'})),false);
  assert.equal(meetingsOverlap(meeting(1,600,650,{startDate:'2026-09-01',endDate:'2026-09-04'}),meeting()),false);
  assert.equal(meetingsOverlap(meeting(),meeting(1,640,700)),true);
});
test('pagination enumerates every distinct same-time subclass exactly once',()=>{
  const input=[course('A',[section('1',[meeting()]),section('2',[meeting()])]),courses[1]];
  const ids=enumerate(input); assert.equal(ids.length,4); assert.equal(new Set(ids).size,4);
  const first=generateSchedules(input,{term,maxResults:1});
  assert.equal(first.truncated,true); assert.equal(first.totalExact,false); assert.equal(first.schedules.length,1);
});
test('node-budget continuation does not incorrectly declare no solution',()=>{
  const first=generateSchedules(courses,{term,maxResults:100,maxNodes:1});
  assert.equal(first.total,0); assert.equal(first.searchComplete,false); assert.equal(first.diagnosis,undefined);
  assert.equal(enumerate(courses,1,1).length,4);
});
test('unknown credits/seats and TBA remain explicitly unknown',()=>{
  const input=[course('A',[section('1',[],{tba:[{startDate:'2026-09-01',endDate:'2026-11-30'}]})])];
  const result=generateSchedules(input,{term});
  assert.equal(result.totalCredits,null); assert.equal(result.hasUnknownTimes,true); assert.equal(seatStatus(input[0].sections[0]),'unknown');
  assert.equal(generateSchedules(input,{term,seatPolicy:'openOnly'}).total,0);
  assert.equal(generateSchedules([{...input[0],credits:6,creditsKnown:false}],{term}).totalCredits,null);
});
test('v3 string locks and v2 actual lecture parents both work',()=>{
  assert.deepEqual(enumerate(courses,10,500000,{locked:{COMP3322:'1B'}}).length,2);
  const input=[{code:'A',credits:6,offerings:[{term,sections:[
    section('L1',[meeting()],{type:'LEC'}),section('L2',[meeting()],{type:'LEC'}),
    section('T1',[meeting(2)],{type:'TUT',parent:'L1'}),section('T2',[meeting(3)],{type:'TUT',parent:'L2'})]}]}];
  assert.deepEqual(enumerate(input).sort(),['A:L1,A:T1','A:L2,A:T2']);
});
test('TBA and known meetings validate; malformed dates/times are rejected',()=>{
  assert.deepEqual(validateCourses(courses),[]);
  assert.ok(validateCourses([course('A',[section('1',[meeting(9)])])]).length);
  assert.ok(validateCourses([course('A',[section('1',[meeting(1,700,600)])])]).length);
  assert.ok(validateCourses([course('A',[section('1',[meeting(1,600,650,{startDate:'2026-02-30'})])])]).length);
});
test('FullCalendar preserves reading-week gaps, unique IDs and inclusive final teaching day',()=>{
  const schedule={sections:[{...section('1A',[
    meeting(2,720,830,{startDate:'2026-09-01',endDate:'2026-10-06'}),
    meeting(2,720,830,{startDate:'2026-10-20',endDate:'2026-11-24'})]),courseCode:'COMP3322'}]};
  const events=toFullCalendarEvents(schedule);
  assert.equal(events.length,2); assert.notEqual(events[0].id,events[1].id);
  assert.equal(events[0].endRecur,'2026-10-07'); assert.equal(events[1].startRecur,'2026-10-20');
  assert.equal(events[1].endRecur,'2026-11-25');
});
test('input is not mutated; empty/unoffered courses never become an empty valid timetable',()=>{
  const before=JSON.stringify(courses); enumerate(courses); assert.equal(JSON.stringify(courses),before);
  assert.equal(generateSchedules([],{term}).total,0);
  assert.equal(generateSchedules([course('X',[])],{term}).total,0);
});
test('paginated backtracking matches independent brute-force enumeration on 40 generated fixtures',()=>{
  let seed=27; const random=()=> (seed=(seed*16807)%2147483647)/2147483647;
  for(let trial=0;trial<40;trial++) {
    const input=Array.from({length:3},(_,c)=>course(`C${c}`,Array.from({length:3},(_,s)=>section(`${s}`,
      [meeting(1+Math.floor(random()*3),Math.floor(random()*4)*60,Math.floor(random()*4)*60)]))));
    for(const c of input)for(const s of c.sections)s.meetings[0].end=s.meetings[0].start+60;
    const expected=[];
    for(const a of input[0].sections)for(const b of input[1].sections)for(const c of input[2].sections){
      const selected=[a,b,c]; let conflict=false;
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
        const x=selected[i].meetings[0],y=selected[j].meetings[0];
        if(x.day===y.day && Math.max(x.start,y.start)<Math.min(x.end,y.end))conflict=true;
      }
      if(!conflict)expected.push(`C0:${a.id},C1:${b.id},C2:${c.id}`);
    }
    assert.deepEqual(enumerate(input,2,3).sort(),expected.sort());
  }
});

test('overlapping source ranges are flagged instead of silently dropping a section',()=>{
  const bad=course('RECO3039',[section('1A',[meeting(3,660,770),meeting(3,660,770,{startDate:'2026-11-04',endDate:'2026-11-04',venue:'Other room'})])]);
  const result=generateSchedules([bad],{term});
  assert.equal(result.schedules.length,0);assert.equal(result.searchComplete,true);
  assert.ok(result.warnings.some(warning=>warning.includes('overlapping source meetings')&&warning.includes('RECO3039:1A')));
});
