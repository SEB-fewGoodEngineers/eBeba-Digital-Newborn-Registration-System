const mongoose = require("mongoose");
const { MEDICAL_RECORD_TYPES, ENTRY_SOURCES } = require("../constants");

// BabyHealth record. Parents cannot edit pediatrician entries, and pediatricians
// cannot edit parent entries.
const medicalRecordSchema = new mongoose.Schema(
  {
    babyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      required: true,
    },
    recordType: {
      type: String,
      enum: Object.values(MEDICAL_RECORD_TYPES),
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    doctorRecommendations: { type: String, trim: true, maxlength: 2000 },
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
    examinationDate: { type: Date, required: true },
  },
  { timestamps: true, collection: "medicalRecords" },
);

medicalRecordSchema.index({ babyId: 1, examinationDate: -1 });

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
