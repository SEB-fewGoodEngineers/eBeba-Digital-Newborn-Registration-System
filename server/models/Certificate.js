const mongoose = require("mongoose");

// The registration certificate. Created by workflow.approveRegistration().
// The PDF is generated when downloaded, not stored.
const certificateSchema = new mongoose.Schema(
  {
    babyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      required: true,
      unique: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
    },
    certificateNumber: { type: String, required: true, unique: true }, // DEMO format
    jmbg: { type: String, required: true }, // copy at issue time
    // crypto.randomUUID(). The public /verify/:code page shows no names or numbers.
    verificationCode: { type: String, required: true, unique: true },
    pdfGenerated: { type: Boolean, default: false },
    pdfFileId: { type: mongoose.Schema.Types.ObjectId },
    issuedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issuedAt: { type: Date, required: true, default: Date.now },
    isDemo: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: "certificates" },
);

module.exports = mongoose.model("Certificate", certificateSchema);
