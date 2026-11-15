// AUDIT SERVICE – STUB
// Owner: Auth service (Epic 1), task A2.
// The function name and arguments are final: call it now in your stories.
// TODO A2: save an AuditLog document instead of writing to the console.
//          If saving fails, log the error and do NOT throw: the user's action must still work.

/**
 * @param {object} entry
 * @param {object} entry.actor             req.user
 * @param {string} entry.action            e.g. "diary_entry.create"
 * @param {string} entry.targetCollection  e.g. "diaryEntries"
 * @param {*}      entry.targetDocumentId  the document's _id
 * @param {object} [entry.changes]         { before, after }
 */
const log = async ({ actor, action, targetCollection, targetDocumentId }) => {
  console.log(
    `[audit stub] ${actor?.role} ${actor?._id} ${action} ${targetCollection}/${targetDocumentId}`,
  );
};

module.exports = { log };
