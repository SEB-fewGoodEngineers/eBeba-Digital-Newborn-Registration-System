const mongoose = require("mongoose");

// One entry in statusHistory (registrations, cswCases, insuranceRecords).
// Written only by the workflow service's transition().
const statusChangeSchema = new mongoose.Schema(
  {
    from: { type: String },
    to: { type: String, required: true },
    byUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    at: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

module.exports = statusChangeSchema;
