
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../../models/User");

const authenticationError = () =>
  new Error("Authentication required.");

// Authenticate a Socket.io connection using the existing JWT format.
const authenticateNotificationSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string" || !token) {
      return next(authenticationError());
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.payload?._id;

    if (!mongoose.isValidObjectId(userId)) {
      return next(authenticationError());
    }

    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      return next(authenticationError());
    }

    // Never trust a room name supplied by the client.
    socket.data.userId = String(user._id);

    return next();
  } catch {
    return next(authenticationError());
  }
};

module.exports = { authenticateNotificationSocket };
