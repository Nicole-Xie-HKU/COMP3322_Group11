const { randomBytes } = require('node:crypto');
const { ApiError } = require('../l0_axioms/errors');
const { readToken, tokenHash } = require('../l1_building_blocks/security');
function createGuestSessions(db,config) {
  async function requireSession(req,res,next) {
    try {
      const token = readToken(req), session = token ? await db.getSession(tokenHash(token)) : null;
      if (!session) throw new ApiError(401,'SESSION_REQUIRED','Create a guest session before managing saved schedules.');
      req.guestSession = session; next();
    } catch (error) { next(error); }
  }
  async function establish(req,res) {
    const existingToken = readToken(req);
    const existing = existingToken ? await db.getSession(tokenHash(existingToken)) : null;
    if (existing) return res.status(200).json({ expiresAt: existing.expiresAt });
    const token = randomBytes(32).toString('base64url'), session = await db.createSession(tokenHash(token));
    res.cookie('hkuplan_guest',token,{ httpOnly: true, secure: config.production, sameSite: 'lax',
      maxAge: 30*24*60*60*1000, path: config.apiPrefix });
    res.status(201).json({ expiresAt: session.expiresAt });
  }
  return { requireSession, establish };
}
module.exports = { createGuestSessions };
