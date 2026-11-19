import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { io as createClient } from "socket.io-client";

// Load backend packages from the server installation.
const serverRequire = createRequire(
  new URL("../../server/package.json", import.meta.url),
);

const jwt = serverRequire("jsonwebtoken");
const { Server } = serverRequire("socket.io");
const User = serverRequire("./models/User");
const Notification = serverRequire("./models/Notification");

const { notify, setSocketServer, disconnectNotificationUser } = serverRequire(
  "./services/notifications",
);

const { authenticateNotificationSocket } = serverRequire(
  "./services/notifications/socketAuth",
);

const USER_A = "507f1f77bcf86cd799439011";
const USER_B = "507f1f77bcf86cd799439012";
const TEST_SECRET = "synthetic-socket-integration-secret";

const waitForEvent = (socket, event, errorEvent) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for ${event}`));
    }, 3000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off(event, onSuccess);

      if (errorEvent) {
        socket.off(errorEvent, onError);
      }
    };

    const onSuccess = (value) => {
      cleanup();
      resolve(value);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    socket.once(event, onSuccess);

    if (errorEvent) {
      socket.once(errorEvent, onError);
    }
  });

test("Socket.io authentication, privacy and deactivation", async () => {
  const originalFindById = User.findById;
  const originalCreate = Notification.create;
  const originalSecret = process.env.JWT_SECRET;

  const users = {
    [USER_A]: { _id: USER_A, isActive: true },
    [USER_B]: { _id: USER_B, isActive: true },
  };

  const clients = [];
  const httpServer = createServer();
  const ioServer = new Server(httpServer, {
    transports: ["websocket"],
  });

  try {
    process.env.JWT_SECRET = TEST_SECRET;

    User.findById = async (id) => users[String(id)] || null;

    Notification.create = async (data) => ({
      _id: "507f1f77bcf86cd799439014",
      ...data,
      createdAt: new Date(),
    });

    ioServer.use(authenticateNotificationSocket);

    ioServer.on("connection", (socket) => {
      socket.join(`user:${socket.data.userId}`);
    });

    setSocketServer(ioServer);

    await new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(0, "127.0.0.1", resolve);
    });

    const address = `http://127.0.0.1:${httpServer.address().port}`;

    const makeToken = (userId) =>
      jwt.sign({ payload: { _id: userId, role: "parent" } }, TEST_SECRET, {
        expiresIn: "1h",
      });

    const makeClient = (token) => {
      const client = createClient(address, {
        transports: ["websocket"],
        reconnection: false,
        autoConnect: false,
        forceNew: true,
        auth: token ? { token } : {},
      });

      clients.push(client);
      return client;
    };

    const connect = (client) => {
      const result = waitForEvent(client, "connect", "connect_error");

      client.connect();
      return result;
    };

    // Two active users must connect successfully.
    const clientA = makeClient(makeToken(USER_A));
    const clientB = makeClient(makeToken(USER_B));

    await Promise.all([connect(clientA), connect(clientB)]);

    assert.equal(clientA.connected, true);
    assert.equal(clientB.connected, true);

    // A missing token must be rejected.
    const unauthorizedClient = makeClient(null);

    await assert.rejects(
      connect(unauthorizedClient),
      /Authentication required/,
    );

    // User A receives their notification.
    const messagesForB = [];

    clientB.on("notification:new", (message) => {
      messagesForB.push(message);
    });

    const incomingMessage = waitForEvent(clientA, "notification:new");

    await notify(USER_A, {
      type: "registration.approved",
      title: "Registration approved",
      message: "Your application has been approved.",
    });

    const received = await incomingMessage;

    assert.equal(received.title, "Registration approved");

    // User B must not receive User A's notification.
    await delay(150);
    assert.equal(messagesForB.length, 0);

    // Simulate the administrator deactivating User A.
    users[USER_A].isActive = false;

    const disconnection = waitForEvent(clientA, "disconnect");

    disconnectNotificationUser(USER_A);

    await disconnection;

    assert.equal(clientA.connected, false);
    assert.equal(clientB.connected, true);

    // The deactivated user must not reconnect.
    const inactiveClient = makeClient(makeToken(USER_A));

    await assert.rejects(connect(inactiveClient), /Authentication required/);
  } finally {
    for (const client of clients) {
      client.disconnect();
    }

    setSocketServer(null);

    User.findById = originalFindById;
    Notification.create = originalCreate;

    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }

    await new Promise((resolve) => {
      ioServer.close(resolve);
    });
  }
});
