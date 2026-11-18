const { z } = require("zod");

// The browser sends an ISO string (toIso). Zod turns it into a Date.
const isoDate = (label) =>
  z.iso.datetime({ error: `Enter a valid ${label}.` }).pipe(z.coerce.date());

// ADD A SCHEDULED VACCINATION
// The server sets babyId, entrySource, authorUserId and reminderSent.
const createVaccinationSchema = z.object({
  vaccineName: z
    .string({ error: "Vaccine name is required." })
    .trim()
    .min(1, "Vaccine name is required.")
    .max(100, "Vaccine name is too long."),
  doseNumber: z.coerce
    .number({ error: "Dose must be a number." })
    .int("Dose must be a whole number.")
    .min(1, "Dose must be at least 1.")
    .max(10, "Dose can be at most 10.")
    .optional(),
  scheduledDate: isoDate("scheduled date"),
  notes: z.string().trim().max(500, "Notes are too long.").optional(),
});

// MARK A VACCINATION AS GIVEN: body { administeredDate }
const markVaccinationGivenSchema = z.object({
  administeredDate: isoDate("given date").refine(
    (date) => date.getTime() <= Date.now(),
    { error: "The given date cannot be in the future." },
  ),
});

module.exports = { createVaccinationSchema, markVaccinationGivenSchema };
