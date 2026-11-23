
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

test("birth record notification stores only the number with an approved link", async () => {
  let savedData;
  Notification.create = async (data) => {
    savedData = data;
    return { _id: NOTIFICATION_ID, ...data };
  };

  await notify(USER_ID, {
    type: "birth_record.created",
    title: "Untrusted title",
    message: "Untrusted text",
    link: "/babies/link",
    babyId: BABY_ID,
    birthRecordNumber: "BR-HOSP-DEMO-123",
  });
  assert.equal(savedData.title, "Birth record created");
  assert.equal(savedData.birthRecordNumber, "BR-HOSP-DEMO-123");
  assert.equal(savedData.link, "/babies/link");
  assert.doesNotMatch(savedData.message, /Untrusted/);
});

test("rejects a record number on other notification types", async () => {
  await assert.rejects(
    notify(USER_ID, { ...sampleNotification, birthRecordNumber: "BR-OTHER" }),
    /Invalid birth record number/,
  );
});

test("rejects a birth notification without a record number", async () => {
  await assert.rejects(
    notify(USER_ID, { type: "birth_record.created", link: "/babies/link" }),
    /Birth record number is required/,
  );
});

test("rejects unapproved links even for birth notifications", async () => {
  await assert.rejects(
    notify(USER_ID, {
      type: "birth_record.created",
      birthRecordNumber: "BR-HOSP-DEMO-123",
      link: "/admin/users",
    }),
    /Notification link is not allowed/,
  );
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

test("staff events persist and emit only to active users in the intended scope", async (t) => {
  const User = require("../models/User");
  const { notifyStaff } = require("../services/notifications");
  const sent = [];
  const saved = [];
  let filter;
  t.mock.method(User, "find", (query) => {
    filter = query;
    return { select: () => ({ lean: async () => [{ _id: USER_ID }] }) };
  });
  Notification.create = async (data) => {
    saved.push(data);
    return { ...data, _id: NOTIFICATION_ID };
  };
  setSocketServer({ to: (room) => ({ emit: (event, payload) => sent.push({ room, event, payload }) }) });

  for (const [type, role, field, link] of [
    ["staff.review_requested", "moi_staff", null, "/moi/queue"],
    ["staff.birth_registered", "hospital_staff", "institutionId", "/hospital/babies"],
    ["staff.csw_case_received", "csw_staff", "institutionId", "/csw-cases"],
    ["staff.insurance_received", "health_insurance_staff", "institutionId", "/insurance-records"],
    ["staff.patient_assigned", "pediatrician", "_id", "/pediatrician/babies"],
    ["staff.account_created", "admin", null, "/admin/audit-logs"],
    ["staff.access_changed", "admin", null, "/admin/audit-logs"],
  ]) {
    if (field) {
      filter = null;
      await notifyStaff(type);
      assert.equal(filter, null);
    }
    await notifyStaff(type, field ? OTHER_USER_ID : undefined);
    assert.deepEqual(filter, { role, isActive: true, ...(field ? { [field]: OTHER_USER_ID } : {}) });
    assert.equal(saved.at(-1).recipientUserId, USER_ID);
    assert.equal(saved.at(-1).link, link);
    assert.equal(sent.at(-1).room, "user:" + USER_ID);
    assert.equal(sent.at(-1).event, "notification:new");
    assert.equal(sent.at(-1).payload._id, NOTIFICATION_ID);
    assert.equal(sent.at(-1).payload.type, type);
  }
  assert.equal(saved.length, 7);
  assert.equal(sent.length, saved.length);
});
