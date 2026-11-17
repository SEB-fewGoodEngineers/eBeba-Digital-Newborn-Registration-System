const { z } = require("zod");
const mongoose = require("mongoose");

const objectIdString = (label) =>
  z
    .string({ error: `${label} is required.` })
    .refine((val) => mongoose.isValidObjectId(val), `Invalid ${label}.`);

const issueInsuranceSchema = z.object({
  insuredParentId: objectIdString("Insured parent ID"),
});

const assignPediatricianSchema = z.object({
  pediatricianId: objectIdString("Pediatrician ID"),
});

module.exports = { issueInsuranceSchema, assignPediatricianSchema };