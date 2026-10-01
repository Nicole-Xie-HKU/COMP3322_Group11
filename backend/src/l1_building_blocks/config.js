function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const port = Number(env.PORT || 3001), trustProxy = Number(env.TRUST_PROXY || 0);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (![0,1].includes(trustProxy)) throw new Error('TRUST_PROXY must be 0 or 1');
  const cursorSecret = env.CURSOR_SECRET;
  if (!cursorSecret || cursorSecret.length < 32 || cursorSecret.startsWith('replace-with-')) throw new Error('CURSOR_SECRET must contain at least 32 random characters');
  const apiPrefix = env.API_PREFIX || '/api';
  if (!/^\/[A-Za-z0-9_/-]+$/.test(apiPrefix) || apiPrefix.endsWith('/')) throw new Error('Invalid API_PREFIX');
  const publicOrigin = env.PUBLIC_ORIGIN || `http://localhost:${port}`;
  const allowedOrigins = [...new Set([publicOrigin,...(env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3001').split(',')].map(value => value.trim()))];
  for (const origin of allowedOrigins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['http:','https:'].includes(parsed.protocol)) throw new Error('Origins must be exact HTTP(S) origins');
    if (production && parsed.protocol !== 'https:') throw new Error('Production origins must use HTTPS');
  }
  return { host: env.HOST || '127.0.0.1', port, apiPrefix, production, publicOrigin, allowedOrigins, cursorSecret, trustProxy,
    workerTimeoutMs: 5000, maxWorkers: 2, maxNodes: 500000, rateLimit: 180, generationRateLimit: 30 };
}
module.exports = { readConfig };
