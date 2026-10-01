const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { randomUUID, createHash } = require('node:crypto');
const { ApiError } = require('../l0_axioms/errors');
const tokenHash = token => createHash('sha256').update(token).digest('hex');
function readToken(req) {
  const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('hkuplan_guest='));
  const value = cookie?.slice('hkuplan_guest='.length);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
function requestLog(logger) {
  return (req,res,next) => {
    const start = Date.now(); req.requestId = randomUUID(); res.setHeader('X-Request-Id',req.requestId);
    res.on('finish',() => logger.info({ requestId: req.requestId, method: req.method,
      route: req.route?.path || 'unmatched', status: res.statusCode, durationMs: Date.now()-start })); next();
  };
}
function limiter(limit) {
  return rateLimit({ windowMs: 60000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req,res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests; retry later.' }, requestId: req.requestId }) });
}
function installSecurity(app, config, logger) {
  app.disable('x-powered-by'); app.set('trust proxy', config.trustProxy);
  app.use(requestLog(logger)); app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: config.production ? [] : null } } }));
  app.use(cors({ credentials: true, origin(origin,done) {
    if (!origin || config.allowedOrigins.includes(origin)) done(null,true);
    else done(new ApiError(403,'ORIGIN_DENIED','This origin is not allowed.'));
  } }));
  app.use(limiter(config.rateLimit));
  app.use((req,res,next) => {
    res.setHeader('Cache-Control','no-store');
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      if (req.headers['sec-fetch-site'] === 'cross-site') return next(new ApiError(403,'CROSS_SITE_WRITE','Cross-site writes are not allowed.'));
      const origin = req.headers.origin;
      if (origin && !config.allowedOrigins.includes(origin)) return next(new ApiError(403,'ORIGIN_DENIED','This origin is not allowed.'));
      if (req.headers.referer) {
        try { if (!config.allowedOrigins.includes(new URL(req.headers.referer).origin)) throw new Error(); }
        catch { return next(new ApiError(403,'ORIGIN_DENIED','This referrer is not allowed.')); }
      }
    }
    next();
  });
}
module.exports = { installSecurity, limiter, readToken, tokenHash };
