
// eBeba — Demo Database Seeder
// WARNING: Deletes existing eBeba data in the selected database.
// Only the dedicated ebeba_demo_local database is permitted.

const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const dotenv = require("dotenv");
dotenv.config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { IDS, LOGINS, buildSeedData } = require("./data");

const MODELS = {
  institutions: require("../models/Institution"),
  users: require("../models/User"),
  babies: require("../models/Baby"),
  registrations: require("../models/Registration"),
  certificates: require("../models/Certificate"),
  cswCases: require("../models/CswCase"),
  insuranceRecords: require("../models/InsuranceRecord"),
  medicalRecords: require("../models/MedicalRecord"),
  vaccinations: require("../models/Vaccination"),
  appointments: require("../models/Appointment"),
  diaryEntries: require("../models/DiaryEntry"),
  growthMeasurements: require("../models/GrowthMeasurement"),
  milestones: require("../models/Milestone"),
  notifications: require("../models/Notification"),
  auditLogs: require("../models/AuditLog"),
  aiSuggestions: require("../models/AiSuggestion"),
};

const PASSWORD = process.env.SEED_PASSWORD || "eBeba-demo-2026";
const ALLOWED_DATABASE = "ebeba_demo_local";

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI in .env.");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Seed is disabled in production.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB Atlas...");

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });

  const dbName = mongoose.connection.name;

  console.log(`Connected to database: ${dbName}`);

  if (dbName !== ALLOWED_DATABASE) {
    console.error(
      `SEED BLOCKED: "${dbName}" is not the authorized demo database.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!process.argv.includes("--yes")) {
    console.log(
      `\nWARNING: This operation deletes existing eBeba data in "${dbName}".`
    );
    console.log("To confirm, run: npm run seed -- --yes\n");
    await mongoose.disconnect();
    return;
  }

  console.log(`Seeding database "${dbName}"...`);

  const data = buildSeedData({
    hashedPassword: await bcrypt.hash(PASSWORD, 12),
  });

  for (const [name, Model] of Object.entries(MODELS)) {
    await Model.deleteMany({});

    if (data[name]?.length) {
      await Model.insertMany(data[name]);
    }

    await Model.syncIndexes();

    console.log(
      `  ${name.padEnd(20)} ${data[name]?.length || 0}`
    );
  }

  console.log("\nDemo data successfully created.");
  console.log(`Every account uses the password: ${PASSWORD}\n`);

  for (const [who, email] of LOGINS) {
    console.log(`  ${who.padEnd(42)} ${email}`);
  }

  console.log(`\nPetrović baby id: ${IDS.babyPetrovic}\n`);

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
