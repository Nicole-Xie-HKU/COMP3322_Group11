/**
 * 直接从 HKU 官方课表 Excel 导入 MySQL（替代 R 脚本 + JSON 中间文件）
 * 用法：node importTimetable.js ["2026-27 class_timetable_20260902.xlsx"]
 * 特点：流式读取（内存小）、批量插入（约 10 秒）、事务（失败自动回滚）、导入后自动校验
 */
const path = require('path');
const ExcelJS = require('exceljs');
const mysql = require('mysql2/promise');
const { dbConfig } = require('./db');

const FILE = process.argv[2] || path.join(__dirname, '2026-27 class_timetable_20260902.xlsx');
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// '2026-27 Sem 1' → '2026-27-S1'；'2026-27 Sum Sem' → '2026-27-SU'
function termId(name) {
  const m = name.match(/^(\d{4}-\d{2})\s+(Sem\s*(\d)|Sum)/i);
  if (!m) throw new Error(`无法识别的学期名称: ${name}`);
  return m[3] ? `${m[1]}-S${m[3]}` : `${m[1]}-SU`;
}
// Excel 日期序列号 → 'YYYY-MM-DD'
const excelDate = v => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v !== 'number') return null;
  return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
};
// Excel 时间（一天的小数）→ 分钟数
const excelMin = v => {
  if (v instanceof Date) return v.getUTCHours() * 60 + v.getUTCMinutes();
  if (typeof v === 'number') return Math.round((v % 1) * 1440);
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)) { const [h, m] = v.split(':').map(Number); return h * 60 + m; }
  return null;
};
const str = v => (v == null ? null : String(v?.richText ? v.richText.map(t => t.text).join('') : v).trim() || null);

async function readRows(file) {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, { sharedStrings: 'cache', worksheets: 'emit' });
  const rows = []; let header = null;
  for await (const ws of reader) {
    for await (const row of ws) {
      const vals = row.values;
      if (!header) { header = vals.map(h => (h ? String(h).trim().toUpperCase() : h)); continue; }
      const r = {}; header.forEach((h, i) => { if (h) r[h] = vals[i]; });
      rows.push(r);
    }
    break; // 只读第一个工作表
  }
  return rows;
}

async function main() {
  console.time('导入耗时');
  const raw = await readRows(FILE);
  const stats = { rows: raw.length, blank: 0, tba: 0, multiDay: 0 };

  const terms = new Map(), courses = new Map(), sections = new Map();
  for (const r of raw) {
    const tName = str(r['TERM']), code = str(r['COURSE CODE']), sec = str(r['CLASS SECTION']);
    if (!tName || !code || !sec) { stats.blank++; continue; }
    const tid = termId(tName);
    const sd = excelDate(r['START DATE']), ed = excelDate(r['END DATE']);
    const t = terms.get(tid) ?? { name: tName, start: sd, end: ed };
    if (sd && sd < t.start) t.start = sd; if (ed && ed > t.end) t.end = ed;
    terms.set(tid, t);

    if (!courses.has(code)) courses.set(code, [code, str(r['COURSE TITLE']) ?? code, str(r['OFFER DEPT']), str(r['ACAD_CAREER'])]);

    const key = `${tid}|${code}|${sec}`;
    if (!sections.has(key)) sections.set(key, { tid, code, sec, classNo: Number(r['CLASS NUMBER']) || null, inst: new Set(), meetings: new Map() });
    const s = sections.get(key);
    (str(r['INSTRUCTOR']) || '').split(/;\s*/).filter(Boolean).forEach(n => s.inst.add(n));

    const days = DAYS.map((d, i) => (str(r[d]) ? i + 1 : null)).filter(Boolean);   // 一行可能有多个星期！
    if (days.length > 1) stats.multiDay++;
    const st = excelMin(r['START TIME']), en = excelMin(r['END TIME']), venue = str(r['VENUE']);
    if (!days.length || st == null || en == null) { stats.tba++; days.length = 0; days.push(null); }
    for (const d of days) {
      const m = [d, d ? st : null, d ? en : null, sd, ed, venue];
      s.meetings.set(m.join('|'), m);   // 去掉完全重复的行
    }
  }

  const db = await mysql.createConnection({ ...dbConfig, multipleStatements: false });
  console.log('已连接 MySQL');
  await db.beginTransaction();
  try {
    await db.query('SET FOREIGN_KEY_CHECKS=0');
    for (const t of ['instructors', 'meetings', 'sections', 'courses', 'terms']) await db.query(`DELETE FROM ${t}`);
    await db.query('ALTER TABLE sections AUTO_INCREMENT = 1');
    await db.query('SET FOREIGN_KEY_CHECKS=1');

    const order = id => ({ S1: 1, S2: 2, SU: 3 }[id.slice(-2)] ?? 9);
    await db.query('INSERT INTO terms (term_id, term_name, start_date, end_date, sort_order) VALUES ?',
      [[...terms].map(([id, t]) => [id, t.name, t.start, t.end, order(id)])]);
    await bulk(db, 'INSERT INTO courses (course_code, course_title, offer_dept, acad_career) VALUES ?', [...courses.values()]);

    const secList = [...sections.values()];
    await bulk(db, 'INSERT INTO sections (term_id, course_code, class_section, class_number) VALUES ?',
      secList.map(s => [s.tid, s.code, s.sec, s.classNo]));
    const [ids] = await db.query('SELECT section_id, term_id, course_code, class_section FROM sections');
    const idOf = new Map(ids.map(x => [`${x.term_id}|${x.course_code}|${x.class_section}`, x.section_id]));

    const meet = [], inst = [];
    for (const [k, s] of sections) {
      const id = idOf.get(k);
      for (const m of s.meetings.values()) meet.push([id, ...m]);
      for (const n of s.inst) inst.push([id, n]);
    }
    await bulk(db, 'INSERT INTO meetings (section_id, day_of_week, start_min, end_min, start_date, end_date, venue) VALUES ?', meet);
    await bulk(db, 'INSERT INTO instructors (section_id, instructor_name) VALUES ?', inst);
    await db.commit();

    // 导入后校验：数据库里的数量必须与 Excel 解析结果一致
    const [[c]] = await db.query(`SELECT (SELECT COUNT(*) FROM terms) t, (SELECT COUNT(*) FROM courses) c,
      (SELECT COUNT(*) FROM sections) s, (SELECT COUNT(*) FROM meetings) m, (SELECT COUNT(*) FROM instructors) i`);
    const expect = { t: terms.size, c: courses.size, s: sections.size, m: meet.length, i: inst.length };
    console.table({ Excel解析: expect, 数据库: c });
    for (const k of Object.keys(expect)) if (expect[k] !== c[k]) throw new Error(`校验失败: ${k} 期望 ${expect[k]} 实际 ${c[k]}`);
    console.log(`Excel 共 ${stats.rows} 行，空行 ${stats.blank}，时间待定(TBA) ${stats.tba}，一行含多个星期 ${stats.multiDay}`);
    console.log('导入成功 ✓');
  } catch (e) {
    await db.rollback(); console.error('导入失败，已回滚：', e.message); process.exitCode = 1;
  } finally {
    await db.end(); console.timeEnd('导入耗时');
  }
}
async function bulk(db, sql, rows, size = 2000) {
  for (let i = 0; i < rows.length; i += size) await db.query(sql, [rows.slice(i, i + size)]);
}
main().catch(e => { console.error(e); process.exit(1); });
