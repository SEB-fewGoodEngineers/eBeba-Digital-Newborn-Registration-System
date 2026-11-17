const { z } = require("zod");
const { AI_FLAG_DECISIONS } = require("../constants");

const updateFlagSchema = z.object({
  decision: z.enum([AI_FLAG_DECISIONS.ACCEPTED, AI_FLAG_DECISIONS.DISMISSED], {
    error: "Invalid decision value.",
  }),
});

module.exports = { updateFlagSchema };