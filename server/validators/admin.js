
const { z } = require("zod");
const { STAFF_ROLES, ROLE_INSTITUTION_TYPE } = require("../constants");

const createStaffSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(72),
  role: z.enum(STAFF_ROLES),
  institutionId: z.string().regex(/^[a-f\d]{24}$/i),
});

const updateStaffStatusSchema = z.object({
  isActive: z.boolean(),
});

const isStaffInstitutionMatch = (role, institution) =>
  Boolean(
    institution &&
    institution.isActive &&
    ROLE_INSTITUTION_TYPE[role] === institution.type,
  );

module.exports = {
  createStaffSchema,
  updateStaffStatusSchema,
  isStaffInstitutionMatch,
};
