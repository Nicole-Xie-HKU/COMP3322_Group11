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
    if (typeof term !== 'string' || !term.trim() || (q !== undefined && typeof q !== 'string'))
      return res.status(400).json({ error: 'Please choose a term and enter a valid search.' });
    res.json(await repo.searchCourses(term, q));
  } catch (e) { next(e); }
});

router.get('/courses/:code', async (req, res, next) => {
  try {
    const { term } = req.query;
    if (typeof term !== 'string' || !term.trim()) return res.status(400).json({ error: 'Please choose a term.' });
    const { courses, notFound } = await repo.getCoursesForScheduling(term, [req.params.code]);
    if (notFound.length) return res.status(404).json({ error: 'This course is not offered in the selected term.' });
    res.json(courses[0]);
  } catch (e) { next(e); }
});

router.post('/schedules/generate', async (req, res, next) => {
  try {
    const [{ generateSchedules }, { validateCourses }] = await algo;
    const { term, courseCodes, blocked = [], prefs = {}, locked = {}, excluded = [], maxResults } = req.body || {};
    if (typeof term !== 'string' || !term.trim() || !Array.isArray(courseCodes) || !courseCodes.length ||
      courseCodes.some(code => typeof code !== 'string' || !code.trim()))
      return res.status(400).json({ error: 'Please choose a term and at least one course.' });
    if (courseCodes.length > 12) return res.status(400).json({ error: 'Choose no more than 12 courses.' });
    if (!locked || typeof locked !== 'object' || Array.isArray(locked) || Object.values(locked).some(value => typeof value !== 'string') ||
      !Array.isArray(excluded) || excluded.some(value => typeof value !== 'string') ||
      !Array.isArray(blocked) || blocked.some(item => !item || !Number.isInteger(item.day) || item.day < 1 || item.day > 7 ||
        !Number.isInteger(item.start) || !Number.isInteger(item.end) || item.start < 0 || item.end > 1440 || item.start >= item.end) ||
      !prefs || typeof prefs !== 'object' || Array.isArray(prefs))
      return res.status(400).json({ error: 'Invalid schedule options.' });
    const limit = maxResults === undefined ? 100 : Number(maxResults);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      return res.status(400).json({ error: 'maxResults must be between 1 and 100.' });

    const { courses, notFound } = await repo.getCoursesForScheduling(term, courseCodes);
    if (notFound.length) return res.status(404).json({ error: 'Some courses are not offered in this term.', notFound });
    const errors = validateCourses(courses);
    if (errors.length) return res.status(500).json({ error: 'Some course data could not be read.', details: errors.slice(0, 10) });

    res.json(generateSchedules(courses, { term, blocked, prefs, locked, excluded, maxResults: limit }));
  } catch (e) { next(e); }
});

module.exports = router;
