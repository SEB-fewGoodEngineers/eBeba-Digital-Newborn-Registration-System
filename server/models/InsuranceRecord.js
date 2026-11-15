const mongoose = require("mongoose");
const statusChangeSchema = require("./schemas/statusChange");
const { INSURANCE_STATUS } = require("../constants");

// Health Insurance Fund (FZO) record. Created by workflow.approveRegistration(), never before approval.
const insuranceRecordSchema = new mongoose.Schema(
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
    fundBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    insuredParentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: Object.values(INSURANCE_STATUS),
      required: true,
      default: INSURANCE_STATUS.RECEIVED,
    },
    // Set on card_issued. DEMO format. Optional and unique: NO defaults.
    policyNumber: { type: String, unique: true, sparse: true },
    healthCardNumber: { type: String, unique: true, sparse: true },
    insuredPersonCardNumber: { type: String, unique: true, sparse: true },
    cardIssuedAt: { type: Date },
    processedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    statusHistory: [statusChangeSchema],
  },
  { timestamps: true, collection: "insuranceRecords" },
);

insuranceRecordSchema.index({ fundBranchId: 1, status: 1 }); // FZO record list

module.exports = mongoose.model("InsuranceRecord", insuranceRecordSchema);
