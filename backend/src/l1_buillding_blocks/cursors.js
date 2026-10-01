const { createHash, createHmac, timingSafeEqual } = require('node:crypto');
const { ApiError } = require('../l0_axioms/errors');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]));
  return value;
}
const fingerprint = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function createCursors(secret, now = Date.now) {
  const mac = body => createHmac('sha256',secret).update(body).digest();
  return {
    sign(binding, state) {
      const body = Buffer.from(JSON.stringify({ version: 1, expires: now()+3600000, binding, state })).toString('base64url');
      return `${body}.${mac(body).toString('base64url')}`;
    },
    verify(cursor) {
      try {
        const [body, signature, extra] = cursor.split('.');
        if (!body || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(signature)) throw new Error();
        const actual = Buffer.from(signature,'base64url'), expected = mac(body);
        if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) throw new Error();
        const payload = JSON.parse(Buffer.from(body,'base64url').toString());
        if (payload.version !== 1 || !Number.isFinite(payload.expires) || typeof payload.binding !== 'string') throw new Error();
        if (payload.expires <= now()) throw new ApiError(409,'CURSOR_EXPIRED','The search expired. Start again without a cursor.');
        return payload;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(400,'INVALID_CURSOR','The cursor is invalid.');
      }
    },
  };
}
module.exports = { createCursors, fingerprint };
