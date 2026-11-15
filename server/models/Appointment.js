const mongoose = require("mongoose");
const { APPOINTMENT_STATUS } = require("../constants");

const appointmentSchema = new mongoose.Schema(
  {
    babyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    scheduledAt: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      required: true,
      default: APPOINTMENT_STATUS.UPCOMING,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reminderSent: { type: Boolean, required: true, default: false },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, collection: "appointments" },
);

appointmentSchema.index({ babyId: 1, scheduledAt: 1 });
appointmentSchema.index({ reminderSent: 1, scheduledAt: 1 }); // reminder job

module.exports = mongoose.model("Appointment", appointmentSchema);
