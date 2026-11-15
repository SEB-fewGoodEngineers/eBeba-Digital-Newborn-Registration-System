const mongoose = require("mongoose");

const growthMeasurementSchema = new mongoose.Schema(
  {
    babyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      required: true,
    },
    loggedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    measuredAt: { type: Date, required: true },
    weightGrams: { type: Number, required: true, min: 300, max: 30000 },
    heightCm: { type: Number, required: true, min: 20, max: 130 },
    headCircumferenceCm: { type: Number, min: 20, max: 60 },
  },
  { timestamps: true, collection: "growthMeasurements" },
);

growthMeasurementSchema.index({ babyId: 1, measuredAt: -1 });

module.exports = mongoose.model("GrowthMeasurement", growthMeasurementSchema);
