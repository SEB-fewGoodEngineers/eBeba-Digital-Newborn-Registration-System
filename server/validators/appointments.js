const { z } = require("zod");
const { APPOINTMENT_STATUS } = require("../constants");

const text = (label, max) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

// ADD A CHECK-UP: title, date and time, place
// The server sets babyId, status, createdByUserId and reminderSent.
const createAppointmentSchema = z.object({
  title: text("Title", 100),
  // The browser sends an ISO string (toIso). Zod turns it into a Date.
  scheduledAt: z.iso
    .datetime({ error: "Enter a valid date and time." })
    .pipe(z.coerce.date())
    .refine((date) => date.getTime() > Date.now(), {
      error: "A new check-up must be in the future.",
    }),
  location: text("Place", 200),
  notes: z.string().trim().max(500, "Notes are too long.").optional(),
});

// CHANGE THE STATUS: body { status }, only "completed" or "cancelled"
const updateAppointmentStatusSchema = z.object({
  status: z.enum([APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED], {
    error: "Choose completed or cancelled.",
  }),
});

module.exports = { createAppointmentSchema, updateAppointmentStatusSchema };
