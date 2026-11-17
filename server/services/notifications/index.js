// NOTIFICATIONS SERVICE – STUB
// Owner: Notifications service (Epic 4), tasks N1–N3.
// The function name and arguments are final: call it now in your stories.
// TODO N1: save a Notification document and send it live with Socket.io.
// Rule: messages never contain a JMBG or medical details.


const Notification = require("../../models/Notification");

// Socket.io will be connected in the next steps.
let io = null;

// Called once when the HTTP server starts.
const setSocketServer = (socketServer) => {
  io = socketServer;
};

// Save a notification and send it live if Socket.io is ready.
const notify = async (
  userId,
  { type, title, message, link, babyId },
) => {
  // Never include a 13-digit personal ID in notifications.
  const publicText = [type, title, message, link]
    .filter((value) => typeof value === "string")
    .join(" ");

  if (/\d{13}/.test(publicText)) {
    throw new Error("Notifications must not contain a JMBG.");
  }

  // Only known notification fields are saved.
  const notification = await Notification.create({
    recipientUserId: userId,
    type,
    title,
    message,
    ...(link ? { link } : {}),
    ...(babyId ? { babyId } : {}),
  });

  // Live delivery is optional. The database record is permanent.
  if (io) {
    try {
      io.to(`user:${String(userId)}`).emit("notification:new", {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        babyId: notification.babyId,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
      });
    } catch {
      // The user can still load saved notifications later.
      console.error("Live notification delivery failed.");
    }
  }

  return notification;
};

// Notify several users, for example both parents.
const notifyMany = async (userIds, notification) => {
  return Promise.all(
    userIds.map((userId) => notify(userId, notification)),
  );
};

module.exports = { notify, notifyMany, setSocketServer };
