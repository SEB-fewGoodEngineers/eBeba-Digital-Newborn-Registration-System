const { z } = require("zod");
const mongoose = require("mongoose");

const issueInsuranceSchema = z.object({
  insuredParentId: z
    .string({ error: "Insured parent ID is required." })
    .refine((val) => mongoose.isValidObjectId(val), "Invalid parent ID."),
});

module.exports = { issueInsuranceSchema };