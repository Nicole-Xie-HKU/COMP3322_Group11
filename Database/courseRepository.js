/**
 * 数据访问层：算法 ↔ 数据库 的对接点
 * 后端只需要调用这里的函数，不需要自己写 SQL，也不需要自己转换数据格式
 */
const { getPool } = require('./db');

/** 学期列表（给前端学期下拉框） */
async function getTerms() {
  const [rows] = await getPool().query(
    'SELECT term_id AS id, term_name AS name, start_date AS startDate, end_date AS endDate FROM terms ORDER BY sort_order');
  return rows;
}

/** 搜索课程：按课程代码前缀或名称关键字，只返回该学期开课的 */
async function searchCourses(term, q, limit = 30) {
  const kw = String(q || '').trim();
  if (!kw) return [];
  const [rows] = await getPool().query(
    `SELECT c.course_code AS code, c.course_title AS title, c.offer_dept AS dept, c.acad_career AS career,
            c.credits, COUNT(s.section_id) AS sectionCount
       FROM courses c JOIN sections s ON s.course_code = c.course_code AND s.term_id = ?
      WHERE c.course_code LIKE ? OR c.course_title LIKE ?
      GROUP BY c.course_code
      ORDER BY (c.course_code LIKE ?) DESC, c.course_code
      LIMIT ?`,
    [term, `${kw}%`, `%${kw}%`, `${kw}%`, Number(limit)]);
  return rows;
}

/**
 * 核心：按学期 + 课程代码列表取数据，并转成算法需要的 Course 结构
 * 返回 { courses, notFound }
 */
async function getCoursesForScheduling(term, codes) {
  const list = [...new Set((codes || []).map(c => String(c).trim().toUpperCase()).filter(Boolean))];
  if (!list.length) return { courses: [], notFound: [] };
  const db = getPool();
  const [cRows] = await db.query('SELECT course_code, course_title, credits FROM courses WHERE course_code IN (?)', [list]);
  const [sRows] = await db.query(
    `SELECT s.section_id, s.course_code, s.class_section, s.class_number, s.section_type, s.parent_section,
            s.seats_left, s.waitlist_open, s.waitlist_count,
            GROUP_CONCAT(DISTINCT i.instructor_name ORDER BY i.instructor_name SEPARATOR '; ') AS instructors
       FROM sections s LEFT JOIN instructors i ON i.section_id = s.section_id
      WHERE s.term_id = ? AND s.course_code IN (?)
      GROUP BY s.section_id`, [term, list]);
  const secIds = sRows.map(s => s.section_id);
  const [mRows] = secIds.length ? await db.query(
    `SELECT section_id, day_of_week, start_min, end_min, start_date, end_date, venue
       FROM meetings WHERE section_id IN (?) ORDER BY section_id, day_of_week, start_min, start_date`, [secIds]) : [[]];
  return { courses: toAlgorithmFormat(term, cRows, sRows, mRows), notFound: list.filter(c => !cRows.some(r => r.course_code === c)) };
}

/** 纯函数：数据库行 → 算法输入（单独导出方便写单元测试） */
function toAlgorithmFormat(term, cRows, sRows, mRows) {
  const meetingsBy = new Map();
  for (const m of mRows) (meetingsBy.get(m.section_id) ?? meetingsBy.set(m.section_id, []).get(m.section_id)).push(m);
  return cRows.map(c => {
    const sections = sRows.filter(s => s.course_code === c.course_code).map(s => {
      const all = meetingsBy.get(s.section_id) || [];
      return {
        id: s.class_section, type: s.section_type || 'CLASS', parent: s.parent_section || null,
        classNumber: s.class_number, instructor: s.instructors || null,
        seatsLeft: s.seats_left, waitlist: s.waitlist_open == null ? null : { open: !!s.waitlist_open, count: s.waitlist_count },
        meetings: mergeMeetings(all.filter(m => m.day_of_week != null)),
        tba: all.filter(m => m.day_of_week == null).map(m => ({ startDate: m.start_date, endDate: m.end_date, venue: m.venue })),
      };
    });
    return { code: c.course_code, title: c.course_title, credits: c.credits ?? 6, creditsKnown: c.credits != null,
      offerings: sections.length ? [{ term, sections }] : [] };
  });
}

/**
 * HKU 课表把同一时段按日期拆成多行（例如阅读周前后各一行），这里把
 * “同星期、同时间、同地点、日期相隔不超过 14 天”的行合并，减少算法计算量和前端重复事件。
 * 合并只会让日期范围变大，因此冲突检测只会更保守（不会漏报冲突）。
 */
function mergeMeetings(rows) {
  const groups = new Map();
  for (const m of rows) {
    const k = `${m.day_of_week}|${m.start_min}|${m.end_min}|${m.venue ?? ''}`;
    (groups.get(k) ?? groups.set(k, []).get(k)).push(m);
  }
  const out = [];
  for (const g of groups.values()) {
    g.sort((a, b) => a.start_date.localeCompare(b.start_date));
    let cur = null;
    for (const m of g) {
      if (cur && daysBetween(cur.endDate, m.start_date) <= 14) { if (m.end_date > cur.endDate) cur.endDate = m.end_date; continue; }
      cur = { day: m.day_of_week, start: m.start_min, end: m.end_min, venue: m.venue, startDate: m.start_date, endDate: m.end_date };
      out.push(cur);
    }
  }
  return out.sort((a, b) => a.day - b.day || a.start - b.start || a.startDate.localeCompare(b.startDate));
}
const daysBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;

module.exports = { getTerms, searchCourses, getCoursesForScheduling, toAlgorithmFormat, mergeMeetings };
