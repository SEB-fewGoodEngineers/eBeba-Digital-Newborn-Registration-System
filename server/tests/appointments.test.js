const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const Appointment = require("../models/Appointment");
const audit = require("../services/audit");
const { ROLES, APPOINTMENT_STATUS } = require("../constants");
const {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} = require("../validators/appointments");

// Fictional ids and data only. No database connection is needed.
const PARENT_ID = "507f1f77bcf86cd799439041";
const PEDIATRICIAN_ID = "507f1f77bcf86cd799439042";
const STRANGER_ID = "507f1f77bcf86cd799439043";
const BABY_ID = "507f1f77bcf86cd799439044";
const APPOINTMENT_ID = "507f1f77bcf86cd799439045";
const TEST_SECRET = "synthetic-4-4-secret-for-testing-only";

const inDays = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const validAppointment = () => ({
  title: "Check-up at 2 months (demo)",
  scheduledAt: inDays(7),
  location: "Health centre (demo)",
});

// ---------- Zod schema ----------

test("accepts a valid check-up", () => {
  const result = createAppointmentSchema.safeParse(validAppointment());

  assert.equal(result.success, true);
  assert.ok(result.data.scheduledAt instanceof Date);
});

test("rejects a check-up without a title", () => {
  const body = validAppointment();
  delete body.title;

  const result = createAppointmentSchema.safeParse(body);

  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) => issue.path.join(".") === "title"),
  );
});

test("rejects a check-up without a place", () => {
  const result = createAppointmentSchema.safeParse({
    ...validAppointment(),
    location: " ",
  });

  assert.equal(result.success, false);
});

test("rejects a check-up in the past", () => {
  const result = createAppointmentSchema.safeParse({
    ...validAppointment(),
    scheduledAt: inDays(-1),
  });

  assert.equal(result.success, false);
});

test("removes server fields from the create body", () => {
  const result = createAppointmentSchema.safeParse({
    ...validAppointment(),
    babyId: "fake",
    status: APPOINTMENT_STATUS.COMPLETED,
    createdByUserId: "fake",
    reminderSent: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.babyId, undefined);
  assert.equal(result.data.status, undefined);
  assert.equal(result.data.createdByUserId, undefined);
  assert.equal(result.data.reminderSent, undefined);
});

test("status update accepts completed and cancelled only", () => {
  for (const status of [
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
  ]) {
    assert.equal(
      updateAppointmentStatusSchema.safeParse({ status }).success,
      true,
    );
  }
  assert.equal(
    updateAppointmentStatusSchema.safeParse({
      status: APPOINTMENT_STATUS.UPCOMING,
    }).success,
    false,
  );
  assert.equal(
    updateAppointmentStatusSchema.safeParse({ status: "done" }).success,
    false,
  );
});

// ---------- Routes ----------

const users = {
  [PARENT_ID]: { _id: PARENT_ID, role: ROLES.PARENT, isActive: true },
  [PEDIATRICIAN_ID]: {
    _id: PEDIATRICIAN_ID,
    role: ROLES.PEDIATRICIAN,
    isActive: true,
  },
  [STRANGER_ID]: { _id: STRANGER_ID, role: ROLES.PARENT, isActive: true },
};

const baby = {
  _id: BABY_ID,
  authorizedUserIds: [PARENT_ID],
  assignedPediatricianId: PEDIATRICIAN_ID,
};

const original = {
  userFindById: User.findById,
  babyFindById: Baby.findById,
  find: Appointment.find,
  findOne: Appointment.findOne,
  create: Appointment.create,
  auditLog: audit.log,
  secret: process.env.JWT_SECRET,
};

let server;
let baseUrl;
let auditCalls;

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

// A saved appointment as Mongoose would return it.
const fakeAppointmentDoc = (fields) => {
  const doc = {
    _id: APPOINTMENT_ID,
    babyId: BABY_ID,
    title: "Check-up at 1 month (demo)",
    scheduledAt: new Date(inDays(3)),
    location: "Health centre (demo)",
    status: APPOINTMENT_STATUS.UPCOMING,
    ...fields,
    saved: false,
    set(changes) {
      Object.assign(doc, changes);
    },
    async save() {
      doc.saved = true;
      return doc;
    },
    toObject() {
      return { ...doc };
    },
    toJSON() {
      const { saved, set, save, toObject, toJSON, ...data } = doc;
      return data;
    },
  };
  return doc;
};

const listUrl = `/babies/${BABY_ID}/appointments`;
const itemUrl = `${listUrl}/${APPOINTMENT_ID}`;

before(async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  User.findById = async (id) => users[String(id)] || null;
  Baby.findById = async (id) => (String(id) === BABY_ID ? baby : null);

  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  Appointment.find = original.find;
  Appointment.findOne = original.findOne;
  Appointment.create = original.create;
  audit.log = original.auditLog;
});

after(async () => {
  User.findById = original.userFindById;
  Baby.findById = original.babyFindById;
  process.env.JWT_SECRET = original.secret;
  await new Promise((resolve) => server.close(resolve));
});

const captureAudit = () => {
  auditCalls = [];
  audit.log = async (entry) => {
    auditCalls.push(entry);
  };
};

test("a request without a token gets 401", async () => {
  const response = await request(listUrl);

  assert.equal(response.status, 401);
});

test("a parent without access to the baby gets 403", async () => {
  const response = await request(listUrl, { userId: STRANGER_ID });

  assert.equal(response.status, 403);
});

test("GET lists the baby's check-ups, soonest first", async () => {
  let filter;
  let sort;
  Appointment.find = (f) => {
    filter = f;
    const query = {
      sort(s) {
        sort = s;
        return query;
      },
      lean: async () => [],
    };
    return query;
  };

  const response = await request(listUrl, { userId: PEDIATRICIAN_ID });

  assert.equal(response.status, 200);
  assert.equal(String(filter.babyId), BABY_ID);
  assert.deepEqual(sort, { scheduledAt: 1 });
});

test("POST sets the server fields from the signed-in user", async () => {
  captureAudit();
  let saved;
  Appointment.create = async (data) => {
    saved = data;
    return { _id: APPOINTMENT_ID, ...data };
  };

  const response = await request(listUrl, {
    method: "POST",
    userId: PARENT_ID,
    body: {
      ...validAppointment(),
      status: APPOINTMENT_STATUS.CANCELLED,
      createdByUserId: STRANGER_ID,
      reminderSent: true,
    },
  });

  assert.equal(response.status, 201);
  assert.equal(String(saved.babyId), BABY_ID);
  assert.equal(saved.status, APPOINTMENT_STATUS.UPCOMING);
  assert.equal(String(saved.createdByUserId), PARENT_ID);
  assert.equal(saved.reminderSent, false);
  assert.equal(auditCalls[0].action, "appointment.create");
});

test("POST without a place returns 400", async () => {
  const body = validAppointment();
  delete body.location;

  const response = await request(listUrl, {
    method: "POST",
    userId: PARENT_ID,
    body,
  });

  assert.equal(response.status, 400);
});

test("PATCH marks an upcoming check-up completed", async () => {
  captureAudit();
  const doc = fakeAppointmentDoc();
  Appointment.findOne = async () => doc;

  const response = await request(itemUrl, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { status: APPOINTMENT_STATUS.COMPLETED },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, APPOINTMENT_STATUS.COMPLETED);
  assert.equal(doc.saved, true);
  assert.equal(auditCalls[0].action, "appointment.update_status");
});

test("PATCH refuses a check-up that is no longer upcoming (409)", async () => {
  const doc = fakeAppointmentDoc({ status: APPOINTMENT_STATUS.CANCELLED });
  Appointment.findOne = async () => doc;

  const response = await request(itemUrl, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { status: APPOINTMENT_STATUS.COMPLETED },
  });

  assert.equal(response.status, 409);
  assert.equal(doc.saved, false);
});

test("PATCH refuses status upcoming (400)", async () => {
  const response = await request(itemUrl, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { status: APPOINTMENT_STATUS.UPCOMING },
  });

  assert.equal(response.status, 400);
});

test("PATCH returns 404 for another baby's check-up", async () => {
  let filter;
  Appointment.findOne = async (f) => {
    filter = f;
    return null;
  };

  const response = await request(itemUrl, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { status: APPOINTMENT_STATUS.CANCELLED },
  });

  assert.equal(response.status, 404);
  assert.equal(String(filter.babyId), BABY_ID);
});

test("PATCH returns 404 for an invalid id", async () => {
  const response = await request(`${listUrl}/bad-id`, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { status: APPOINTMENT_STATUS.CANCELLED },
  });

  assert.equal(response.status, 404);
});
