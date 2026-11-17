
import { io } from "socket.io-client";
import { getToken } from "./api";

// Use the same backend URL as the shared API service.
const SERVER_URL = import.meta.env.VITE_BACK_END_SERVER_URL;

// One shared Socket.io connection.
let socket = null;

// Connect only when a user has a token.
export const connectNotificationSocket = () => {
  if (!getToken()) {
    return null;
  }

  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,

      // Read the current token on every connection attempt.
      auth: (callback) => {
        callback({ token: getToken() });
      },
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

// Return the shared socket without creating a new one.
export const getNotificationSocket = () => socket;

// Close the connection and remove listeners on sign-out.
export const disconnectNotificationSocket = () => {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
};

// Subscribe to live notifications.
// Returns a cleanup function for React useEffect.
export const subscribeToNotifications = (handler) => {
  const activeSocket = connectNotificationSocket();

  if (!activeSocket) {
    return () => {};
  }

  activeSocket.on("notification:new", handler);

  return () => {
    activeSocket.off("notification:new", handler);
  };
};
