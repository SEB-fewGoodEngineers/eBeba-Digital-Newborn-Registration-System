
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = require("./app");
const User = require("./models/User");
const { setSocketServer } = require("./services/notifications");

// Stop early if a required setting is missing.
for (const key of ["MONGODB_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(
      `Missing ${key} in .env. Copy .env.example to .env and fill it in.`,
    );
    process.exit(1);
  }
}

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const allowedOrigins = (
  process.env.CLIENT_ORIGINS || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Socket.io uses the same HTTP server as Express.
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    callback(null, !origin || allowedOrigins.includes(origin));
  },
});

// Authenticate every new Socket.io connection.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string" || !token) {
      return next(new Error("Authentication required."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.payload?._id;

    if (!mongoose.isValidObjectId(userId)) {
      return next(new Error("Authentication required."));
    }

    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      return next(new Error("Authentication required."));
    }

    socket.data.userId = String(user._id);
    return next();
  } catch {
    // Never expose tokens or authentication details.
    console.error("Socket authentication failed.");
    return next(new Error("Authentication required."));
  }
});

// Users can join only their own server-assigned room.
io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
});

// Allow the notification service to deliver live events.
setSocketServer(io);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
    server.listen(port, () => {
      console.log(`The eBeba API is ready on port ${port}!`);
    });
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
