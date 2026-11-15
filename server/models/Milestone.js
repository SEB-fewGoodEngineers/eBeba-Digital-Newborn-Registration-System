const mongoose = require("mongoose");
const { MILESTONE_CATEGORIES } = require("../constants");

const milestoneSchema = new mongoose.Schema(
  {
    babyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      required: true,
    },
    loggedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(MILESTONE_CATEGORIES),
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 }, // e.g. "First smile"
    achievedAt: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, collection: "milestones" },
);

milestoneSchema.index({ babyId: 1, achievedAt: -1 });

module.exports = mongoose.model("Milestone", milestoneSchema);
