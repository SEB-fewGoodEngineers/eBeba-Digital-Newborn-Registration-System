const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const MedicalRecord = require("../models/MedicalRecord");
const Vaccination = require("../models/Vaccination");
const Notification = require("../models/Notification");
const audit = require("../services/audit");
const { ROLES, ENTRY_SOURCES, MEDICAL_RECORD_TYPES } = require("../constants");

// Fictional ids and data only. No database connection is needed.
const PEDIATRICIAN_ID = "507f1f77bcf86cd799439061";
const OTHER_PEDIATRICIAN_ID = "507f1f77bcf86cd799439062";
const PARENT_A = "507f1f77bcf86cd799439063";
const PARENT_B = "507f1f77bcf86cd799439064";
const BABY_ID = "507f1f77bcf86cd799439065";
const RECORD_ID = "507f1f77bcf86cd799439066";
const TEST_SECRET = "synthetic-4-5-secret-for-testing-only";

const users = {
  [PEDIATRICIAN_ID]: {
    _id: PEDIATRICIAN_ID,
    role: ROLES.PEDIATRICIAN,
    isActive: true,
  },
  [OTHER_PEDIATRICIAN_ID]: {
    _id: OTHER_PEDIATRICIAN_ID,
    role: ROLES.PEDIATRICIAN,
    isActive: true,
  },
  [PARENT_A]: { _id: PARENT_A, role: ROLES.PARENT, isActive: true },
};

const baby = {
  _id: BABY_ID,
  authorizedUserIds: [PARENT_A, PARENT_B],
  assignedPediatricianId: PEDIATRICIAN_ID,
};

const original = {
  userFindById: User.findById,
  babyFindById: Baby.findById,
  babyFind: Baby.find,
  recordCreate: MedicalRecord.create,
  recordFindOne: MedicalRecord.findOne,
  vaccinationCreate: Vaccination.create,
  notificationCreate: Notification.create,
  auditLog: audit.log,
  secret: process.env.JWT_SECRET,
};

let server;
let baseUrl;
let notificationsSaved;

const tokenFor = (userId) =>
  jwt.sign(
    { payload: { _id: userId, role: users[userId].role } },
    TEST_SECRET,
    { expiresIn: "1h" },
  );

const request = (path, { method = "GET", userId, body } = {}) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

const examination = {
  recordType: MEDICAL_RECORD_TYPES.EXAMINATION,
  title: "Routine examination (demo)",
  description: "Fictional examination note.",
  examinationDate: "2026-11-16T09:00:00.000Z",
};

const vaccination = {
  vaccineName: "Vaccine A (demo)",
  doseNumber: 1,
  scheduledDate: "2026-12-01T09:00:00.000Z",
};

before(async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  User.findById = async (id) => users[String(id)] || null;
  Baby.findById = async (id) => (String(id) === BABY_ID ? baby : null);
  audit.log = async () => {};

  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  Baby.find = original.babyFind;
  MedicalRecord.create = original.recordCreate;
  MedicalRecord.findOne = original.recordFindOne;
  Vaccination.create = original.vaccinationCreate;
  Notification.create = original.notificationCreate;
});

after(async () => {
  User.findById = original.userFindById;
  Baby.findById = original.babyFindById;
  audit.log = original.auditLog;
  process.env.JWT_SECRET = original.secret;
  await new Promise((resolve) => server.close(resolve));
});

// Capture saved notifications without a database.
const captureNotifications = () => {
  notificationsSaved = [];
  Notification.create = async (data) => {
    notificationsSaved.push(data);
    return { _id: `n${notificationsSaved.length}`, ...data };
  };
};

// ---------- GET /pediatrician/babies ----------

test("GET /pediatrician/babies needs a token", async () => {
  const response = await request("/pediatrician/babies");

  assert.equal(response.status, 401);
});

test("GET /pediatrician/babies is refused for a parent", async () => {
  const response = await request("/pediatrician/babies", {
    userId: PARENT_A,
  });

  assert.equal(response.status, 403);
});

test("GET /pediatrician/babies lists only the babies assigned to me", async () => {
  let filter;
  let fields;
  Baby.find = (f) => {
    filter = f;
    const query = {
      select(s) {
        fields = s;
        return query;
      },
      sort: () => query,
      lean: async () => [{ _id: BABY_ID, firstName: "Demo" }],
    };
    return query;
  };

  const response = await request("/pediatrician/babies", {
    userId: PEDIATRICIAN_ID,
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length, 1);
  // The filter comes from the token, never from the request.
  assert.equal(String(filter.assignedPediatricianId), PEDIATRICIAN_ID);
  assert.ok(!fields.includes("jmbg"));
  assert.ok(!fields.includes("mother"));
});

// ---------- Clinical entries ----------

test("a pediatrician's examination is pediatrician-entered and notifies every parent", async () => {
  captureNotifications();
  let saved;
  MedicalRecord.create = async (data) => {
    saved = data;
    return { _id: RECORD_ID, ...data };
  };

  const response = await request(`/babies/${BABY_ID}/medical-records`, {
    method: "POST",
    userId: PEDIATRICIAN_ID,
    body: { ...examination, entrySource: ENTRY_SOURCES.PARENT },
  });

  assert.equal(response.status, 201);
  assert.equal(saved.entrySource, ENTRY_SOURCES.PEDIATRICIAN);
  assert.equal(String(saved.authorUserId), PEDIATRICIAN_ID);

  assert.deepEqual(
    notificationsSaved.map((n) => String(n.recipientUserId)),
    [PARENT_A, PARENT_B],
  );
  for (const notification of notificationsSaved) {
    assert.equal(notification.type, "medical_record.added_by_pediatrician");
    assert.equal(notification.link, "/dashboard");
    // The examination title is never in the message.
    assert.ok(!notification.message.includes(examination.title));
  }
});

test("a pediatrician's vaccination notifies every parent", async () => {
  captureNotifications();
  let saved;
  Vaccination.create = async (data) => {
    saved = data;
    return { _id: RECORD_ID, ...data };
  };

  const response = await request(`/babies/${BABY_ID}/vaccinations`, {
    method: "POST",
    userId: PEDIATRICIAN_ID,
    body: vaccination,
  });

  assert.equal(response.status, 201);
  assert.equal(saved.entrySource, ENTRY_SOURCES.PEDIATRICIAN);
  assert.equal(notificationsSaved.length, 2);
  assert.equal(notificationsSaved[0].type, "vaccination.added_by_pediatrician");
  assert.ok(!notificationsSaved[0].message.includes(vaccination.vaccineName));
});

test("a parent's own entry does not notify anyone", async () => {
  captureNotifications();
  MedicalRecord.create = async (data) => ({ _id: RECORD_ID, ...data });

  const response = await request(`/babies/${BABY_ID}/medical-records`, {
    method: "POST",
    userId: PARENT_A,
    body: examination,
  });

  assert.equal(response.status, 201);
  assert.equal(notificationsSaved.length, 0);
});

test("a failed notification does not fail the saved entry", async () => {
  Notification.create = async () => {
    throw new Error("database down");
  };
  MedicalRecord.create = async (data) => ({ _id: RECORD_ID, ...data });
  const originalError = console.error;
  console.error = () => {};

  try {
    const response = await request(`/babies/${BABY_ID}/medical-records`, {
      method: "POST",
      userId: PEDIATRICIAN_ID,
      body: examination,
    });

    assert.equal(response.status, 201);
  } finally {
    console.error = originalError;
  }
});

test("a pediatrician cannot change a parent's entry (403)", async () => {
  MedicalRecord.findOne = async () => ({
    _id: RECORD_ID,
    babyId: BABY_ID,
    entrySource: ENTRY_SOURCES.PARENT,
  });

  const response = await request(
    `/babies/${BABY_ID}/medical-records/${RECORD_ID}`,
    {
      method: "PATCH",
      userId: PEDIATRICIAN_ID,
      body: { title: "Changed (demo)" },
    },
  );

  assert.equal(response.status, 403);
});

test("a pediatrician who is not assigned to the baby gets 403", async () => {
  const response = await request(`/babies/${BABY_ID}/medical-records`, {
    userId: OTHER_PEDIATRICIAN_ID,
  });

  assert.equal(response.status, 403);
});
