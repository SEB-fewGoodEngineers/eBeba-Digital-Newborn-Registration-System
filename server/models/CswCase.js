const mongoose = require("mongoose");
const statusChangeSchema = require("./schemas/statusChange");
const { CSW_CASE_STATUS } = require("../constants");

// Social Work Center case. Created by workflow.approveRegistration(), never before approval.
const cswCaseSchema = new mongoose.Schema(
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
    cswInstitutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CSW_CASE_STATUS),
      required: true,
      default: CSW_CASE_STATUS.RECEIVED,
    },
    // Set on completed. DEMO format. Optional and unique: NO default.
    socialCardNumber: { type: String, unique: true, sparse: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    processedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
    statusHistory: [statusChangeSchema],
  },
  { timestamps: true, collection: "cswCases" },
);

cswCaseSchema.index({ cswInstitutionId: 1, status: 1 }); // CSW case list

module.exports = mongoose.model("CswCase", cswCaseSchema);
