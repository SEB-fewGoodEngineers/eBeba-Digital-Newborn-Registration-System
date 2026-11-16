const { z } = require("zod");

const createGrowthMeasurementSchema = z.object({
  measuredAt: z.iso.datetime({
    error: "Please enter a valid measurement date.",
  }),
  weightGrams: z
    .number({ error: "Weight is required." })
    .int("Weight must be a whole number in grams.")
    .min(300, "Weight must be at least 300 g.")
    .max(30000, "Weight cannot be more than 30,000 g."),
  heightCm: z
    .number({ error: "Height is required." })
    .min(20, "Height must be at least 20 cm.")
    .max(130, "Height cannot be more than 130 cm."),
  headCircumferenceCm: z
    .number({ error: "Head circumference must be a number." })
    .min(20, "Head circumference must be at least 20 cm.")
    .max(60, "Head circumference cannot be more than 60 cm.")
    .optional(),
});

module.exports = { createGrowthMeasurementSchema };
