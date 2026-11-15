const mongoose = require("mongoose");
const { INSTITUTION_TYPES } = require("../constants");

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(INSTITUTION_TYPES),
      required: true,
    },
    code: { type: String, required: true, unique: true, trim: true }, // e.g. "HOSP-PG-01"
    municipality: { type: String, required: true, trim: true }, // routes CSW cases and FZO records
    address: { type: String, required: true, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "institutions" },
);

module.exports = mongoose.model("Institution", institutionSchema);
