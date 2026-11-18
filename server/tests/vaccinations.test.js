const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const Vaccination = require("../models/Vaccination");
const audit = require("../services/audit");
const { ROLES, ENTRY_SOURCES } = require("../constants");
const {
  createVaccinationSchema,
  markVaccinationGivenSchema,
} = require("../validators/vaccinations");

// Fictional ids and data only. No database connection is needed.
const PARENT_ID = "507f1f77bcf86cd799439031";
const PEDIATRICIAN_ID = "507f1f77bcf86cd799439032";
const STRANGER_ID = "507f1f77bcf86cd799439033";
const BABY_ID = "507f1f77bcf86cd799439034";
const VACCINATION_ID = "507f1f77bcf86cd799439035";
const TEST_SECRET = "synthetic-4-3-secret-for-testing-only";

const validVaccination = () => ({
  vaccineName: "Vaccine A (demo)",
  doseNumber: 1,
  scheduledDate: "2026-12-01T09:00:00.000Z",
});

// ---------- Zod schema ----------

test("accepts a valid scheduled vaccination", () => {
  const result = createVaccinationSchema.safeParse(validVaccination());

  assert.equal(result.success, true);
  assert.ok(result.data.scheduledDate instanceof Date);
});

test("rejects a vaccination without a scheduled date", () => {
  const body = validVaccination();
  delete body.scheduledDate;

  const result = createVaccinationSchema.safeParse(body);

  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some(
      (issue) => issue.path.join(".") === "scheduledDate",
    ),
  );
});

test("rejects a vaccination without a vaccine name", () => {
  const result = createVaccinationSchema.safeParse({
    ...validVaccination(),
    vaccineName: "  ",
  });

  assert.equal(result.success, false);
});

test("rejects a dose outside 1 to 10", () => {
  const result = createVaccinationSchema.safeParse({
    ...validVaccination(),
    doseNumber: 11,
  });

  assert.equal(result.success, false);
});

test("removes server fields from the create body", () => {
  const result = createVaccinationSchema.safeParse({
    ...validVaccination(),
    babyId: "fake",
    entrySource: ENTRY_SOURCES.PEDIATRICIAN,
    authorUserId: "fake",
    reminderSent: true,
    administeredDate: "2026-11-01T09:00:00.000Z",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.babyId, undefined);
  assert.equal(result.data.entrySource, undefined);
  assert.equal(result.data.authorUserId, undefined);
  assert.equal(result.data.reminderSent, undefined);
  assert.equal(result.data.administeredDate, undefined);
});

test("accepts a given date in the past", () => {
  const result = markVaccinationGivenSchema.safeParse({
    administeredDate: "2026-11-01T09:00:00.000Z",
  });

  assert.equal(result.success, true);
});

test("rejects a given date in the future", () => {
  const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const result = markVaccinationGivenSchema.safeParse({
    administeredDate: future.toISOString(),
  });

  assert.equal(result.success, false);
});

test("rejects a missing given date", () => {
  const result = markVaccinationGivenSchema.safeParse({});

  assert.equal(result.success, false);
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
  find: Vaccination.find,
  findOne: Vaccination.findOne,
  create: Vaccination.create,
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

// A saved vaccination as Mongoose would return it.
const fakeVaccinationDoc = (fields) => {
  const doc = {
    _id: VACCINATION_ID,
    babyId: BABY_ID,
    vaccineName: "Vaccine B (demo)",
    doseNumber: 2,
    scheduledDate: new Date("2026-11-10T09:00:00Z"),
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

const givenUrl = `/babies/${BABY_ID}/vaccinations/${VACCINATION_ID}`;
const pastDate = "2026-11-12T09:00:00.000Z";

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
  Vaccination.find = original.find;
  Vaccination.findOne = original.findOne;
  Vaccination.create = original.create;
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

test("a parent without access to the baby gets 403", async () => {
  const response = await request(`/babies/${BABY_ID}/vaccinations`, {
    userId: STRANGER_ID,
  });

  assert.equal(response.status, 403);
});

test("GET lists the baby's vaccinations by scheduled date", async () => {
  let filter;
  let sort;
  Vaccination.find = (f) => {
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

  const response = await request(`/babies/${BABY_ID}/vaccinations`, {
    userId: PARENT_ID,
  });

  assert.equal(response.status, 200);
  assert.equal(String(filter.babyId), BABY_ID);
  assert.equal(sort.scheduledDate, 1);
});

test("POST sets the server fields from the signed-in parent", async () => {
  captureAudit();
  let saved;
  Vaccination.create = async (data) => {
    saved = data;
    return { _id: VACCINATION_ID, ...data };
  };

  const response = await request(`/babies/${BABY_ID}/vaccinations`, {
    method: "POST",
    userId: PARENT_ID,
    body: {
      ...validVaccination(),
      entrySource: ENTRY_SOURCES.PEDIATRICIAN,
      authorUserId: STRANGER_ID,
      administeredDate: pastDate,
    },
  });

  assert.equal(response.status, 201);
  assert.equal(String(saved.babyId), BABY_ID);
  assert.equal(saved.entrySource, ENTRY_SOURCES.PARENT);
  assert.equal(String(saved.authorUserId), PARENT_ID);
  assert.equal(saved.reminderSent, false);
  assert.equal(saved.administeredDate, undefined);
  assert.equal(auditCalls[0].action, "vaccination.create");
});

test("POST without a scheduled date returns 400", async () => {
  const body = validVaccination();
  delete body.scheduledDate;

  const response = await request(`/babies/${BABY_ID}/vaccinations`, {
    method: "POST",
    userId: PARENT_ID,
    body,
  });

  assert.equal(response.status, 400);
});

test("PATCH marks my own entry as given", async () => {
  captureAudit();
  const doc = fakeVaccinationDoc({ entrySource: ENTRY_SOURCES.PARENT });
  Vaccination.findOne = async () => doc;

  const response = await request(givenUrl, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { administeredDate: pastDate },
  });

  assert.equal(response.status, 200);
  assert.equal(doc.saved, true);
  assert.equal(doc.administeredDate.toISOString(), pastDate);
  assert.equal(auditCalls[0].action, "vaccination.mark_given");
});

test("PATCH refuses a pediatrician's entry for a parent (403)", async () => {
  const doc = fakeVaccinationDoc({
    entrySource: ENTRY_SOURCES.PEDIATRICIAN,
  });
  Vaccination.findOne = async () => doc;

  const response = await request(givenUrl, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { administeredDate: pastDate },
  });

  assert.equal(response.status, 403);
  assert.equal(doc.saved, false);
});

test("PATCH refuses a vaccination that is already given (409)", async () => {
  const doc = fakeVaccinationDoc({
    entrySource: ENTRY_SOURCES.PARENT,
    administeredDate: new Date("2026-11-01T09:00:00Z"),
  });
  Vaccination.findOne = async () => doc;

  const response = await request(givenUrl, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { administeredDate: pastDate },
  });

  assert.equal(response.status, 409);
  assert.equal(doc.saved, false);
});

test("PATCH returns 404 for another baby's vaccination", async () => {
  let filter;
  Vaccination.findOne = async (f) => {
    filter = f;
    return null;
  };

  const response = await request(givenUrl, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { administeredDate: pastDate },
  });

  assert.equal(response.status, 404);
  assert.equal(String(filter.babyId), BABY_ID);
});

test("PATCH returns 404 for an invalid vaccination id", async () => {
  const response = await request(`/babies/${BABY_ID}/vaccinations/bad-id`, {
    method: "PATCH",
    userId: PARENT_ID,
    body: { administeredDate: pastDate },
  });

  assert.equal(response.status, 404);
});
