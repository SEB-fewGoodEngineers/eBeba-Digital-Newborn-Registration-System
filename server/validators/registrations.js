const { z } = require("zod");
const mongoose = require("mongoose");

// Reusable text rule: trimmed, non-empty, max length. { error } = friendly message.
const text = (label, max) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

// babyId must be a valid Mongo ObjectId string
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

// PUT body when the parent fixes a returned application.
// Note: babyId is NOT editable. A resubmit does not move the baby.
const updateRegistrationSchema = z.object({
  proposedFirstName: text("First name", 50),
  proposedLastName: text("Last name", 50),
  residentialAddress: text("Address", 200),
  municipality: text("Municipality", 100),
});

module.exports = { createRegistrationSchema, updateRegistrationSchema };
