const express = require('express');
const path = require('node:path');
const { getPool } = require('./db');
const routes = require('./scheduleRoutes');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', async (req, res, next) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) { next(error); }
});
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use((error, req, res, next) => {
  console.error(error.message);
  const status = error.status || 500;
  res.status(status).json({ error: status === 400 ? 'Invalid JSON request.' : 'The server could not complete this request.' });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`HKUPlan: http://localhost:${port}`));
}

module.exports = app;
