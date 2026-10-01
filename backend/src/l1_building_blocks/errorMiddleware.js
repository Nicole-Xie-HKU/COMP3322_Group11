const { ApiError } = require('../l0_axioms/errors');
const databaseStatus = { TERM_NOT_FOUND: 404, SCHEDULE_NOT_FOUND: 404, SESSION_REQUIRED: 401, SAVE_LIMIT: 409 };
function errorMiddleware(logger) {
  return (error,req,res,next) => {
    if (res.headersSent) return next(error);
    if (!(error instanceof ApiError) && databaseStatus[error.code]) error = new ApiError(databaseStatus[error.code],error.code,error.message,error.details);
    if (error.type === 'entity.parse.failed') error = new ApiError(400,'INVALID_JSON','Request body must be valid JSON.');
    if (error.type === 'entity.too.large') error = new ApiError(413,'BODY_TOO_LARGE','Request body exceeds 64 KB.');
    const unavailable = ['ECONNREFUSED','ETIMEDOUT','PROTOCOL_CONNECTION_LOST','ER_CON_COUNT_ERROR'].includes(error.code);
    const status = error instanceof ApiError ? error.status : unavailable ? 503 : 500;
    const code = error instanceof ApiError ? error.code : unavailable ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_ERROR';
    if (status >= 500) logger.error({ requestId: req.requestId, code, causeCode: error.code ?? error.name });
    res.status(status).json({ error: { code, message: error instanceof ApiError ? error.message : 'The service could not complete this request.',
      ...(error instanceof ApiError && error.details ? { details: error.details } : {}) }, requestId: req.requestId });
  };
}
module.exports = { errorMiddleware };
