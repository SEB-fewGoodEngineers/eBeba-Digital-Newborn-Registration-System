
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");

const errorHandler = require("./middleware/errorHandler");
const authRouter = require("./controllers/auth");
const userRouter = require("./controllers/users");
const cswCasesRouter = require("./controllers/cswCases");
const aiSuggestionsRouter = require("./controllers/aiSuggestions");
const insuranceRecordsRouter = require("./controllers/insuranceRecords");
const registrationRouter = require("./controllers/registrations");
const babiesRouter = require("./controllers/babies");
const diaryEntriesRouter = require("./controllers/diaryEntries");
const growthMeasurementsRouter = require("./controllers/growthMeasurements");
const milestonesRouter = require("./controllers/milestones");
const medicalRecordsRouter = require("./controllers/medicalRecords");
const adminRouter = require("./controllers/admin");
const notificationsRouter = require("./controllers/notifications");
const dashboardRouter = require("./controllers/dashboard");
const appointmentsRouter = require("./controllers/appointments");

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
app.use("/babies/:babyId/milestones", milestonesRouter);

if (process.env.NODE_ENV !== "test") app.use(logger("dev"));

app.get("/", (req, res) => {
  res.json({ status: "ok", app: "eBeba API" });
});

// Registracija ruti u app.js:
app.use("/", aiSuggestionsRouter); // Zato što ima prefikse /registrations i /ai-suggestions
app.use("/insurance-records", require("./controllers/insuranceRecords"));

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/admin", adminRouter);
app.use("/csw-cases", require("./controllers/cswCases"));
app.use("/registrations", registrationRouter);
app.use("/babies", babiesRouter);
app.use("/babies/:babyId/diary-entries", diaryEntriesRouter);
app.use("/babies/:babyId/growth-measurements", growthMeasurementsRouter);
app.use("/babies/:babyId/medical-records", medicalRecordsRouter);
app.use("/notifications", notificationsRouter);
// STORY 4.2 - PARENT DASHBOARD
app.use("/dashboard", dashboardRouter);
// STORY 4.4 - APPOINTMENTS
app.use("/babies/:babyId/appointments", appointmentsRouter);

// Unknown route
app.use((req, res) => {
  res.status(404).json({ err: "Not found." });
});

// Must be last
app.use(errorHandler);

module.exports = app;
