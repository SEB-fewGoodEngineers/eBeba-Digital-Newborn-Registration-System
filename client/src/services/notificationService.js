import { api } from "./api";

// My notifications, newest first.
export const getNotifications = () => api("/notifications");

// Marks one of my notifications as read. Returns the updated notification.
export const markNotificationRead = (notificationId) =>
  api(`/notifications/${notificationId}/read`, { method: "PATCH" });

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
