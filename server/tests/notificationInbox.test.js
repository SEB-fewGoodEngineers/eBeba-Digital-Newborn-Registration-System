const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Notification = require("../models/Notification");
const audit = require("../services/audit");
const { ROLES } = require("../constants");

// Fictional ids and data only. No database connection is needed.
const USER_ID = "507f1f77bcf86cd799439021";
const OTHER_USER_ID = "507f1f77bcf86cd799439022";
const NOTIFICATION_ID = "507f1f77bcf86cd799439023";
const TEST_SECRET = "synthetic-n2-secret-for-testing-only";

const users = {
  [USER_ID]: { _id: USER_ID, role: ROLES.PARENT, isActive: true },
  [OTHER_USER_ID]: {
    _id: OTHER_USER_ID,
    role: ROLES.PEDIATRICIAN,
    isActive: true,
  },
};

const original = {
  findById: User.findById,
  find: Notification.find,
  findOne: Notification.findOne,
  findOneAndUpdate: Notification.findOneAndUpdate,
  auditLog: audit.log,
  secret: process.env.JWT_SECRET,
};

let server;
let baseUrl;
let calls;
let auditCalls;

// A chainable stand-in for a Mongoose query.
const fakeQuery = (result, record) => {
  const query = {
    select(fields) {
      record.select = fields;
      return query;
    },
    sort(order) {
      record.sort = order;
      return query;
    },
    limit(count) {
      record.limit = count;
      return query;
    },
    lean() {
      return Promise.resolve(result);
    },
  };
  return query;
};

const tokenFor = (userId) =>
  jwt.sign(
    { payload: { _id: userId, role: users[userId].role } },
    TEST_SECRET,
    { expiresIn: "1h" },
  );

const request = (path, { method = "GET", userId } = {}) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {},
  });

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
  Notification.find = original.find;
  Notification.findOne = original.findOne;
  Notification.findOneAndUpdate = original.findOneAndUpdate;
  audit.log = original.auditLog;
});

after(async () => {
  User.findById = original.findById;
  process.env.JWT_SECRET = original.secret;
  await new Promise((resolve) => server.close(resolve));
});

// Capture audit calls without writing to the database.
const captureAudit = () => {
  auditCalls = [];
  audit.log = async (entry) => {
    auditCalls.push(entry);
  };
};

test("GET /notifications refuses a request without a token", async () => {
  const response = await request("/notifications");

  assert.equal(response.status, 401);
});

test("PATCH read refuses a request without a token", async () => {
  const response = await request(`/notifications/${NOTIFICATION_ID}/read`, {
    method: "PATCH",
  });

  assert.equal(response.status, 401);
});

test("GET /notifications loads only my notifications, newest first", async () => {
  calls = {};
  const rows = [
    { _id: "b", title: "Account update", createdAt: "2026-11-17T10:00:00Z" },
    {
      _id: "a",
      title: "Registration approved",
      createdAt: "2026-11-16T10:00:00Z",
    },
  ];

  Notification.find = (filter) => {
    calls.filter = filter;
    return fakeQuery(rows, calls);
  };

  const response = await request("/notifications", { userId: USER_ID });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, rows);
  // The filter comes from the token, never from the request.
  assert.deepEqual(calls.filter, { recipientUserId: USER_ID });
  assert.deepEqual(calls.sort, { createdAt: -1 });
  assert.ok(calls.limit > 0);
  assert.ok(!calls.select.includes("recipientUserId"));
  assert.ok(calls.select.includes("channels"));
  assert.ok(calls.select.includes("readAt"));
});

test("GET /notifications ignores a recipient id sent in the query", async () => {
  calls = {};
  Notification.find = (filter) => {
    calls.filter = filter;
    return fakeQuery([], calls);
  };

  const response = await request(
    `/notifications?recipientUserId=${OTHER_USER_ID}`,
    { userId: USER_ID },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls.filter, { recipientUserId: USER_ID });
});

test("PATCH read sets readAt the first time and writes an audit log", async () => {
  calls = {};
  captureAudit();
  const readAt = new Date("2026-11-18T09:00:00Z");

  Notification.findOneAndUpdate = (filter, update, options) => {
    calls.filter = filter;
    calls.update = update;
    calls.options = options;
    return fakeQuery({ _id: NOTIFICATION_ID, readAt }, calls);
  };
  Notification.findOne = () => {
    throw new Error("findOne should not be needed on the first read");
  };

  const response = await request(`/notifications/${NOTIFICATION_ID}/read`, {
    method: "PATCH",
    userId: USER_ID,
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.readAt, readAt.toISOString());
  assert.deepEqual(calls.filter, {
    _id: NOTIFICATION_ID,
    recipientUserId: USER_ID,
    readAt: null,
  });
  assert.ok(calls.update.$set.readAt instanceof Date);
  assert.equal(calls.options.new, true);

  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0].action, "notification.read");
  assert.equal(auditCalls[0].targetCollection, "notifications");
});

test("PATCH read keeps the first readAt when the notification is already read", async () => {
  captureAudit();
  const firstReadAt = "2026-11-10T08:00:00.000Z";
  let ownerFilter;

  // Nothing matches "unread", so nothing is updated.
  Notification.findOneAndUpdate = () => fakeQuery(null, {});
  Notification.findOne = (filter) => {
    ownerFilter = filter;
    return fakeQuery({ _id: NOTIFICATION_ID, readAt: firstReadAt }, {});
  };

  const response = await request(`/notifications/${NOTIFICATION_ID}/read`, {
    method: "PATCH",
    userId: USER_ID,
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.readAt, firstReadAt);
  assert.deepEqual(ownerFilter, {
    _id: NOTIFICATION_ID,
    recipientUserId: USER_ID,
  });
  assert.equal(auditCalls.length, 0);
});

test("PATCH read returns 404 for another user's notification", async () => {
  captureAudit();
  const filters = [];

  // The database finds nothing, because the filter includes my own id.
  Notification.findOneAndUpdate = (filter) => {
    filters.push(filter);
    return fakeQuery(null, {});
  };
  Notification.findOne = (filter) => {
    filters.push(filter);
    return fakeQuery(null, {});
  };

  const response = await request(`/notifications/${NOTIFICATION_ID}/read`, {
    method: "PATCH",
    userId: OTHER_USER_ID,
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.err, "Notification not found.");
  assert.ok(filters.every((f) => f.recipientUserId === OTHER_USER_ID));
  assert.equal(auditCalls.length, 0);
});

test("PATCH read returns 404 for an invalid id without a database query", async () => {
  Notification.findOneAndUpdate = () => {
    throw new Error("no query expected");
  };
  Notification.findOne = () => {
    throw new Error("no query expected");
  };

  const response = await request("/notifications/not-a-valid-id/read", {
    method: "PATCH",
    userId: USER_ID,
  });

  assert.equal(response.status, 404);
});
