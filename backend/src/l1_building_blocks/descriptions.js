const fs = require('node:fs');
const path = require('node:path');

// Local snapshot produced by backend/scripts/fetch-descriptions.mjs. Absent in a clean checkout.
let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'course-descriptions.json'), 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

function courseDescription(code) {
  return load()[String(code ?? '').toUpperCase()] ?? null;
}

module.exports = { courseDescription };
