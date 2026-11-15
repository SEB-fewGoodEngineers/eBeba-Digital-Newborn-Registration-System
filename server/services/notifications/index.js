// NOTIFICATIONS SERVICE – STUB
// Owner: Notifications service (Epic 4), tasks N1–N3.
// The function name and arguments are final: call it now in your stories.
// TODO N1: save a Notification document and send it live with Socket.io.
// Rule: messages never contain a JMBG or medical details.

/**
 * @param {*}      userId    who gets it
 * @param {object} notification
 * @param {string} notification.type     e.g. "registration.approved"
 * @param {string} notification.title
 * @param {string} notification.message  no JMBG, no medical details
 * @param {string} [notification.link]   client route, e.g. "/dashboard"
 * @param {*}      [notification.babyId]
 */
const notify = async (userId, { type, title }) => {
  console.log(`[notify stub] to ${userId}: ${type} – ${title}`);
};

// Notify several users at once (for example both parents)
const notifyMany = async (userIds, notification) => {
  await Promise.all(userIds.map((id) => notify(id, notification)));
};

module.exports = { notify, notifyMany };
