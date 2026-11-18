const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const GrowthMeasurement = require("../models/GrowthMeasurement");
const { ROLES } = require("../constants");

// Fictional ids and data only. No database connection is needed.
const PEDIATRICIAN_ID = "507f1f77bcf86cd799439081";
const OTHER_PEDIATRICIAN_ID = "507f1f77bcf86cd799439082";
const PARENT_ID = "507f1f77bcf86cd799439083";
const BABY_ID = "507f1f77bcf86cd799439084";
const TEST_SECRET = "synthetic-4-7-secret-for-testing-only";

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
  [PARENT_ID]: { _id: PARENT_ID, role: ROLES.PARENT, isActive: true },
};

const baby = {
  _id: BABY_ID,
  firstName: "Demo",
  lastName: "Baby",
  jmbg: "0101026990010",
  birthDateTime: new Date("2026-10-01T08:00:00Z"),
  birthWeightGrams: 3400,
  birthLengthCm: 50,
  mother: { firstName: "Demo", lastName: "Mother" },
  authorizedUserIds: [PARENT_ID],
  assignedPediatricianId: PEDIATRICIAN_ID,
};

const original = {
  userFindById: User.findById,
  babyFindById: Baby.findById,
  growthFind: GrowthMeasurement.find,
  growthCreate: GrowthMeasurement.create,
  secret: process.env.JWT_SECRET,
};

let server;
let baseUrl;

const url = `/pediatrician/babies/${BABY_ID}/growth-measurements`;

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
  GrowthMeasurement.find = original.growthFind;
  GrowthMeasurement.create = original.growthCreate;
});

after(async () => {
  User.findById = original.userFindById;
  Baby.findById = original.babyFindById;
  process.env.JWT_SECRET = original.secret;
  await new Promise((resolve) => server.close(resolve));
});

test("growth for the pediatrician needs a token", async () => {
  const response = await request(url);

  assert.equal(response.status, 401);
});

test("a parent cannot use the pediatrician's route (403)", async () => {
  const response = await request(url, { userId: PARENT_ID });

  assert.equal(response.status, 403);
});

test("a pediatrician who is not assigned to the baby gets 403", async () => {
  const response = await request(url, { userId: OTHER_PEDIATRICIAN_ID });

  assert.equal(response.status, 403);
});

test("an unknown baby returns 404", async () => {
  const response = await request(
    "/pediatrician/babies/507f1f77bcf86cd799439099/growth-measurements",
    { userId: PEDIATRICIAN_ID },
  );

  assert.equal(response.status, 404);
});

test("the assigned pediatrician sees the growth, oldest first, without private fields", async () => {
  let filter;
  let fields;
  let sort;
  const rows = [
    {
      _id: "m1",
      measuredAt: "2026-10-15T09:00:00.000Z",
      weightGrams: 3900,
      heightCm: 53,
    },
  ];
  GrowthMeasurement.find = (f) => {
    filter = f;
    const query = {
      select(s) {
        fields = s;
        return query;
      },
      sort(s) {
        sort = s;
        return query;
      },
      lean: async () => rows,
    };
    return query;
  };

  const response = await request(url, { userId: PEDIATRICIAN_ID });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(String(filter.babyId), BABY_ID);
  assert.deepEqual(sort, { measuredAt: 1 });
  assert.ok(!fields.includes("loggedByUserId"));
  assert.deepEqual(body.measurements, rows);
  assert.equal(body.baby.firstName, "Demo");
  assert.equal(body.baby.birthWeightGrams, 3400);
  // Never the JMBG or the parents' details.
  assert.equal(body.baby.jmbg, undefined);
  assert.equal(body.baby.mother, undefined);
  assert.equal(body.baby.authorizedUserIds, undefined);
});

test("the pediatrician cannot add a measurement (read-only)", async () => {
  let created = false;
  GrowthMeasurement.create = async () => {
    created = true;
  };

  // No write route on the pediatrician's path...
  const own = await request(url, {
    method: "POST",
    userId: PEDIATRICIAN_ID,
    body: {
      measuredAt: "2026-10-15T09:00:00.000Z",
      weightGrams: 4000,
      heightCm: 54,
    },
  });
  // ...and Epic 5's route stays parent-only.
  const epic5 = await request(`/babies/${BABY_ID}/growth-measurements`, {
    method: "POST",
    userId: PEDIATRICIAN_ID,
    body: {
      measuredAt: "2026-10-15T09:00:00.000Z",
      weightGrams: 4000,
      heightCm: 54,
    },
  });

  assert.equal(own.status, 404);
  assert.equal(epic5.status, 403);
  assert.equal(created, false);
});
