import test from 'node:test';
import assert from 'node:assert/strict';
import {toPrintRows,toCSV} from '../../scheduler/export.js';
import {meeting,section} from './fixtures.mjs';
test('print rows retain date ranges and TBA sections rather than silently omitting them',()=>{
  const rows=toPrintRows({sections:[{...section('1A',[meeting()]),courseCode:'COMP3322',courseTitle:'Web',seat:'unknown'},
    {...section('1B',[],{tba:[{startDate:'2026-09-01',endDate:'2026-10-01',venue:null}]}),courseCode:'TEST1001',courseTitle:'TBA'}]});
  assert.equal(rows.length,2);assert.equal(rows[0].startDate,'2026-09-01');
  assert.equal(rows[1].time,'TBA');assert.equal(rows[1].seat,'Unknown');
});
test('CSV quotes fields, preserves Unicode and neutralizes source formula strings',()=>{
  const csv=toCSV({sections:[{...section('1A',[meeting()]),courseCode:'COMP3322',courseTitle:'=1+1',instructor:'Doe, "Jane"'}]});
  assert.match(csv,/"'=1\+1"/);assert.match(csv,/"Doe, ""Jane"""/);assert.ok(csv.startsWith('\ufeff'));assert.match(csv,/Mon/);
});
