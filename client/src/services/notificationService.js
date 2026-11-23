import { connectNotificationSocket } from "./socket";
import { api } from "./api";

// My notifications, newest first.
export const getNotifications = () => api("/notifications");

// Marks one of my notifications as read. Returns the updated notification.
export const markNotificationRead = (notificationId) =>
  api(`/notifications/${notificationId}/read`, { method: "PATCH" });

// N3: the admin runs the reminder job now. Returns the counts.
export const runRemindersNow = () =>
  api("/admin/run-reminders", { method: "POST" });

// Only follow links inside our own app ("/dashboard"), never "//other.site"
// or "https://...". The server also allows only approved links.
export const isInternalLink = (link) =>
  typeof link === "string" && /^\/(?![/\\])/.test(link);

// Put a live notification at the top of a list, without duplicates.
export const addNotification = (list, notification) => [
  notification,
  ...list.filter((item) => item._id !== notification._id),
];

// Replace one notification in a list (for example after it was read).
export const replaceNotification = (list, notification) =>
  list.map((item) => (item._id === notification._id ? notification : item));

// Listen before fetching so an event that arrives during the request is retained.
export const watchNotifications = (setList, ready, failed) => {
  const socket = connectNotificationSocket();
  let revision = 0;
  let pending = null;

  const receive = (item) => {
    pending?.push(item);
    setList((list) => addNotification(list, item));
  };
  const load = async () => {
    const request = ++revision;
    pending = [];
    try {
      const snapshot = await getNotifications();
      if (request !== revision) return;
      const known = new Set(snapshot.map((item) => item._id));
      const incoming = pending.filter((item) => !known.has(item._id));
      const merged = incoming.reduce(addNotification, snapshot);
      setList((previous) => {
        const read = new Map(previous.filter((item) => item.readAt).map((item) => [item._id, item.readAt]));
        return merged.map((item) => !item.readAt && read.has(item._id)
          ? { ...item, readAt: read.get(item._id) } : item);
      });
      ready();
    } catch (error) {
      if (request === revision) failed(error);
    } finally {
      if (request === revision) pending = null;
    }
  };
  socket?.on("notification:new", receive);
  socket?.on("connect", load);
  load();
  return () => {
    revision++;
    socket?.off("notification:new", receive);
    socket?.off("connect", load);
  };
};
