import test from 'node:test';
import {assertApiResponse} from './apiContract.mjs';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import request from 'supertest';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {validateCourses,generateSchedules} from '../../scheduler/scheduler.js';
import {workbookWithHeader} from './workbookFixture.mjs';
const require=createRequire(import.meta.url);
const {readDbConfig}=require('../database/db');
const {migrate}=require('../database/migrate');
const {readWorkbook}=require('../database/l1_building_blocks/readWorkbook');
const {parseTimetableRows}=require('../database/l0_axioms/timetableRows');
const {importCatalog}=require('../database/l2_workflows/importCatalog');
const {createDatabase}=require('../database/public');
const {createApp}=require('../app');
const {readConfig}=require('../src/l1_building_blocks/config');

test('real MySQL lifecycle in a newly created disposable test database',async t=>{
  const base=readDbConfig(true),name=`hkuplanner_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
  const root=await mysql.createConnection(base);let admin,db,app;
  await root.query(`CREATE DATABASE ${mysql.escapeId(name)} CHARACTER SET utf8mb4`);
  t.after(async()=>{
    if(app)await app.locals.close();else if(db)await db.close();
    if(admin)await admin.end();
    // Only this run's freshly created database is removed; never reset the configured development database.
    await root.query(`DROP DATABASE ${mysql.escapeId(name)}`);
    await root.query(`REVOKE ALL PRIVILEGES ON ${mysql.escapeId(name)}.* FROM ${mysql.escape(process.env.DB_USER)}@'%'`);
    await root.end();
  });
  admin=await mysql.createConnection({...base,database:name});
  const legacySchema=await readFile(new URL('../../Database/schema.sql',import.meta.url),'utf8');
  for(const sql of legacySchema.split(';').filter(sql=>sql.trim()))await admin.query(sql);
  const beforeSchema=await Promise.all(['courses','sections','meetings','instructors'].map(async table=>(await admin.query(`SHOW CREATE TABLE ${table}`))[0]));
  await t.test('additive and repeated migrations are non-destructive',async()=>{
    assert.equal((await migrate(admin)).applied,true);assert.equal((await migrate(admin)).applied,false);
    const after=await Promise.all(['courses','sections','meetings','instructors'].map(async table=>(await admin.query(`SHOW CREATE TABLE ${table}`))[0]));
    assert.deepEqual(after,beforeSchema);
  });
  await root.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ${mysql.escapeId(name)}.* TO ${mysql.escape(process.env.DB_USER)}@'%'`);
  const pool=mysql.createPool({...readDbConfig(),database:name,connectionLimit:4});db=createDatabase(pool);
  const file=fileURLToPath(new URL('../../Database/2026-27 class_timetable_20260902.xlsx',import.meta.url));
  const parsed=parseTimetableRows(await readWorkbook(file));
  const hash=createHash('sha256').update(await readFile(file)).digest('hex');
  let originalIds,savedId,agent;
  const seed=parsed.sections.get('2026-27-S1|COMP3322|1A');
  await admin.execute("INSERT INTO courses(course_code,course_title) VALUES('COMP3322','Legacy title')");
  await admin.execute("INSERT INTO sections(section_id,class_number,term,course_code,class_section) VALUES(42,?,'2026-27 Sem 1','COMP3322','1A')",[seed.classNumber]);

  await t.test('full workbook imports with reconciled counts and foreign keys',async()=>{
    const counts=await importCatalog(admin,parsed,hash);
    assert.equal((await admin.query("SELECT section_id FROM sections WHERE course_code='COMP3322'"))[0][0].section_id,42);
    assert.deepEqual([counts.courses,counts.sections,counts.meetings,counts.instructors],[5770,8582,30562,9688]);
    const [[orphan]]=await admin.query('SELECT COUNT(*) AS n FROM meetings m LEFT JOIN sections s ON s.class_number=m.class_number AND s.term=m.term WHERE s.section_id IS NULL');
    assert.equal(orphan.n,0);assert.equal(await db.ready(),true);
    [originalIds]=await admin.query('SELECT section_id,term,course_code,class_section FROM sections ORDER BY section_id');
  });
  await t.test('runtime account cannot create tables',async()=>{
    await assert.rejects(pool.query('CREATE TABLE unauthorized_probe(id INT)'),error=>error.code==='ER_TABLEACCESS_DENIED_ERROR');
  });
  const config={...readConfig(),rateLimit:1000,generationRateLimit:1000};
  app=await createApp({db,config,logger:{info(){},error(){}}});agent=request.agent(app);
  await t.test('real HTTP catalogue lookup, search, unknown term and SQL-like strings',async()=>{
    const terms=assertApiResponse('get','/terms',await request(app).get('/api/terms').expect(200));assert.equal(terms.length,3);
    const rows=assertApiResponse('get','/courses',await request(app).get('/api/courses').query({term:'2026-27-S1',q:'comp33'}).expect(200));
    assert.ok(rows.some(c=>c.code==='COMP3322'));
    const result=assertApiResponse('get','/courses/{code}',await request(app).get('/api/courses/COMP3322').query({term:'2026-27-S1'}).expect(200));
    assert.equal(result.sections[0].meetings.length,4);assert.equal(result.credits,null);
    await request(app).get('/api/courses').query({term:'2026-27-S1',q:"' OR 1=1 --"}).expect(200,[]);
    await request(app).get('/api/courses').query({term:'2020-21-S1',q:'COMP'}).expect(404);
    await request(app).get('/api/courses').query({term:'2026-27-S1',q:'%'}).expect(200,[]);
  });
  await t.test('all three terms map to valid data and every single-course default result has real timed occurrences',async()=>{
    for(const term of await db.getTerms()) {
      const [rows]=await admin.execute('SELECT DISTINCT s.course_code FROM sections s JOIN backend_section_metadata b USING(section_id) WHERE s.term=? AND b.is_active=TRUE',[term.id]);
      const loaded=await db.getCoursesForScheduling(term.id,rows.map(r=>r.course_code));
      assert.deepEqual(validateCourses(loaded.courses,term.id),[]);
      for(const course of loaded.courses) {
        const result=generateSchedules([course],{term:term.id,maxResults:10000});
        assert.equal(result.searchComplete,true);
        for(const schedule of result.schedules) {
          assert.equal(schedule.fullyVerified,true);assert.equal(schedule.sections.length,1);
          const section=schedule.sections[0];assert.equal(section.courseCode,course.code);
          assert.ok(section.meetings.some(meeting=>{
            const first=new Date(`${meeting.startDate}T00:00:00Z`);
            first.setUTCDate(first.getUTCDate()+(meeting.day-(first.getUTCDay()||7)+7)%7);
            return first.toISOString().slice(0,10)<=meeting.endDate;
          }),`${term.id} ${course.code}:${section.id} has no timed occurrence`);
        }
      }
    }
  });
  await t.test('generation and guest CRUD round-trip through actual MySQL',async()=>{
    const result=assertApiResponse('post','/schedules/generate',await agent.post('/api/schedules/generate').send({term:'2026-27-S1',courseCodes:['COMP3322','COMP3230','MATH1013']}).expect(200));
    assert.ok(result.schedules.length>0);assert.equal(result.totalCredits,null);
    assertApiResponse('post','/guest-session',await agent.post('/api/guest-session').send({}).expect(201));
    const selection={term:'2026-27-S1',name:'Integration test',sectionKeys:result.schedules[0].sections.map(s=>`${s.courseCode}:${s.id}`)};
    const saved=assertApiResponse('post','/schedules',await agent.post('/api/schedules').send(selection).expect(201));savedId=saved.id;
    assert.equal((await agent.get(`/api/schedules/${savedId}`).expect(200)).body.schedule.id,result.schedules[0].id);
    assertApiResponse('put','/schedules/{id}',await agent.put(`/api/schedules/${savedId}`).send({name:'Renamed'}).expect(200));
    assertApiResponse('get','/schedules',await agent.get('/api/schedules').expect(200));
    assertApiResponse('post','/schedules/conflicts',await agent.post('/api/schedules/conflicts').send({term:selection.term,sectionKeys:selection.sectionKeys}).expect(200));
    const other=request.agent(app);await other.post('/api/guest-session').send({}).expect(201);
    assertApiResponse('get','/schedules/{id}',await other.get(`/api/schedules/${savedId}`).expect(404));await other.delete(`/api/schedules/${savedId}`).expect(404);
  });
  await t.test('repeated import preserves section IDs, enrichment, saved schedules and child counts',async()=>{
    await admin.execute("INSERT INTO backend_course_metadata(course_code,credits) VALUES('COMP3322',6)");
    const counts=await importCatalog(admin,parsed,hash);assert.equal(counts.meetings,30562);
    const [ids]=await admin.query('SELECT section_id,term,course_code,class_section FROM sections ORDER BY section_id');assert.deepEqual(ids,originalIds);
    await agent.get(`/api/schedules/${savedId}`).expect(200);
    const [[credit]]=await admin.query("SELECT credits FROM backend_course_metadata WHERE course_code='COMP3322'");assert.equal(credit.credits,6);
  });
  await t.test('reported missing course is excluded by default and explicit provisional saves remain labelled',async()=>{
    const input={term:'2026-27-S1',courseCodes:['COMP3322','ECON1210']};
    const normal=assertApiResponse('post','/schedules/generate',await agent.post('/api/schedules/generate').send(input).expect(200));
    assert.equal(normal.schedules.length,9);
    assert.ok(normal.schedules.every(s=>s.fullyVerified&&s.sections.length===2&&s.sections.every(section=>section.meetings.length)));
    const all=assertApiResponse('post','/schedules/generate',await agent.post('/api/schedules/generate').send({...input,includeUnknownTimes:true}).expect(200));
    assert.equal(all.schedules.length,10);
    const provisional=all.schedules.filter(s=>!s.fullyVerified);assert.equal(provisional.length,1);
    assert.deepEqual(provisional[0].unknownSectionKeys,['ECON1210:1B']);
    const pinned={...input,locked:{ECON1210:{CLASS:'1B'}}};
    assert.equal((await agent.post('/api/schedules/generate').send(pinned).expect(200)).body.schedules.length,0);
    const saved=(await agent.post('/api/schedules').send({term:input.term,name:'Provisional regression',
      sectionKeys:provisional[0].sections.map(s=>`${s.courseCode}:${s.id}`)}).expect(201)).body;
    const reopened=(await agent.get(`/api/schedules/${saved.id}`).expect(200)).body;
    assert.equal(reopened.schedule.fullyVerified,false);assert.deepEqual(reopened.schedule.unknownSectionKeys,['ECON1210:1B']);
    await agent.delete(`/api/schedules/${saved.id}`).expect(200);
  });
  await t.test('a renamed time header aborts before import and leaves all stored meetings intact',async()=>{
    const file=await workbookWithHeader(t,'START TIME','START_TIME');
    const [[before]]=await admin.query('SELECT MAX(import_id) AS revision FROM catalog_imports');
    await assert.rejects(async()=>importCatalog(admin,parseTimetableRows(await readWorkbook(file)),'invalid'),/Missing workbook column: START TIME/);
    const [[after]]=await admin.query('SELECT MAX(import_id) AS revision FROM catalog_imports');assert.deepEqual(after,before);
    const [[count]]=await admin.query('SELECT COUNT(*) AS n FROM meetings');assert.equal(count.n,30562);
    await agent.get(`/api/schedules/${savedId}`).expect(200);
  });
  await t.test('actual summer weekday/date mismatch cannot generate, save or claim a verified conflict check',async()=>{
    const term='2026-27 Sum Sem',courseCodes=['MMPH6173'],sectionKeys=['MMPH6173:SA'];
    for(const includeUnknownTimes of [false,true]) {
      const result=(await agent.post('/api/schedules/generate').send({term,courseCodes,includeUnknownTimes}).expect(200)).body;
      assert.equal(result.schedules.length,0);assert.match(result.warnings.join(' '),/weekday never occurs/);
    }
    await agent.post('/api/schedules').send({term,sectionKeys,name:'Invalid source dates'}).expect(400);
    await agent.post('/api/schedules/conflicts').send({term,sectionKeys}).expect(400);
  });
  await t.test('forced mid-import failure rolls back without DDL or loss of saved schedules',async()=>{
    const [[before]]=await admin.query('SELECT MAX(import_id) AS revision FROM catalog_imports');
    await assert.rejects(importCatalog(admin,parsed,hash,{afterSections:()=>{throw new Error('intentional rollback probe')}}),/intentional/);
    const [[after]]=await admin.query('SELECT MAX(import_id) AS revision FROM catalog_imports');assert.equal(after.revision,before.revision);
    const [[count]]=await admin.query('SELECT COUNT(*) AS n FROM backend_section_metadata WHERE is_active=TRUE');assert.equal(count.n,8582);
    await agent.get(`/api/schedules/${savedId}`).expect(200);
  });
  await t.test('ambiguous class-number changes fail without changing legacy links or saves',async()=>{
    const changed=structuredClone(parsed);
    changed.sections.get('2026-27-S1|COMP3322|1A').classNumber=999999;
    const [[before]]=await admin.query('SELECT MAX(import_id) AS revision FROM catalog_imports');
    await assert.rejects(importCatalog(admin,changed,hash),/Class number changed/);
    const [[after]]=await admin.query('SELECT MAX(import_id) AS revision FROM catalog_imports');
    assert.equal(before.revision,after.revision);
    await agent.get(`/api/schedules/${savedId}`).expect(200);
  });
  await t.test('removed sections produce a stale-save response; expired sessions cannot read',async()=>{
    await admin.query("UPDATE backend_section_metadata b JOIN sections s USING(section_id) SET b.is_active=FALSE WHERE s.course_code='COMP3322'");
    await agent.get(`/api/schedules/${savedId}`).expect(409);
    await admin.query('UPDATE guest_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND)');
    await agent.get('/api/schedules').expect(401);
  });
});
