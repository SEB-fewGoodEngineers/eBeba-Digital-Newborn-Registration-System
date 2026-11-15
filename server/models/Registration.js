const mongoose = require("mongoose");
const statusChangeSchema = require("./schemas/statusChange");
const { REGISTRATION_STATUS } = require("../constants");

// The parent's application to MoI. One per baby. Status changes only through workflow.transition().
const registrationSchema = new mongoose.Schema(
  {
    babyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      required: true,
      unique: true,
    },
    submittedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proposedFirstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    proposedLastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    residentialAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    municipality: { type: String, required: true, trim: true }, // routes CSW and FZO
    status: {
      type: String,
      enum: Object.values(REGISTRATION_STATUS),
      required: true,
      default: REGISTRATION_STATUS.PENDING,
    },
    reviewerNotes: { type: String, trim: true, maxlength: 1000 },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    statusHistory: [statusChangeSchema],
  },
  { timestamps: true, collection: "registrations" },
);

registrationSchema.index({ status: 1, createdAt: 1 }); // MoI queue, oldest first

module.exports = mongoose.model("Registration", registrationSchema);
