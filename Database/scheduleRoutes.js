/**
 * Express 路由示例（给后端组直接挂载）：app.use('/api', require('./scheduleRoutes'))
 * 需要 package.json 里 "type": "commonjs"，算法模块是 ESM，用动态 import 加载
 */
const express = require('express');
const repo = require('./courseRepository');
const router = express.Router();
const algo = Promise.all([import('../scheduler/scheduler.js'), import('../scheduler/validate.js')]);

router.get('/terms', async (req, res, next) => {
  try { res.json(await repo.getTerms()); } catch (e) { next(e); }
});

router.get('/courses', async (req, res, next) => {
  try {
    const { term, q } = req.query;
    if (!term || !q) return res.status(400).json({ error: '需要 term 和 q 参数' });
    res.json(await repo.searchCourses(term, q));
  } catch (e) { next(e); }
});

router.post('/schedules/generate', async (req, res, next) => {
  try {
    const [{ generateSchedules }, { validateCourses }] = await algo;
    const { term, courseCodes, blocked = [], prefs = {}, locked, excluded, seatPolicy } = req.body || {};
    if (!term || !Array.isArray(courseCodes) || !courseCodes.length) return res.status(400).json({ error: '需要 term 和非空的 courseCodes' });
    if (courseCodes.length > 12) return res.status(400).json({ error: '一次最多 12 门课' });

    const { courses, notFound } = await repo.getCoursesForScheduling(term, courseCodes);
    if (notFound.length) return res.status(404).json({ error: '课程不存在', notFound });
    const errors = validateCourses(courses.filter(c => c.offerings.length), term);
    if (errors.length) return res.status(500).json({ error: '数据库数据格式异常', details: errors.slice(0, 10) });

    res.json(generateSchedules(courses, { term, blocked, prefs, locked, excluded, seatPolicy, maxResults: 100 }));
  } catch (e) { next(e); }
});

module.exports = router;
