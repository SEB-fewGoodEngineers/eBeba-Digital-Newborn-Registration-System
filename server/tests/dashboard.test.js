const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const Registration = require("../models/Registration");
const CswCase = require("../models/CswCase");
const InsuranceRecord = require("../models/InsuranceRecord");
const { ROLES, REGISTRATION_STATUS } = require("../constants");

// Fictional ids and data only. No database connection is needed.
const PARENT_ID = "507f1f77bcf86cd799439091";
const PEDIATRICIAN_ID = "507f1f77bcf86cd799439092";
const HOSPITAL_ID = "507f1f77bcf86cd799439093";
const BABY_A = "507f1f77bcf86cd7994390a1";
const BABY_B = "507f1f77bcf86cd7994390a2";
const BABY_C = "507f1f77bcf86cd7994390a3";
const TEST_SECRET = "synthetic-4-2-secret-for-testing-only";

const users = {
  [PARENT_ID]: { _id: PARENT_ID, role: ROLES.PARENT, isActive: true },
  [PEDIATRICIAN_ID]: {
    _id: PEDIATRICIAN_ID,
    role: ROLES.PEDIATRICIAN,
    isActive: true,
  },
  [HOSPITAL_ID]: {
    _id: HOSPITAL_ID,
    role: ROLES.HOSPITAL_STAFF,
    isActive: true,
  },
};

const original = {
  userFindById: User.findById,
  userFind: User.find,
  babyFind: Baby.find,
  registrationFind: Registration.find,
  cswFind: CswCase.find,
  insuranceFind: InsuranceRecord.find,
  secret: process.env.JWT_SECRET,
};

let server;
let baseUrl;

const tokenFor = (userId) =>
  jwt.sign(
    { payload: { _id: userId, role: users[userId].role } },
    TEST_SECRET,
    { expiresIn: "1h" },
  );

const request = (userId) =>
  fetch(`${baseUrl}/dashboard`, {
    headers: userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {},
  });

// A chainable stand-in for Model.find(...).select(...).sort(...).lean().
// Records every call so a test can count the queries.
const fakeFind = (rows, calls) => (filter) => {
  const call = { filter };
  calls.push(call);
  const query = {
    select(fields) {
      call.select = fields;
      return query;
    },
    sort(order) {
      call.sort = order;
      return query;
    },
    lean: async () => rows,
  };
  return query;
};

// Set up the models for one dashboard request.
const setUp = ({
  babies = [],
  registrations = [],
  cswCases = [],
  insuranceRecords = [],
  pediatricians = [],
} = {}) => {
  const calls = {
    babies: [],
    registrations: [],
    cswCases: [],
    insuranceRecords: [],
    pediatricians: [],
  };
  Baby.find = fakeFind(babies, calls.babies);
  Registration.find = fakeFind(registrations, calls.registrations);
  CswCase.find = fakeFind(cswCases, calls.cswCases);
  InsuranceRecord.find = fakeFind(insuranceRecords, calls.insuranceRecords);
  User.find = fakeFind(pediatricians, calls.pediatricians);
  return calls;
};

before(async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  User.findById = async (id) => users[String(id)] || null;

  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  User.find = original.userFind;
  Baby.find = original.babyFind;
  Registration.find = original.registrationFind;
  CswCase.find = original.cswFind;
  InsuranceRecord.find = original.insuranceFind;
});

after(async () => {
  User.findById = original.userFindById;
  process.env.JWT_SECRET = original.secret;
  await new Promise((resolve) => server.close(resolve));
});

test("the dashboard needs a token", async () => {
  const response = await request();

  assert.equal(response.status, 401);
});

test("only a parent can open the dashboard", async () => {
  setUp();

  for (const userId of [PEDIATRICIAN_ID, HOSPITAL_ID]) {
    const response = await request(userId);
    assert.equal(response.status, 403);
  }
});

test("a parent without a linked baby gets an empty list and no other queries", async () => {
  const calls = setUp({ babies: [] });

  const response = await request(PARENT_ID);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, []);
  assert.equal(calls.registrations.length, 0);
  assert.equal(calls.cswCases.length, 0);
  assert.equal(calls.insuranceRecords.length, 0);
  assert.equal(calls.pediatricians.length, 0);
});

test("loads only my babies, without the parents' details", async () => {
  const calls = setUp({ babies: [] });

  await request(PARENT_ID);

  const [babyQuery] = calls.babies;
  // The filter comes from the token, never from the request.
  assert.equal(String(babyQuery.filter.authorizedUserIds), PARENT_ID);
  assert.ok(!babyQuery.select.includes("mother"));
  assert.ok(!babyQuery.select.includes("father"));
  assert.ok(!babyQuery.select.includes("authorizedUserIds"));
});

test("shows each baby's statuses and pediatrician", async () => {
  setUp({
    babies: [
      {
        _id: BABY_A,
        firstName: "Demo",
        jmbg: "0101026990010",
        assignedPediatricianId: PEDIATRICIAN_ID,
      },
    ],
    registrations: [{ babyId: BABY_A, status: REGISTRATION_STATUS.APPROVED }],
    cswCases: [{ babyId: BABY_A, status: "completed" }],
    insuranceRecords: [{ babyId: BABY_A, status: "card_issued" }],
    pediatricians: [
      { _id: PEDIATRICIAN_ID, firstName: "Demo", lastName: "Doctor" },
    ],
  });

  const response = await request(PARENT_ID);
  const [baby] = await response.json();

  assert.equal(response.status, 200);
  assert.equal(baby.registrationStatus, REGISTRATION_STATUS.APPROVED);
  assert.equal(baby.isRegistrationApproved, true);
  assert.equal(baby.cswStatus, "completed");
  assert.equal(baby.insuranceStatus, "card_issued");
  assert.deepEqual(baby.pediatrician, {
    firstName: "Demo",
    lastName: "Doctor",
  });
  // The pediatrician's id is replaced by the name only.
  assert.equal(baby.assignedPediatricianId, undefined);
});

test("a baby without records waits for MoI and has no pediatrician", async () => {
  setUp({ babies: [{ _id: BABY_B, firstName: "Demo" }] });

  const response = await request(PARENT_ID);
  const [baby] = await response.json();

  assert.equal(baby.registrationStatus, null);
  assert.equal(baby.isRegistrationApproved, false);
  assert.equal(baby.cswStatus, "waiting_for_moi");
  assert.equal(baby.insuranceStatus, "waiting_for_moi");
  assert.equal(baby.pediatrician, null);
});

test("a pending registration is not shown as approved", async () => {
  setUp({
    babies: [{ _id: BABY_A }],
    registrations: [{ babyId: BABY_A, status: REGISTRATION_STATUS.PENDING }],
  });

  const response = await request(PARENT_ID);
  const [baby] = await response.json();

  assert.equal(baby.registrationStatus, REGISTRATION_STATUS.PENDING);
  assert.equal(baby.isRegistrationApproved, false);
});

test("loads related records once for all babies ($in), not once per baby", async () => {
  const calls = setUp({
    babies: [
      { _id: BABY_A, assignedPediatricianId: PEDIATRICIAN_ID },
      { _id: BABY_B, assignedPediatricianId: PEDIATRICIAN_ID },
      { _id: BABY_C },
    ],
    pediatricians: [
      { _id: PEDIATRICIAN_ID, firstName: "Demo", lastName: "Doctor" },
    ],
  });

  const response = await request(PARENT_ID);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length, 3);

  for (const key of ["registrations", "cswCases", "insuranceRecords"]) {
    assert.equal(calls[key].length, 1, `${key}: one query`);
    assert.deepEqual(calls[key][0].filter.babyId.$in.map(String), [
      BABY_A,
      BABY_B,
      BABY_C,
    ]);
  }

  assert.equal(calls.pediatricians.length, 1);
  const [doctorQuery] = calls.pediatricians;
  assert.equal(doctorQuery.filter.role, ROLES.PEDIATRICIAN);
  // A baby without a pediatrician adds no empty id.
  assert.deepEqual(
    [...new Set(doctorQuery.filter._id.$in.map(String))],
    [PEDIATRICIAN_ID],
  );
  assert.equal(doctorQuery.select, "firstName lastName");

  assert.equal(body[2].pediatrician, null);
  assert.equal(body[0].pediatrician.lastName, "Doctor");
});
