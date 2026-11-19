const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const {
  authenticateNotificationSocket,
} = require("../services/notifications/socketAuth");

const USER_ID = "507f1f77bcf86cd799439011";
const TEST_SECRET = "synthetic-n1-test-secret-not-for-production";

const originalFindById = User.findById;
const originalSecret = process.env.JWT_SECRET;

// Use only a synthetic JWT secret and fictional user IDs.
beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterEach(() => {
  User.findById = originalFindById;

  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalSecret;
  }
});

const makeToken = (id = USER_ID, options = {}) =>
  jwt.sign({ payload: { _id: id, role: "parent" } }, TEST_SECRET, {
    expiresIn: "1h",
    ...options,
  });

const runAuth = async (token, user = { _id: USER_ID, isActive: true }) => {
  let databaseCalls = 0;
  let callbackCalls = 0;
  let authError;

  User.findById = async () => {
    databaseCalls += 1;
    return user;
  };

  const socket = {
    handshake: { auth: { token } },
    data: {},
  };

  await authenticateNotificationSocket(socket, (error) => {
    callbackCalls += 1;
    authError = error;
  });

  return {
    socket,
    error: authError,
    databaseCalls,
    callbackCalls,
  };
};

test("accepts a valid token for an active user", async () => {
  const result = await runAuth(makeToken());

  assert.equal(result.error, undefined);
  assert.equal(result.socket.data.userId, USER_ID);
  assert.equal(result.databaseCalls, 1);
  assert.equal(result.callbackCalls, 1);
});

test("rejects a missing token", async () => {
  const result = await runAuth(undefined);

  assert.match(result.error.message, /Authentication required/);
  assert.equal(result.databaseCalls, 0);
  assert.equal(result.callbackCalls, 1);
  assert.equal(result.socket.data.userId, undefined);
});

test("rejects a malformed token", async () => {
  const result = await runAuth("invalid-token");

  assert.match(result.error.message, /Authentication required/);
  assert.equal(result.databaseCalls, 0);
});

test("rejects a token signed with the wrong secret", async () => {
  const badToken = jwt.sign(
    { payload: { _id: USER_ID } },
    "incorrect-test-secret",
  );

  const result = await runAuth(badToken);

  assert.match(result.error.message, /Authentication required/);
  assert.equal(result.databaseCalls, 0);
});

test("rejects an expired token", async () => {
  const expiredToken = makeToken(USER_ID, {
    expiresIn: -1,
  });

  const result = await runAuth(expiredToken);

  assert.match(result.error.message, /Authentication required/);
  assert.equal(result.databaseCalls, 0);
});

test("rejects an invalid user ID", async () => {
  const result = await runAuth(makeToken("invalid-id"));

  assert.match(result.error.message, /Authentication required/);
  assert.equal(result.databaseCalls, 0);
});

test("rejects a user that does not exist", async () => {
  const result = await runAuth(makeToken(), null);

  assert.match(result.error.message, /Authentication required/);
  assert.equal(result.databaseCalls, 1);
  assert.equal(result.socket.data.userId, undefined);
});

test("rejects a deactivated user", async () => {
  const inactiveUser = {
    _id: USER_ID,
    isActive: false,
  };

  const result = await runAuth(makeToken(), inactiveUser);

  assert.match(result.error.message, /Authentication required/);
  assert.equal(result.databaseCalls, 1);
  assert.equal(result.socket.data.userId, undefined);
});
