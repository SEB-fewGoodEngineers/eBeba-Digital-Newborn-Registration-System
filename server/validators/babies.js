
const { z } = require("zod");
const { GENDERS, FAMILY_TYPES } = require("../constants");

const requiredText = (label) =>
  z.string().trim().min(1, `${label} is required.`);

const optionalText = z.string().trim().optional();

const parentSchema = z.object({
  firstName: requiredText("First name"),
  lastName: requiredText("Last name"),
  maidenName: optionalText,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  dateOfBirth: z.iso.datetime().optional(),
  citizenship: optionalText,
  address: optionalText,
});

const createBabySchema = z
  .object({
    gender: z.enum(Object.values(GENDERS)),
    birthDateTime: z.iso.datetime(),
    placeOfBirth: requiredText("Place of birth"),
    municipalityOfBirth: requiredText("Municipality"),
    birthWeightGrams: z.number().int().min(300).max(7000).optional(),
    birthLengthCm: z.number().min(20).max(70).optional(),
    familyType: z.enum(Object.values(FAMILY_TYPES)),
    mother: parentSchema,
    father: parentSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const needsFather =
      data.familyType === FAMILY_TYPES.TWO_PARENTS ||
      data.familyType === FAMILY_TYPES.LEGAL_GUARDIAN;

    if (needsFather && !data.father) {
      ctx.addIssue({
        code: "custom",
        path: ["father"],
        message: "Father details are required.",
      });
    }

    if (!needsFather && data.father) {
      ctx.addIssue({
        code: "custom",
        path: ["father"],
        message: "Father details are not allowed for this family type.",
      });
    }
  });

module.exports = { createBabySchema };
