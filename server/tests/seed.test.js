// Checks that every seed document is valid for its model, without a database.
const { test } = require("node:test");
const assert = require("node:assert");
const { buildSeedData, IDS } = require("../seed/data");

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
};

const data = buildSeedData({ hashedPassword: "not-a-real-hash" });

for (const [name, docs] of Object.entries(data)) {
  test(`seed: every ${name} document is valid`, () => {
    for (const doc of docs) {
      const error = new MODELS[name](doc).validateSync();
      assert.strictEqual(error, undefined, error?.message);
    }
  });
}

test("seed: the Petrović baby has the id used in the docs", () => {
  assert.strictEqual(IDS.babyPetrovic, "64b000000000000000000001");
  assert.ok(data.babies.some((b) => b._id === IDS.babyPetrovic));
});

test("seed: unique values are really unique", () => {
  const unique = [
    ["users", "email"],
    ["babies", "birthRecordNumber"],
    ["babies", "jmbg"],
    ["institutions", "code"],
    ["certificates", "verificationCode"],
  ];
  for (const [name, field] of unique) {
    const values = data[name].map((d) => d[field]).filter(Boolean);
    assert.strictEqual(new Set(values).size, values.length, `${name}.${field}`);
  }
});

test("seed: there are diary entries for today", () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  assert.ok(data.diaryEntries.some((e) => e.recordedAt >= start));
});

test("seed: every staff user's institution matches their role", () => {
  const { ROLE_INSTITUTION_TYPE } = require("../constants");
  const byId = Object.fromEntries(data.institutions.map((i) => [i._id, i]));
  for (const u of data.users.filter((u) => ROLE_INSTITUTION_TYPE[u.role])) {
    assert.strictEqual(
      byId[u.institutionId].type,
      ROLE_INSTITUTION_TYPE[u.role],
      u.email,
    );
  }
});
