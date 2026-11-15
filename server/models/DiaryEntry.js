const mongoose = require("mongoose");
const {
  DIARY_CATEGORIES,
  FEEDING_METHODS,
  DIAPER_TYPES,
} = require("../constants");

// Only the details for the chosen category are filled (checked by the Zod schema).
const detailsSchema = new mongoose.Schema(
  {
    method: { type: String, enum: Object.values(FEEDING_METHODS) }, // feeding
    amountMl: { type: Number, min: 0, max: 1000 }, // feeding
    durationMinutes: { type: Number, min: 1, max: 1440 }, // sleep
    diaperType: { type: String, enum: Object.values(DIAPER_TYPES) }, // diaper
    temperatureCelsius: { type: Number, min: 34, max: 43 }, // temperature
  },
  { _id: false },
);

const diaryEntrySchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: Object.values(DIARY_CATEGORIES),
      required: true,
    },
    recordedAt: { type: Date, required: true },
    details: { type: detailsSchema, default: () => ({}) },
    notes: { type: String, trim: true, maxlength: 500 }, // the only field for "activity"
  },
  { timestamps: true, collection: "diaryEntries" },
);

diaryEntrySchema.index({ babyId: 1, recordedAt: -1 }); // today's entries

module.exports = mongoose.model("DiaryEntry", diaryEntrySchema);
