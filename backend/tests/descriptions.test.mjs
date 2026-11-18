import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createRequire } from 'node:module';
import { fakeDatabase } from './fakeDatabase.mjs';
import { term } from './fixtures.mjs';
const require = createRequire(import.meta.url);
const { createApp } = require('../app');
const { readConfig } = require('../src/l1_building_blocks/config');

test('course detail always exposes description fields, with or without the local snapshot', async t => {
  const app = await createApp({ db: fakeDatabase(), config: readConfig({ CURSOR_SECRET: 'd'.repeat(40) }),
    logger: { info() {}, error() {} } });
  t.after(() => app.locals.close());
  const detail = (await request(app).get('/api/courses/COMP3322').query({ term }).expect(200)).body;
  for (const key of ['description', 'descriptionKind', 'prerequisites', 'assessment', 'descriptionSource']) {
    assert.ok(key in detail, `missing ${key}`);
    assert.ok(detail[key] === null || typeof detail[key] === 'string', `${key} must be text or null`);
  }
  const missing = (await request(app).get('/api/courses/COMP2299').query({ term }).expect(404)).body;
  assert.equal(missing.error.code, 'COURSE_NOT_FOUND');
});
