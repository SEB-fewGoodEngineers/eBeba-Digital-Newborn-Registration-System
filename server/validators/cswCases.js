const { z } = require("zod");

const listQuerySchema = z.object({
  status: z.string().optional(),
});

module.exports = { listQuerySchema };