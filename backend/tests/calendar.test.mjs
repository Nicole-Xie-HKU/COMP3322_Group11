import test from 'node:test';
import assert from 'node:assert/strict';
import {toICS,toFullCalendarEvents} from '../../scheduler/scheduler.js';
import {meeting,section} from './fixtures.mjs';
const schedule=meetings=>({sections:[{...section('1A',meetings),courseCode:'COMP3322'}]});
const unfold=text=>text.replace(/\r\n[ \t]/g,'');
const uids=text=>[...unfold(text).matchAll(/^UID:(.+)$/gm)].map(match=>match[1].trim());

test('split teaching ranges retain four stable, distinct calendar series',()=>{
  const meetings=[1,2].flatMap(day=>[
    meeting(day,600,650,{startDate:'2026-09-01',endDate:'2026-10-06'}),
    meeting(day,600,650,{startDate:'2026-10-20',endDate:'2026-11-30'}),
  ]);
  const input=schedule(meetings),ics=toICS(input);
  assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,4);assert.equal(new Set(uids(ics)).size,4);
  assert.deepEqual(uids(toICS(input)),uids(ics));
  assert.equal(uids(toICS(schedule([...meetings,meetings[0]]))).length,4);
  assert.equal(new Set(toFullCalendarEvents(input).map(event=>event.id)).size,4);
  assert.equal(toFullCalendarEvents(input)[0].endRecur,'2026-10-07');
});
test('calendar export preserves Hong Kong times, inclusive dates and safe folded text',()=>{
  const venue='Room; A, B\\C\n'+ 'é'.repeat(80);
  const output=toICS(schedule([meeting(2,30,90,{startDate:'2026-09-01',endDate:'2026-09-01',venue})]));
  const text=unfold(output);
  assert.match(text,/DTSTART:20260831T163000Z/);assert.match(text,/DTEND:20260831T173000Z/);
  assert.match(text,/UNTIL=20260901T155959Z/);
  assert.ok(text.includes('LOCATION:Room\\; A\\, B\\\\C\\n'+'é'.repeat(80)));
  assert.ok(output.endsWith('END:VCALENDAR\r\n'));
  for(const line of output.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
});
test('calendar skips ranges without an occurrence and rejects missing or invalid dates/times',()=>{
  assert.equal(uids(toICS(schedule([meeting(1,600,650,{startDate:'2026-09-01',endDate:'2026-09-01'})]))).length,0);
  assert.throws(()=>toICS(schedule([meeting(1,600,650,{startDate:null,endDate:null})])),/teaching dates/);
  assert.throws(()=>toICS(schedule([meeting(1,700,650)])),/meeting times/);
  assert.equal(uids(toICS(schedule([]))).length,0);
});
