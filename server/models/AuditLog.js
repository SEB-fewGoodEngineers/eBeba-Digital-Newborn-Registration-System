const mongoose = require("mongoose");
const { ROLES } = require("../constants");

// Append-only: there is no route that updates or deletes audit entries.
const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: { type: String, enum: Object.values(ROLES), required: true },
    action: { type: String, required: true, trim: true }, // e.g. "registration.approve"
    targetCollection: { type: String, required: true, trim: true },
    targetDocumentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
    },
  },
  // Entries are never updated, so there is no updatedAt
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "auditLogs",
  },
);

auditLogSchema.index({ targetCollection: 1, targetDocumentId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
