// Express 4 does not catch errors thrown in async functions.
// Wrap every async handler: asyncHandler(async (req, res) => { ... })
// Any error is passed to errorHandler instead of hanging the request.
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
