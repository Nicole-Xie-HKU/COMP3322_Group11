const termRows = `SELECT s.term AS id,s.term AS name,MIN(m.start_date) AS startDate,MAX(m.end_date) AS endDate
  FROM sections s LEFT JOIN backend_section_metadata b USING(section_id)
  LEFT JOIN meetings m ON m.class_number=s.class_number AND m.term=s.term
  WHERE COALESCE(b.is_active,TRUE)=TRUE`;
async function selectTerm(connection,term) {
  const [rows] = await connection.execute(`${termRows} AND s.term=? GROUP BY s.term`,[term]);
  return rows[0];
}
async function selectCourses(connection,term,codes) {
  const [courseRows] = await connection.query(`SELECT c.*,b.credits FROM courses c LEFT JOIN backend_course_metadata b USING(course_code)
    WHERE c.course_code IN (?) ORDER BY c.course_code`,[codes]);
  const [sectionRows] = await connection.query(`SELECT s.*,COALESCE(b.section_type,'CLASS') AS section_type,
    b.parent_section,b.campus,b.seats_left,b.waitlist_open,b.waitlist_count
    FROM sections s LEFT JOIN backend_section_metadata b USING(section_id)
    WHERE s.term=? AND COALESCE(b.is_active,TRUE)=TRUE AND s.course_code IN (?) ORDER BY s.course_code,s.class_section`,[term,codes]);
  const ids = sectionRows.map(s=>s.section_id);
  if (!ids.length) return { courseRows,sectionRows,meetingRows:[],instructorRows:[] };
  const [meetingRows] = await connection.query(`SELECT m.*,s.section_id,
    NULLIF(FIELD(UPPER(LEFT(m.day,3)),'MON','TUE','WED','THU','FRI','SAT','SUN'),0) AS day_of_week,
    TIME_TO_SEC(m.start_time)/60 AS start_min,TIME_TO_SEC(m.end_time)/60 AS end_min
    FROM meetings m JOIN sections s ON s.class_number=m.class_number AND s.term=m.term
    WHERE s.section_id IN (?) ORDER BY s.section_id,m.day,m.start_time,m.start_date,m.end_date,m.venue`,[ids]);
  // Legacy data may have a day but no time; preserve that row as TBA instead of fabricating a time.
  for (const m of meetingRows) if (!m.day_of_week || m.start_min==null || m.end_min==null) {
    m.day_of_week=null; m.start_min=null; m.end_min=null;
  }
  const [instructorRows] = await connection.query(`SELECT i.*,s.section_id FROM instructors i
    JOIN sections s ON s.class_number=i.class_number AND s.term=i.term WHERE s.section_id IN (?) ORDER BY s.section_id,i.instructor_name`,[ids]);
  return { courseRows,sectionRows,meetingRows,instructorRows };
}
async function searchRows(connection,term,query,limit) {
  const escaped = query.replace(/[!%_]/g,value=>`!${value}`);
  const [rows] = await connection.execute(`SELECT c.course_code AS code,c.course_title AS title,c.offer_dept AS dept,
    c.acad_career AS career,meta.credits,COUNT(s.section_id) AS sectionCount FROM courses c
    JOIN sections s ON s.course_code=c.course_code AND s.term=?
    LEFT JOIN backend_section_metadata b ON b.section_id=s.section_id LEFT JOIN backend_course_metadata meta ON meta.course_code=c.course_code
    WHERE COALESCE(b.is_active,TRUE)=TRUE AND (c.course_code LIKE ? ESCAPE '!' OR c.course_title LIKE ? ESCAPE '!')
    GROUP BY c.course_code,meta.credits ORDER BY (c.course_code LIKE ? ESCAPE '!') DESC,c.course_code LIMIT ?`,
  [term,`${escaped}%`,`%${escaped}%`,`${escaped}%`,limit]);
  return rows;
}
module.exports = { selectTerm,selectCourses,searchRows,termRows };
