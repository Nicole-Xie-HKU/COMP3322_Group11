const legacyTerm = value => value.replace('-S1',' Sem 1').replace('-S2',' Sem 2').replace('-SU',' Sum Sem');
const identity = s => `${s.term}|${s.course_code}|${s.class_section}`;
async function bulk(connection,sql,rows) {
  for (let i=0;i<rows.length;i+=1000) await connection.query(sql,[rows.slice(i,i+1000)]);
}
async function writeCatalog(connection,parsed) {
  const terms = [...parsed.terms.values()];
  await bulk(connection,`INSERT INTO terms(term_id,term_name,start_date,end_date,sort_order) VALUES ?
    ON DUPLICATE KEY UPDATE start_date=VALUES(start_date),end_date=VALUES(end_date)`,
  terms.map(t=>[legacyTerm(t.id),t.name,t.startDate,t.endDate,0]));
  await bulk(connection,`INSERT INTO courses(course_code,course_title,offer_dept,acad_career) VALUES ?
    ON DUPLICATE KEY UPDATE course_title=VALUES(course_title),offer_dept=VALUES(offer_dept),acad_career=VALUES(acad_career)`,[...parsed.courses.values()]);
  const [existing] = await connection.query('SELECT * FROM sections WHERE term IN (?)',[terms.map(t=>legacyTerm(t.id))]);
  const byKey = new Map(existing.map(s=>[identity(s),s]));
  if (byKey.size!==existing.length) throw new Error('Duplicate term/course/section identity; reconcile before importing');
  const byNumber = new Map(existing.map(s=>[`${s.term}|${s.class_number}`,identity(s)]));
  const seenNumbers = new Set(), writes=[];
  for (const s of parsed.sections.values()) {
    const term=legacyTerm(s.term), key=`${term}|${s.code}|${s.section}`, number=`${term}|${s.classNumber}`;
    if (!Number.isInteger(s.classNumber) || s.classNumber<=0 || seenNumbers.has(number)) throw new Error('Invalid or reused class number in source');
    seenNumbers.add(number);
    if (byNumber.has(number) && byNumber.get(number)!==key) throw new Error('Class number reassigned to another section; manual reconciliation required');
    if (byKey.has(key) && byKey.get(key).class_number!==s.classNumber) throw new Error('Class number changed; manual reconciliation required to preserve legacy links');
    writes.push([byKey.get(key)?.section_id??null,s.classNumber,term,s.code,s.section]);
  }
  await bulk(connection,`INSERT INTO sections(section_id,class_number,term,course_code,class_section) VALUES ?
    ON DUPLICATE KEY UPDATE class_section=VALUES(class_section)`,writes);
  await connection.query(`UPDATE backend_section_metadata b JOIN sections s USING(section_id)
    SET b.is_active=FALSE WHERE s.term IN (?)`,[terms.map(t=>legacyTerm(t.id))]);
  const [rows] = await connection.query('SELECT * FROM sections WHERE term IN (?)',[terms.map(t=>legacyTerm(t.id))]);
  const ids = new Map(), byIdentity = new Map(rows.map(row=>[identity(row),row]));
  for (const [key,s] of parsed.sections) ids.set(key,byIdentity.get(`${legacyTerm(s.term)}|${s.code}|${s.section}`).section_id);
  // Seed inactive metadata too, so missing legacy sections do not default back to active.
  const active = new Set(ids.values());
  await bulk(connection,`INSERT INTO backend_section_metadata(section_id,is_active) VALUES ?
    ON DUPLICATE KEY UPDATE is_active=VALUES(is_active)`,rows.map(r=>[r.section_id,active.has(r.section_id)]));
  return ids;
}
async function writeMeetings(connection,parsed,ids) {
  const keys=[...ids.values()];
  for (let i=0;i<keys.length;i+=1000) for (const table of ['meetings','instructors']) {
    await connection.query(`DELETE c FROM ${table} c JOIN sections s ON c.term=s.term AND c.class_number=s.class_number WHERE s.section_id IN (?)`,[keys.slice(i,i+1000)]);
  }
  const meetings=[],instructors=[],days=[null,'MON','TUE','WED','THU','FRI','SAT','SUN'];
  const time = n => n==null?null:`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}:00`;
  for (const s of parsed.sections.values()) {
    for (const [day,start,end,from,to,venue] of s.meetings.values()) meetings.push([s.classNumber,legacyTerm(s.term),from,to,days[day]??null,time(start),time(end),venue]);
    for (const name of s.instructors) instructors.push([s.classNumber,legacyTerm(s.term),name]);
  }
  await bulk(connection,'INSERT INTO meetings(class_number,term,start_date,end_date,day,start_time,end_time,venue) VALUES ?',meetings);
  await bulk(connection,'INSERT INTO instructors(class_number,term,instructor_name) VALUES ?',instructors);
  return { meetings:meetings.length,instructors:instructors.length };
}
module.exports = { writeCatalog,writeMeetings,legacyTerm };
