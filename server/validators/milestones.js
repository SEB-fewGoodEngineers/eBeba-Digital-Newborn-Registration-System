const { z } = require("zod");
const { MILESTONE_CATEGORIES } = require("../constants");

const achievedAt = z.iso.datetime({
  error: "Please enter a valid achieved date.",
});

const title = z
  .string({ error: "Title is required." })
  .trim()
  .min(1, "Title is required.")
  .max(100, "Title cannot be longer than 100 characters.");

const notes = z
  .string()
  .trim()
  .max(500, "Notes cannot be longer than 500 characters.")
  .optional()
  .transform((val) => (val === "" ? undefined : val));

const createMilestoneSchema = z.object({
  category: z.enum(Object.values(MILESTONE_CATEGORIES), {
    error: "Please choose a milestone category.",
  }),
  title,
  achievedAt,
  notes,
});

module.exports = { createMilestoneSchema };