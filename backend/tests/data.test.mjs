import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {parseTimetableRows,excelMinutes}=require('../database/l0_axioms/timetableRows');
const {toAlgorithmFormat}=require('../database/l0_axioms/catalog');
const {readWorkbook}=require('../database/l1_building_blocks/readWorkbook');
const row={TERM:'2026-27 Sem 1','COURSE CODE':'TEST1001','CLASS SECTION':'1A','CLASS NUMBER':1,
  'START DATE':new Date('2026-09-01Z'),'END DATE':new Date('2026-09-30Z'),MON:'MON',WED:'WED',
  'START TIME':'09:00','END TIME':'10:00',INSTRUCTOR:'A; B'};
test('source parser expands multiple weekdays, deduplicates rows and preserves TBA',()=>{
  const parsed=parseTimetableRows([row,row,{...row,'CLASS SECTION':'1B','START TIME':'    '}]);
  assert.equal(parsed.sections.size,2); assert.equal([...parsed.sections.values()][0].meetings.size,2);
  assert.equal([...parsed.sections.values()][1].meetings.values().next().value[0],null);
  assert.equal(excelMinutes('   '),null);
  assert.throws(()=>parseTimetableRows([{...row,'END TIME':'08:00'}]),/row 2/);
});
test('database mapper keeps dates, instructors, unknown information and TBA',()=>{
  const courses=toAlgorithmFormat('T',[{course_code:'A',course_title:'A',credits:null}],
    [{section_id:1,course_code:'A',class_section:'1A',section_type:'CLASS'}],
    [{section_id:1,day_of_week:1,start_min:600,end_min:650,start_date:'2026-09-01',end_date:'2026-10-06'},
     {section_id:1,day_of_week:1,start_min:600,end_min:650,start_date:'2026-10-20',end_date:'2026-11-30'},
     {section_id:1,day_of_week:null,start_date:'2026-09-01',end_date:'2026-11-30'}],
    [{section_id:1,instructor_name:'Teacher A'},{section_id:1,instructor_name:'Teacher B'}]);
  assert.equal(courses[0].sections[0].meetings.length,2); assert.equal(courses[0].sections[0].tba.length,1);
  assert.equal(courses[0].credits,null); assert.equal(courses[0].sections[0].campus,null);
  assert.deepEqual(courses[0].sections[0].instructors,['Teacher A','Teacher B']);
});
test('complete supplied workbook reconciles to known source facts',async()=>{
  const parsed=parseTimetableRows(await readWorkbook(fileURLToPath(new URL('../../Database/2026-27 class_timetable_20260902.xlsx',import.meta.url))));
  assert.equal(parsed.stats.rows,28976); assert.equal(parsed.courses.size,5770); assert.equal(parsed.sections.size,8582);
  assert.equal(parsed.stats.multiDay,1147); assert.equal(parsed.stats.tba,1462);
  const comp=parsed.sections.get('2026-27-S1|COMP3322|1A');
  assert.equal(comp.meetings.size,4);
});
