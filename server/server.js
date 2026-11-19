const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = require("./app");
const { setSocketServer } = require("./services/notifications");
const {
  authenticateNotificationSocket,
} = require("./services/notifications/socketAuth");
const { startReminderJob } = require("./services/notifications/reminders");

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

const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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

// Authenticate every Socket.io connection before allowing access.
io.use(authenticateNotificationSocket);

// Room membership is assigned exclusively by the server.
io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
});

setSocketServer(io);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
    server.listen(port, () => {
      console.log(`The eBeba API is ready on port ${port}!`);
    });

    // N3: daily reminders (the admin can also run them with a button)
    startReminderJob();
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
