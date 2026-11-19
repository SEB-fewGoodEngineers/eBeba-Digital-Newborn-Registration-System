const AuditLog = require("../../models/AuditLog");

/**
 * @param {object} entry
 * @param {object} entry.actor             req.user
 * @param {string} entry.action            e.g. "diary_entry.create"
 * @param {string} entry.targetCollection  e.g. "diaryEntries"
 * @param {*}      entry.targetDocumentId  the document's _id
 * @param {object} [entry.changes]         { before, after }
 */
const log = async ({
  actor,
  action,
  targetCollection,
  targetDocumentId,
  changes,
}) => {
  try {
    await AuditLog.create({
      actorUserId: actor._id,
      actorRole: actor.role,
      action,
      targetCollection,
      targetDocumentId,
      changes,
    });
  } catch (err) {
    console.error("Failed to save audit log:", err);
  }
};

module.exports = { log };
