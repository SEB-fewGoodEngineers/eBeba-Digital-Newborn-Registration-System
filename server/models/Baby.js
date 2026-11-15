const mongoose = require("mongoose");
const parentInfoSchema = require("./schemas/parentInfo");
const { GENDERS, FAMILY_TYPES } = require("../constants");

// The birth record. Created by hospital staff (Epic 1).
// Fields marked "on approval" are written only by the workflow service.
const babySchema = new mongoose.Schema(
  {
    birthRecordNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gender: { type: String, enum: Object.values(GENDERS), required: true },
    birthDateTime: { type: Date, required: true },
    placeOfBirth: { type: String, required: true, trim: true },
    municipalityOfBirth: { type: String, required: true, trim: true },
    birthWeightGrams: { type: Number, min: 300, max: 7000 },
    birthLengthCm: { type: Number, min: 20, max: 70 },
    familyType: {
      type: String,
      enum: Object.values(FAMILY_TYPES),
      required: true,
    },
    mother: { type: parentInfoSchema, required: true },
    father: { type: parentInfoSchema }, // left out for single_parent and unknown_father
    // Parents and guardians who can see this baby (filled by linking, story 1.2)
    authorizedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // On approval
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    residentialAddress: { type: String, trim: true },
    // Optional and unique: NO default. A null value would break the unique index.
    jmbg: { type: String, unique: true, sparse: true },
    registeredAt: { type: Date },

    // Set by FZO staff (story 3.5). The only place the pediatrician is stored.
    assignedPediatricianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true, collection: "babies" },
);

babySchema.index({ hospitalId: 1, createdAt: -1 }); // hospital birth list
babySchema.index({ authorizedUserIds: 1 }); // a parent's babies
babySchema.index({ assignedPediatricianId: 1 }); // pediatrician's list

module.exports = mongoose.model("Baby", babySchema);
