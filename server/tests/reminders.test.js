const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const Vaccination = require("../models/Vaccination");
const Appointment = require("../models/Appointment");
const audit = require("../services/audit");
const notifications = require("../services/notifications");
const reminders = require("../services/notifications/reminders");
const {
  getNotificationTemplate,
} = require("../services/notifications/templates");
const { ROLES, APPOINTMENT_STATUS } = require("../constants");

// Fictional ids and data only. No database connection is needed.
const PARENT_A = "507f1f77bcf86cd799439051";
const PARENT_B = "507f1f77bcf86cd799439052";
const BABY_ID = "507f1f77bcf86cd799439053";
const LONELY_BABY_ID = "507f1f77bcf86cd799439054";
const VACCINATION_ID = "507f1f77bcf86cd799439055";
const APPOINTMENT_ID = "507f1f77bcf86cd799439056";
const ADMIN_ID = "507f1f77bcf86cd799439057";
const TEST_SECRET = "synthetic-n3-secret-for-testing-only";

const NOW = new Date("2026-11-18T08:00:00.000Z");

const original = {
  vaccinationFind: Vaccination.find,
  vaccinationUpdateOne: Vaccination.updateOne,
  appointmentFind: Appointment.find,
  appointmentUpdateOne: Appointment.updateOne,
  babyFind: Baby.find,
  notifyMany: notifications.notifyMany,
  runReminders: reminders.runReminders,
  userFindById: User.findById,
  auditLog: audit.log,
  secret: process.env.JWT_SECRET,
};

afterEach(() => {
  Vaccination.find = original.vaccinationFind;
  Vaccination.updateOne = original.vaccinationUpdateOne;
  Appointment.find = original.appointmentFind;
  Appointment.updateOne = original.appointmentUpdateOne;
  Baby.find = original.babyFind;
  notifications.notifyMany = original.notifyMany;
  reminders.runReminders = original.runReminders;
  User.findById = original.userFindById;
  audit.log = original.auditLog;
  process.env.JWT_SECRET = original.secret;
});

// A chainable stand-in for Model.find().select().lean().
const fakeFind = (rows, calls) => (filter) => {
  calls.push(filter);
  const query = {
    select: () => query,
    lean: async () => rows,
  };
  return query;
};

// Simple in-memory reminderSent flags for updateOne.
const fakeUpdateOne = (flags, updates) => async (filter, update) => {
  updates.push({ filter, update });
  const id = String(filter._id);
  if (filter.reminderSent === false && flags[id] !== false) {
    return { modifiedCount: 0 };
  }
  flags[id] = update.$set.reminderSent;
  return { modifiedCount: 1 };
};

// Set up one vaccination and one appointment in the next 24 hours.
const setUp = ({ vaccinations, appointments, babies, notifyMany } = {}) => {
  const state = {
    findCalls: { vaccinations: [], appointments: [] },
    updates: [],
    sent: [],
    flags: { [VACCINATION_ID]: false, [APPOINTMENT_ID]: false },
  };

  Vaccination.find = fakeFind(
    vaccinations ?? [{ _id: VACCINATION_ID, babyId: BABY_ID }],
    state.findCalls.vaccinations,
  );
  Appointment.find = fakeFind(
    appointments ?? [{ _id: APPOINTMENT_ID, babyId: BABY_ID }],
    state.findCalls.appointments,
  );
  Vaccination.updateOne = fakeUpdateOne(state.flags, state.updates);
  Appointment.updateOne = fakeUpdateOne(state.flags, state.updates);
  Baby.find = () => ({
    select: () => ({
      lean: async () =>
        babies ?? [{ _id: BABY_ID, authorizedUserIds: [PARENT_A, PARENT_B] }],
    }),
  });
  notifications.notifyMany =
    notifyMany ??
    (async (userIds, notification) => {
      state.sent.push({ userIds, ...notification });
    });

  return state;
};

test("looks only for unsent items in the next 24 hours", async () => {
  const state = setUp({ vaccinations: [], appointments: [] });

  await reminders.runReminders(NOW);

  const until = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
  const [vaccinationFilter] = state.findCalls.vaccinations;
  const [appointmentFilter] = state.findCalls.appointments;

  assert.equal(vaccinationFilter.reminderSent, false);
  assert.deepEqual(vaccinationFilter.scheduledDate, { $gte: NOW, $lte: until });
  assert.equal(vaccinationFilter.administeredDate, null);

  assert.equal(appointmentFilter.reminderSent, false);
  assert.deepEqual(appointmentFilter.scheduledAt, { $gte: NOW, $lte: until });
  assert.equal(appointmentFilter.status, APPOINTMENT_STATUS.UPCOMING);
});

test("sends a reminder to every parent, then sets reminderSent", async () => {
  const state = setUp();

  const result = await reminders.runReminders(NOW);

  assert.equal(result.vaccinations, 1);
  assert.equal(result.appointments, 1);
  assert.equal(result.sent, 2);
  assert.equal(result.failed, 0);

  assert.deepEqual(
    state.sent.map((s) => s.type),
    ["vaccination.reminder", "appointment.reminder"],
  );
  for (const notification of state.sent) {
    assert.deepEqual(notification.userIds, [PARENT_A, PARENT_B]);
    assert.equal(notification.link, "/dashboard");
    assert.equal(notification.babyId, BABY_ID);
  }

  assert.equal(state.flags[VACCINATION_ID], true);
  assert.equal(state.flags[APPOINTMENT_ID], true);
});

test("a second run does not send the same reminder again", async () => {
  const state = setUp();

  await reminders.runReminders(NOW);
  // The fake find still returns the items: the claim must stop a repeat.
  const second = await reminders.runReminders(NOW);

  assert.equal(second.sent, 0);
  assert.equal(second.skipped, 2);
  assert.equal(state.sent.length, 2);
});

test("a failed send is undone, so the next run tries again", async () => {
  const state = setUp({
    appointments: [],
    notifyMany: async () => {
      throw new Error("delivery failed");
    },
  });
  const originalError = console.error;
  console.error = () => {};

  try {
    const result = await reminders.runReminders(NOW);

    assert.equal(result.failed, 1);
    assert.equal(result.sent, 0);
    assert.equal(state.flags[VACCINATION_ID], false);
  } finally {
    console.error = originalError;
  }
});

test("a baby with no linked parent is skipped and stays unsent", async () => {
  const state = setUp({
    vaccinations: [{ _id: VACCINATION_ID, babyId: LONELY_BABY_ID }],
    appointments: [],
    babies: [{ _id: LONELY_BABY_ID, authorizedUserIds: [] }],
  });

  const result = await reminders.runReminders(NOW);

  assert.equal(result.skipped, 1);
  assert.equal(state.sent.length, 0);
  assert.equal(state.updates.length, 0);
  assert.equal(state.flags[VACCINATION_ID], false);
});

test("reminder texts contain no JMBG and no medical details", () => {
  for (const type of ["vaccination.reminder", "appointment.reminder"]) {
    const template = getNotificationTemplate(type);
    const text = `${template.title} ${template.message}`;

    assert.ok(!/\d{13}/.test(text));
    assert.ok(template.message.length <= 500);
  }
});

test("the daily schedule is a valid cron expression", () => {
  assert.equal(cron.validate(reminders.REMINDER_SCHEDULE), true);
  assert.equal(reminders.REMINDER_TIMEZONE, "Europe/Podgorica");
});

// ---------- POST /admin/run-reminders ----------

const withServer = async (callback) => {
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const tokenFor = (userId, role) =>
  jwt.sign({ payload: { _id: userId, role } }, TEST_SECRET, {
    expiresIn: "1h",
  });

test("only an admin can run reminders now", async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  User.findById = async (id) =>
    String(id) === PARENT_A
      ? { _id: PARENT_A, role: ROLES.PARENT, isActive: true }
      : null;
  let ran = false;
  reminders.runReminders = async () => {
    ran = true;
    return {};
  };

  await withServer(async (baseUrl) => {
    const noToken = await fetch(`${baseUrl}/admin/run-reminders`, {
      method: "POST",
    });
    const parent = await fetch(`${baseUrl}/admin/run-reminders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenFor(PARENT_A, ROLES.PARENT)}` },
    });

    assert.equal(noToken.status, 401);
    assert.equal(parent.status, 403);
  });

  assert.equal(ran, false);
});

test("the admin runs the same job and gets the counts", async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  User.findById = async (id) =>
    String(id) === ADMIN_ID
      ? { _id: ADMIN_ID, role: ROLES.ADMIN, isActive: true }
      : null;
  const auditCalls = [];
  audit.log = async (entry) => {
    auditCalls.push(entry);
  };
  reminders.runReminders = async () => ({
    vaccinations: 1,
    appointments: 1,
    sent: 2,
    skipped: 0,
    failed: 0,
  });

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/run-reminders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenFor(ADMIN_ID, ROLES.ADMIN)}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.sent, 2);
    assert.ok(body.runId);
  });

  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0].action, "reminders.run");
  assert.ok(auditCalls[0].targetDocumentId);
});
