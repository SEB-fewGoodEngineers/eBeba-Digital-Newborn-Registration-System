
const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const audit = require("../services/audit");
const { ROLES } = require("../constants");
const {
  setSocketServer,
} = require("../services/notifications");

const ADMIN_ID = "507f1f77bcf86cd799439011";
const USER_ID = "507f1f77bcf86cd799439012";
const TEST_SECRET = "synthetic-n1-secret-for-testing-only";

test("admin deactivation disconnects the user and creates an audit record", async () => {
  const originalFindById = User.findById;
  const originalAuditLog = audit.log;
  const originalSecret = process.env.JWT_SECRET;

  const socketCalls = [];
  const auditCalls = [];
  let saveCount = 0;
  let server;

  const admin = {
    _id: ADMIN_ID,
    role: ROLES.ADMIN,
    isActive: true,
  };

  const targetUser = {
    _id: USER_ID,
    role: ROLES.HOSPITAL_STAFF,
    isActive: true,
    async save() {
      saveCount += 1;
      return this;
    },
  };

  try {
    process.env.JWT_SECRET = TEST_SECRET;

    // Simulate database users without connecting to MongoDB.
    User.findById = async (id) => {
      if (String(id) === ADMIN_ID) return admin;
      if (String(id) === USER_ID) return targetUser;
      return null;
    };

    // Capture audit calls without writing to the database.
    audit.log = async (entry) => {
      auditCalls.push(entry);
    };

    // Simulate the Socket.io room and disconnection.
    setSocketServer({
      in(room) {
        return {
          disconnectSockets(closeConnection) {
            socketCalls.push({ room, closeConnection });
          },
        };
      },
    });

    server = http.createServer(app);

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const port = server.address().port;

    const token = jwt.sign(
      { payload: { _id: ADMIN_ID, role: ROLES.ADMIN } },
      TEST_SECRET,
      { expiresIn: "1h" },
    );

    // Send a real HTTP request to the Express admin route.
    const response = await fetch(
      `http://127.0.0.1:${port}/admin/users/${USER_ID}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: false }),
      },
    );

    const body = await response.json();

    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(targetUser.isActive, false);
    assert.equal(saveCount, 1);

    // Only the target user's room must be disconnected.
    assert.deepEqual(socketCalls, [
      {
        room: `user:${USER_ID}`,
        closeConnection: true,
      },
    ]);

    // The deactivation must also be audited.
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].action, "user.deactivate");
    assert.equal(String(auditCalls[0].targetDocumentId), USER_ID);
  } finally {
    User.findById = originalFindById;
    audit.log = originalAuditLog;
    setSocketServer(null);

    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }

    if (server?.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
});
