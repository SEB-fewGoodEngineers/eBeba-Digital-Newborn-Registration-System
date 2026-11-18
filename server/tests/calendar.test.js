const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const Appointment = require("../models/Appointment");
const Vaccination = require("../models/Vaccination");
const { ROLES, APPOINTMENT_STATUS } = require("../constants");
const {
  buildCalendar,
  escapeText,
  foldLine,
  formatLocalDay,
} = require("../services/calendar");

// Fictional ids and data only. No database connection is needed.
const PARENT_ID = "507f1f77bcf86cd799439071";
const PEDIATRICIAN_ID = "507f1f77bcf86cd799439072";
const STRANGER_ID = "507f1f77bcf86cd799439073";
const BABY_ID = "507f1f77bcf86cd799439074";
const APPOINTMENT_ID = "507f1f77bcf86cd799439075";
const VACCINATION_ID = "507f1f77bcf86cd799439076";
const TEST_SECRET = "synthetic-4-6-secret-for-testing-only";

const NOW = new Date("2026-11-18T10:00:00.000Z");

const appointment = {
  _id: APPOINTMENT_ID,
  title: "Check-up at 1 month (demo)",
  scheduledAt: new Date("2026-11-21T08:00:00.000Z"),
  location: "Dom zdravlja Lovćen, Podgorica (demo)",
};

// Local midnight in Montenegro (23:00 UTC the day before), as the app saves it.
const vaccination = {
  _id: VACCINATION_ID,
  vaccineName: "Vaccine C (demo)",
  doseNumber: 1,
  scheduledDate: new Date("2026-11-24T23:00:00.000Z"),
};

// Unfold the lines, as a calendar app does.
const unfold = (ics) => ics.replace(/\r\n /g, "");

// ---------- The .ics builder ----------

test("builds a valid calendar with CRLF line endings", () => {
  const ics = buildCalendar({
    baby: { firstName: "Demo" },
    appointments: [appointment],
    vaccinations: [vaccination],
    now: NOW,
  });

  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(!/[^\r]\n/.test(ics), "every line break is CRLF");
  assert.match(ics, /PRODID:/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
});

test("a check-up is a timed event in UTC, one hour long", () => {
  const ics = unfold(
    buildCalendar({ baby: {}, appointments: [appointment], now: NOW }),
  );

  assert.match(ics, /DTSTART:20261121T080000Z/);
  assert.match(ics, /DTEND:20261121T090000Z/);
  assert.match(ics, /DTSTAMP:20261118T100000Z/);
  assert.match(ics, new RegExp(`UID:appointment-${APPOINTMENT_ID}@`));
  assert.match(ics, /LOCATION:Dom zdravlja Lovćen\\, Podgorica \(demo\)/);
});

test("a vaccination is an all-day event on the Montenegro day", () => {
  const ics = unfold(
    buildCalendar({ baby: {}, vaccinations: [vaccination], now: NOW }),
  );

  // 23:00 UTC on 24.11. is 00:00 on 25.11. in Podgorica.
  assert.match(ics, /DTSTART;VALUE=DATE:20261125/);
  assert.match(ics, /DTEND;VALUE=DATE:20261126/);
  assert.match(ics, /SUMMARY:Vaccination: Vaccine C \(demo\)\\, dose 1/);
});

test("the month and year roll over for an all-day event", () => {
  const ics = buildCalendar({
    baby: {},
    vaccinations: [
      { ...vaccination, scheduledDate: new Date("2026-12-30T23:00:00.000Z") },
    ],
    now: NOW,
  });

  assert.match(ics, /DTSTART;VALUE=DATE:20261231/);
  assert.match(ics, /DTEND;VALUE=DATE:20270101/);
});

test("escapes commas, semicolons, backslashes and new lines", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("folds long lines at 75 bytes without cutting č ć š ž đ", () => {
  const line = `SUMMARY:${"čćšžđ".repeat(20)}`;
  const folded = foldLine(line);

  for (const part of folded.split("\r\n")) {
    assert.ok(Buffer.byteLength(part, "utf8") <= 75);
  }
  assert.equal(folded.replace(/\r\n /g, ""), line);
});

test("never contains a JMBG", () => {
  const ics = buildCalendar({
    baby: { firstName: "Demo", jmbg: "0101026990010" },
    appointments: [appointment],
    vaccinations: [vaccination],
    now: NOW,
  });

  assert.ok(!/\d{13}/.test(ics));
});

test("formatLocalDay uses the Montenegro time zone", () => {
  assert.equal(formatLocalDay(new Date("2026-11-24T23:00:00Z")), "20261125");
  assert.equal(formatLocalDay(new Date("2026-07-01T21:59:00Z")), "20260701");
});

// ---------- GET /babies/:babyId/calendar.ics ----------

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
  firstName: "Demo",
  jmbg: "0101026990010",
  authorizedUserIds: [PARENT_ID],
  assignedPediatricianId: PEDIATRICIAN_ID,
};

const original = {
  userFindById: User.findById,
  babyFindById: Baby.findById,
  appointmentFind: Appointment.find,
  vaccinationFind: Vaccination.find,
  secret: process.env.JWT_SECRET,
};

let server;
let baseUrl;

const url = `/babies/${BABY_ID}/calendar.ics`;

const tokenFor = (userId) =>
  jwt.sign(
    { payload: { _id: userId, role: users[userId].role } },
    TEST_SECRET,
    { expiresIn: "1h" },
  );

const request = (path, userId) =>
  fetch(`${baseUrl}${path}`, {
    headers: userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {},
  });

// A chainable stand-in for Model.find().select().sort().lean().
const fakeFind = (rows, calls) => (filter) => {
  calls.push(filter);
  const query = {
    select: () => query,
    sort: () => query,
    lean: async () => rows,
  };
  return query;
};

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
  Appointment.find = original.appointmentFind;
  Vaccination.find = original.vaccinationFind;
});

after(async () => {
  User.findById = original.userFindById;
  Baby.findById = original.babyFindById;
  process.env.JWT_SECRET = original.secret;
  await new Promise((resolve) => server.close(resolve));
});

test("the calendar needs a token", async () => {
  const response = await request(url);

  assert.equal(response.status, 401);
});

test("only a parent can download it (pediatrician gets 403)", async () => {
  const response = await request(url, PEDIATRICIAN_ID);

  assert.equal(response.status, 403);
});

test("a parent of another baby gets 403", async () => {
  const response = await request(url, STRANGER_ID);

  assert.equal(response.status, 403);
});

test("the parent downloads an .ics with upcoming items only", async () => {
  const calls = { appointments: [], vaccinations: [] };
  const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 20 * 60 * 60 * 1000);

  Appointment.find = fakeFind(
    [{ ...appointment, scheduledAt: future }],
    calls.appointments,
  );
  // One from yesterday (the query looks one day back) and one in the future.
  Vaccination.find = fakeFind(
    [
      {
        ...vaccination,
        _id: "old",
        scheduledDate: new Date(past.getTime() - 24 * 60 * 60 * 1000),
      },
      { ...vaccination, scheduledDate: future },
    ],
    calls.vaccinations,
  );

  const response = await request(url, PARENT_ID);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/calendar/);
  assert.match(
    response.headers.get("content-disposition"),
    /attachment; filename="ebeba-calendar.ics"/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");

  const [appointmentFilter] = calls.appointments;
  const [vaccinationFilter] = calls.vaccinations;
  assert.equal(String(appointmentFilter.babyId), BABY_ID);
  assert.equal(appointmentFilter.status, APPOINTMENT_STATUS.UPCOMING);
  assert.ok(appointmentFilter.scheduledAt.$gte instanceof Date);
  assert.equal(String(vaccinationFilter.babyId), BABY_ID);
  assert.equal(vaccinationFilter.administeredDate, null);

  assert.equal((body.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.ok(!body.includes("vaccination-old@"));
  assert.ok(!body.includes(baby.jmbg));
  assert.match(body, /For Demo/);
});
