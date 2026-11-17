const { z } = require("zod");
const mongoose = require("mongoose");
const { REGISTRATION_STATUS } = require("../constants");

// Reusable text rule: trimmed, non-empty, max length. { error } = friendly message.
const text = (label, max) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

const babyId = z
  .string({ error: "Please choose a baby." })
  .refine((v) => mongoose.isValidObjectId(v), "Please choose a baby.");

const createRegistrationSchema = z.object({
  babyId,
  proposedFirstName: text("First name", 50),
  proposedLastName: text("Last name", 50),
  residentialAddress: text("Address", 200),
  municipality: text("Municipality", 100),
});

const updateRegistrationSchema = z.object({
  proposedFirstName: text("First name", 50),
  proposedLastName: text("Last name", 50),
  residentialAddress: text("Address", 200),
  municipality: text("Municipality", 100),
});

// NEW: query for GET /registrations (MoI queue).
// Only "status" is allowed, must be a known REGISTRATION_STATUS value,
// and defaults to "pending" when omitted.
const listRegistrationsQuerySchema = z.object({
  status: z
    .enum(Object.values(REGISTRATION_STATUS), { error: "Unknown status." })
    .optional()
    .default(REGISTRATION_STATUS.PENDING),
});

module.exports = {
  createRegistrationSchema,
  updateRegistrationSchema,
  listRegistrationsQuerySchema,
};