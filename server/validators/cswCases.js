const { z } = require("zod");

const notesSchema = z.object({
  notes: z
    .string({ error: "Notes are required." })
    .trim()
    .min(1, "Notes are required.")
    .max(1000, "Notes are too long."),
});

module.exports = { notesSchema };
