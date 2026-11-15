// Checks req.body against a Zod schema.
// On success, req.body is replaced with the clean data (unknown fields removed).
// On failure, responds 400 with a readable message and the problem fields.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    return res.status(400).json({
      err: "Please check the form.",
      details: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;
  next();
};

module.exports = validate;
