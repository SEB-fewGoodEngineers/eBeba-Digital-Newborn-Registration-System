const { z } = require("zod");
const { MEDICAL_RECORD_TYPES } = require("../constants");

const text = (label, max) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

const createMedicalRecordSchema = z.object({
  recordType: z.enum(Object.values(MEDICAL_RECORD_TYPES), {
    error: "Choose a valid type.",
  }),
  title: text("Title", 100),
  description: text("Description", 2000),
  doctorRecommendations: z
    .string()
    .trim()
    .max(2000, "Recommendations are too long.")
    .optional(),
  // The browser sends an ISO string (toIso). Zod turns it into a Date.
  examinationDate: z.iso
    .datetime({ error: "Enter a valid date." })
    .pipe(z.coerce.date()),
});

// For PATCH: every field is optional, but at least one must be sent
const updateMedicalRecordSchema = createMedicalRecordSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: "Send at least one field to change.",
  });

module.exports = { createMedicalRecordSchema, updateMedicalRecordSchema };
