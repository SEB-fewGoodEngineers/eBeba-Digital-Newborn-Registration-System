const mongoose = require("mongoose");
const {
  AI_SUGGESTION_KINDS,
  AI_FLAG_SOURCES,
  AI_FLAG_DECISIONS,
} = require("../constants");

// One flag from the pre-check. Keeps its own _id, so the officer can decide on each flag.
const aiFlagSchema = new mongoose.Schema({
  field: { type: String, required: true, trim: true }, // e.g. "proposedLastName"
  message: { type: String, required: true, trim: true, maxlength: 500 },
  source: {
    type: String,
    enum: Object.values(AI_FLAG_SOURCES),
    required: true,
  },
  decision: {
    type: String,
    enum: Object.values(AI_FLAG_DECISIONS),
    required: true,
    default: AI_FLAG_DECISIONS.PENDING,
  },
  decidedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  decidedAt: { type: Date },
});

// AI suggests, a human decides, the action is logged.
const aiSuggestionSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: Object.values(AI_SUGGESTION_KINDS),
      required: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
    },
    provider: { type: String, required: true }, // "mock" until the provider is chosen
    model: { type: String },
    flags: [aiFlagSchema],
    aiAvailable: { type: Boolean, required: true }, // false = only rule flags
    requestedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, collection: "aiSuggestions" },
);

aiSuggestionSchema.index({ registrationId: 1 });

module.exports = mongoose.model("AiSuggestion", aiSuggestionSchema);
