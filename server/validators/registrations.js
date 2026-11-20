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

// Body for POST /:id/return and POST /:id/reject (moi_staff).
// reviewerNotes is REQUIRED — a decision without a reason is not allowed.
const reviewDecisionSchema = z.object({
  reviewerNotes: z
    .string({ error: "Please write a note for the parent." })
    .trim()
    .min(1, "Please write a note for the parent.")
    .max(1000, "The note is too long."),
});

// Signed payload the officer's browser signs on approval.
// The server recomputes this from its own data and compares it byte-for-byte.
const approvalPayloadSchema = z.object({
  registrationId: z.string(),
  decision: z.literal("approve"),
  officerId: z.string(),
  issuedAt: z.string().datetime(),
});

// Body for POST /registrations/:id/approve.
// The officer must sign the approval payload with their key.
const approveRegistrationSchema = z.object({
  signature: z
    .string({ error: "A signed approval is required." })
    .min(1, "A signed approval is required.")
    .max(2000, "Signature is too long."),
  payload: approvalPayloadSchema,
});

module.exports = {
  createRegistrationSchema,
  updateRegistrationSchema,
  listRegistrationsQuerySchema,
  reviewDecisionSchema,
  approveRegistrationSchema,
  approvalPayloadSchema,
};