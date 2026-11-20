
const Notification = require("../../models/Notification");
const { getNotificationTemplate } = require("./templates");

let io = null;

// Attach the Socket.io server.
const setSocketServer = (socketServer) => {
  io = socketServer;
};

// Disconnect all active sockets belonging to one user.
const disconnectNotificationUser = (userId) => {
  if (!io) {
    return;
  }

  try {
    io.in(`user:${String(userId)}`).disconnectSockets(true);
  } catch {
    // Account deactivation and audit logging must continue.
    console.error("Failed to disconnect notification sockets.");
  }
};

// Save and deliver an approved notification.
const notify = async (
  userId,
  { type, title, message, link, babyId, birthRecordNumber } = {},
) => {
  // Reject JMBG values before processing the notification.
  const inputText = [type, title, message, link]
    .filter((value) => typeof value === "string")
    .join(" ");

  if (/\d{13}/.test(inputText)) {
    throw new Error("Notifications must not contain a JMBG.");
  }

  // Only approved notification types are accepted.
  // Never save caller-provided titles or message text.
  const template = getNotificationTemplate(type);

  // Only the birth-record template may carry a record number.
  if (birthRecordNumber !== undefined) {
    if (
      type !== "birth_record.created" ||
      typeof birthRecordNumber !== "string" ||
      !/^BR-[A-Za-z0-9-]{1,97}$/.test(birthRecordNumber)
    ) {
      throw new Error("Invalid birth record number for notification.");
    }
  }
  if (type === "birth_record.created" && !birthRecordNumber) {
    throw new Error("Birth record number is required.");
  }

  // Only approved navigation destinations may be included.
  const allowedLink =
    link === "/dashboard" ||
    (type === "birth_record.created" && link === "/babies/link");
  if (link !== undefined && !allowedLink) {
    throw new Error("Notification link is not allowed.");
  }

  const notification = await Notification.create({
    recipientUserId: userId,
    type,
    title: template.title,
    message: template.message,
    ...(link ? { link } : {}),
    ...(babyId ? { babyId } : {}),
    ...(birthRecordNumber ? { birthRecordNumber } : {}),
  });

  // Deliver only the saved, approved notification fields.
  if (io) {
    try {
      io.to(`user:${String(userId)}`).emit("notification:new", {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        babyId: notification.babyId,
        birthRecordNumber: notification.birthRecordNumber,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
      });
    } catch {
      // The saved notification can still be loaded later.
      console.error("Live notification delivery failed.");
    }
  }

  return notification;
};

// Send an approved notification to multiple recipients.
const notifyMany = async (userIds, notification) => {
  return Promise.all(
    userIds.map((userId) => notify(userId, notification)),
  );
};

// Tell a baby's linked parents about a change (Story 4.5).
// The change is already saved, so a failed delivery only writes to the log.
const notifyParents = async (baby, { type, link = "/dashboard" }) => {
  const parentIds = baby?.authorizedUserIds || [];
  if (parentIds.length === 0) {
    return [];
  }

  try {
    return await notifyMany(parentIds, { type, link, babyId: baby._id });
  } catch {
    console.error("Parent notification failed.");
    return [];
  }
};

module.exports = {
  notify,
  notifyMany,
  notifyParents,
  setSocketServer,
  disconnectNotificationUser,
};
