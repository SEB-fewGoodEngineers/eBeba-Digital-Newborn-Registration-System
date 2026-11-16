const { z } = require("zod");

const listQuerySchema = z.object({
  status: z.string().optional(),
});

// Šema za odbijanje predmeta - napomena (notes) je obavezna i ne smije biti prazna
const rejectCswCaseSchema = z.object({
  notes: z
    .string({ error: "Notes are required for rejection." })
    .trim()
    .min(1, "Notes are required for rejection."),
});

module.exports = { listQuerySchema,rejectCswCaseSchema };