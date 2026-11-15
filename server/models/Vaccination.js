const mongoose = require("mongoose");
const { ENTRY_SOURCES } = require("../constants");

// "Overdue" is not stored: scheduledDate has passed and there is no administeredDate.
const vaccinationSchema = new mongoose.Schema(
  {
    babyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      required: true,
    },
    vaccineName: { type: String, required: true, trim: true, maxlength: 100 },
    doseNumber: { type: Number, required: true, default: 1, min: 1, max: 10 },
    scheduledDate: { type: Date, required: true },
    administeredDate: { type: Date },
    entrySource: {
      type: String,
      enum: Object.values(ENTRY_SOURCES),
      required: true,
    },
    authorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reminderSent: { type: Boolean, required: true, default: false }, // set by the reminder job
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, collection: "vaccinations" },
);

vaccinationSchema.index({ babyId: 1, scheduledDate: 1 });
vaccinationSchema.index({ reminderSent: 1, scheduledDate: 1 }); // reminder job

module.exports = mongoose.model("Vaccination", vaccinationSchema);
