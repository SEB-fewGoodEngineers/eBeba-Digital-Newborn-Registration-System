const mongoose = require("mongoose");

// Messages never contain a JMBG or medical details.
// Email and SMS are simulated: the Demo inbox shows them.
const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    babyId: { type: mongoose.Schema.Types.ObjectId, ref: "Baby" },
    birthRecordNumber: { type: String, trim: true, maxlength: 100 },
    type: { type: String, required: true, trim: true }, // e.g. "registration.approved"
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, trim: true }, // client route
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
    },
    readAt: { type: Date },
  },
  { timestamps: true, collection: "notifications" },
);

notificationSchema.index({ recipientUserId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
