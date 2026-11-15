// Fills YOUR database with fictional demo data.
// WARNING: it first deletes all eBeba data in that database.
//
//   npm run seed -- --yes
//
// Use your own database (see .env.example). Never run it on the shared or production database.
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

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI in .env.");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production") {
    console.error("The seed never runs in production.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const dbName = mongoose.connection.name;

  if (!process.argv.includes("--yes")) {
    console.log(
      `\nThis DELETES all eBeba data in the database "${dbName}" and adds demo data.`,
    );
    console.log("Is this YOUR database? Then run:  npm run seed -- --yes\n");
    await mongoose.disconnect();
    return;
  }

  console.log(`Seeding database "${dbName}"…`);
  const data = buildSeedData({
    hashedPassword: await bcrypt.hash(PASSWORD, 12),
  });

  for (const [name, Model] of Object.entries(MODELS)) {
    await Model.deleteMany({});
    if (data[name]?.length) await Model.insertMany(data[name]);
    await Model.syncIndexes(); // unique indexes exist before anyone starts
    console.log(`  ${name.padEnd(20)} ${data[name]?.length || 0}`);
  }

  console.log(`\nDone. Every account uses the password: ${PASSWORD}\n`);
  for (const [who, email] of LOGINS)
    console.log(`  ${who.padEnd(42)} ${email}`);
  console.log(`\nPetrović baby id: ${IDS.babyPetrovic}\n`);

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
