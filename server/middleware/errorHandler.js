// The last middleware in app.js. Turns any error into a safe { err } response.
// Details are written to the server log only, never sent to the client.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Body was not valid JSON
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ err: "The request body is not valid JSON." });
  }

  // Mongoose schema validation failed
  if (err.name === "ValidationError") {
    return res.status(400).json({
      err: "Please check the form.",
      details: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // An id in the URL is not a valid MongoDB id
  if (err.name === "CastError") {
    return res.status(400).json({ err: "Invalid id." });
  }

  // A unique index was broken (for example, an email that already exists)
  if (err.code === 11000) {
    return res.status(409).json({ err: "This already exists." });
  }

  console.error(err);
  res.status(500).json({ err: "Something went wrong." });
};

module.exports = errorHandler;
