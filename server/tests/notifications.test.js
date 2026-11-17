
const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const Notification = require("../models/Notification");

const {
  notify,
  notifyMany,
  setSocketServer,
  disconnectNotificationUser,
} = require("../services/notifications");

const USER_ID = "507f1f77bcf86cd799439011";
const OTHER_USER_ID = "507f1f77bcf86cd799439012";
const BABY_ID = "507f1f77bcf86cd799439013";
const NOTIFICATION_ID = "507f1f77bcf86cd799439014";

const originalCreate = Notification.create;

const sampleNotification = {
  type: "registration.approved",
  title: "Registration approved",
  message: "Your application has been approved.",
  link: "/dashboard",
  babyId: BABY_ID,
};

// Restore the original model and socket after each test.
afterEach(() => {
  Notification.create = originalCreate;
  setSocketServer(null);
});

test("saves a notification for the correct recipient", async () => {
  let savedData = null;

  Notification.create = async (data) => {
    savedData = data;
    return { _id: NOTIFICATION_ID, ...data };
  };

  setSocketServer(null);

  const result = await notify(USER_ID, sampleNotification);

  assert.equal(savedData.recipientUserId, USER_ID);
  assert.equal(savedData.type, "registration.approved");
  assert.equal(savedData.title, "Registration approved");
  assert.equal(
    savedData.message,
    "Your application has been approved.",
  );
  assert.equal(savedData.babyId, BABY_ID);
  assert.equal(result._id, NOTIFICATION_ID);
});

test("sends a live notification only to the recipient room", async () => {
  const events = [];

  Notification.create = async (data) => ({
    _id: NOTIFICATION_ID,
    ...data,
    createdAt: new Date("2026-11-17T10:00:00Z"),
  });

  const fakeIo = {
    to(room) {
      return {
        emit(event, payload) {
          events.push({ room, event, payload });
        },
      };
    },
  };

  setSocketServer(fakeIo);

  await notify(USER_ID, sampleNotification);

  assert.equal(events.length, 1);
  assert.equal(events[0].room, `user:${USER_ID}`);
  assert.equal(events[0].event, "notification:new");
  assert.equal(
    events[0].payload.title,
    "Registration approved",
  );
  assert.equal(events[0].payload.message, sampleNotification.message);
});

test("rejects a notification containing a JMBG", async () => {
  let saveCalled = false;

  Notification.create = async () => {
    saveCalled = true;
    return {};
  };

  await assert.rejects(
    notify(USER_ID, {
      ...sampleNotification,
      message: "Personal ID: 1234567890123",
    }),
    /JMBG/,
  );

  assert.equal(saveCalled, false);
});

test("rejects a JMBG in the title or link", async () => {
  let saveCalled = false;

  Notification.create = async () => {
    saveCalled = true;
    return {};
  };

  for (const field of ["title", "link"]) {
    await assert.rejects(
      notify(USER_ID, {
        ...sampleNotification,
        [field]: "1234567890123",
      }),
      /JMBG/,
    );
  }

  assert.equal(saveCalled, false);
});

test("notifyMany saves a notification for each recipient", async () => {
  const savedRecipients = [];

  Notification.create = async (data) => {
    savedRecipients.push(data.recipientUserId);
    return { _id: NOTIFICATION_ID, ...data };
  };

  const result = await notifyMany(
    [USER_ID, OTHER_USER_ID],
    sampleNotification,
  );

  assert.equal(result.length, 2);
  assert.deepEqual(
    savedRecipients.sort(),
    [USER_ID, OTHER_USER_ID].sort(),
  );
});

test("a socket failure does not lose a saved notification", async () => {
  Notification.create = async (data) => ({
    _id: NOTIFICATION_ID,
    ...data,
  });

  setSocketServer({
    to() {
      throw new Error("Socket unavailable");
    },
  });

  const result = await notify(USER_ID, sampleNotification);

  assert.equal(result._id, NOTIFICATION_ID);
});

test("notification model accepts valid notification data", () => {
  const notification = new Notification({
    recipientUserId: USER_ID,
    ...sampleNotification,
  });

  assert.equal(notification.validateSync(), undefined);
});

test("notification model rejects a missing message", () => {
  const notification = new Notification({
    recipientUserId: USER_ID,
    type: "registration.approved",
    title: "Registration approved",
  });

  const error = notification.validateSync();

  assert.ok(error);
  assert.ok(error.errors.message);
});

test("disconnects only the specified user's socket room", () => {
  const calls = [];

  setSocketServer({
    in(room) {
      return {
        disconnectSockets(closeConnection) {
          calls.push({ room, closeConnection });
        },
      };
    },
  });

  disconnectNotificationUser(USER_ID);

  assert.deepEqual(calls, [
    {
      room: `user:${USER_ID}`,
      closeConnection: true,
    },
  ]);
});

test("disconnect is safe when Socket.io is not initialized", () => {
  setSocketServer(null);

  assert.doesNotThrow(() => {
    disconnectNotificationUser(USER_ID);
  });
});


test("medical details are excluded from saved and live notifications", async () => {
  let savedData = null;
  let liveData = null;

  Notification.create = async (data) => {
    savedData = data;

    return {
      _id: NOTIFICATION_ID,
      ...data,
      createdAt: new Date("2026-11-17T10:00:00Z"),
    };
  };

  setSocketServer({
    to(room) {
      assert.equal(room, `user:${USER_ID}`);

      return {
        emit(event, payload) {
          assert.equal(event, "notification:new");
          liveData = payload;
        },
      };
    },
  });

  await notify(USER_ID, {
    type: "baby.pediatrician_assigned",
    title: "Allergy: penicillin",
    message: "Medical diagnosis: sensitive test information",
    link: "/dashboard",
    babyId: BABY_ID,
  });

  assert.equal(savedData.title, "Account update");
  assert.equal(
    savedData.message,
    "An update is available. Sign in to your eBeba account for details.",
  );

  assert.equal(liveData.title, savedData.title);
  assert.equal(liveData.message, savedData.message);

  for (const data of [savedData, liveData]) {
    const text = JSON.stringify(data);

    assert.doesNotMatch(text, /penicillin/i);
    assert.doesNotMatch(text, /medical diagnosis/i);
    assert.doesNotMatch(text, /sensitive test information/i);
  }
});

test("rejects unknown notification types", async () => {
  let saveCalled = false;

  Notification.create = async () => {
    saveCalled = true;
    return {};
  };

  await assert.rejects(
    notify(USER_ID, {
      type: "medical.details",
      title: "Medical results",
      message: "Confidential information",
    }),
    /Unknown notification type/,
  );

  assert.equal(saveCalled, false);
});

test("rejects unapproved notification links", async () => {
  let saveCalled = false;

  Notification.create = async () => {
    saveCalled = true;
    return {};
  };

  await assert.rejects(
    notify(USER_ID, {
      type: "registration.approved",
      title: "Registration approved",
      message: "Your application has been approved.",
      link: "/medical-records/private",
    }),
    /Notification link is not allowed/,
  );

  assert.equal(saveCalled, false);
});
