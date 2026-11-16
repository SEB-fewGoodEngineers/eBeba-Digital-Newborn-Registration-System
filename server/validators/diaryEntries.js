const { z } = require("zod");
const {
  DIARY_CATEGORIES,
  FEEDING_METHODS,
  DIAPER_TYPES,
} = require("../constants");

// ISO date-time string sent by the browser (for example "2026-11-16T08:30:00.000Z")
const recordedAt = z.iso.datetime({
  error: "Please enter a valid date and time.",
});

// Optional notes field (empty text becomes undefined)
const notes = z
  .string()
  .trim()
  .max(500, "Notes cannot be longer than 500 characters.")
  .optional()
  .transform((val) => (val === "" ? undefined : val));

const feedingSchema = z.object({
  category: z.literal(DIARY_CATEGORIES.FEEDING),
  recordedAt,
  details: z.object({
    method: z.enum(Object.values(FEEDING_METHODS), {
      error: "Please choose a feeding method.",
    }),
    amountMl: z
      .number({ error: "Amount must be a number." })
      .min(0, "Amount cannot be less than 0 ml.")
      .max(1000, "Amount cannot be more than 1000 ml.")
      .optional(),
  }),
  notes,
});

const sleepSchema = z.object({
  category: z.literal(DIARY_CATEGORIES.SLEEP),
  recordedAt,
  details: z.object({
    durationMinutes: z
      .number({ error: "Sleep duration is required." })
      .int("Sleep duration must be whole minutes.")
      .min(1, "Sleep duration must be at least 1 minute.")
      .max(1440, "Sleep duration cannot be more than 1440 minutes."),
  }),
  notes,
});

const diaperSchema = z.object({
  category: z.literal(DIARY_CATEGORIES.DIAPER),
  recordedAt,
  details: z.object({
    diaperType: z.enum(Object.values(DIAPER_TYPES), {
      error: "Please choose a diaper type.",
    }),
  }),
  notes,
});

const temperatureSchema = z.object({
  category: z.literal(DIARY_CATEGORIES.TEMPERATURE),
  recordedAt,
  details: z.object({
    temperatureCelsius: z
      .number({ error: "Temperature is required." })
      .min(34, "Temperature must be at least 34 °C.")
      .max(43, "Temperature cannot be more than 43 °C."),
  }),
  notes,
});

const activitySchema = z.object({
  category: z.literal(DIARY_CATEGORIES.ACTIVITY),
  recordedAt,
  details: z.object({}).optional().default({}),
  notes,
});

// Picks the right rule set based on the "category" field
const createDiaryEntrySchema = z.discriminatedUnion("category", [
  feedingSchema,
  sleepSchema,
  diaperSchema,
  temperatureSchema,
  activitySchema,
]);

// Checks ?from=...&to=... query parameters on GET requests
const diaryQuerySchema = z
  .object({
    from: z.iso.datetime({ error: "A valid 'from' date is required." }),
    to: z.iso.datetime({ error: "A valid 'to' date is required." }),
  })
  .refine((data) => new Date(data.from) <= new Date(data.to), {
    message: "'from' must be earlier than 'to'.",
    path: ["from"],
  });

module.exports = { createDiaryEntrySchema, diaryQuerySchema };
