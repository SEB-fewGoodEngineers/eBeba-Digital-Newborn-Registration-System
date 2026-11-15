const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");

const errorHandler = require("./middleware/errorHandler");
const authRouter = require("./controllers/auth");
const userRouter = require("./controllers/users");

const app = express();

// Render runs the app behind one proxy; needed for correct IPs in the rate limiter
app.set("trust proxy", 1);

// Only our own front-end may call the API
const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use(mongoSanitize()); // removes $ and . keys, which block NoSQL injection
if (process.env.NODE_ENV !== "test") app.use(logger("dev"));

app.get("/", (req, res) => {
  res.json({ status: "ok", app: "eBeba API" });
});

app.use("/auth", authRouter);
app.use("/users", userRouter);

// Unknown route
app.use((req, res) => {
  res.status(404).json({ err: "Not found." });
});

// Must be last
app.use(errorHandler);

module.exports = app;
