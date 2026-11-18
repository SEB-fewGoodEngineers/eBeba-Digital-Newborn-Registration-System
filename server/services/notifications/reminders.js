const cron = require("node-cron");
const Vaccination = require("../../models/Vaccination");
const Appointment = require("../../models/Appointment");
const Baby = require("../../models/Baby");
const { APPOINTMENT_STATUS } = require("../../constants");
// Called as notifications.notifyMany so tests can replace it.
const notifications = require("./index");

const DAY_MS = 24 * 60 * 60 * 1000;

// Once a day at 08:00 Montenegro time.
const REMINDER_SCHEDULE = "0 8 * * *";
const REMINDER_TIMEZONE = "Europe/Podgorica";

// What to remind about. Each kind has its own model, date field and filter.
const REMINDER_KINDS = [
  {
    key: "vaccinations",
    model: Vaccination,
    dateField: "scheduledDate",
    // A vaccination that was already given needs no reminder.
    extraFilter: { administeredDate: null },
    type: "vaccination.reminder",
  },
  {
    key: "appointments",
    model: Appointment,
    dateField: "scheduledAt",
    // A completed or cancelled check-up needs no reminder.
    extraFilter: { status: APPOINTMENT_STATUS.UPCOMING },
    type: "appointment.reminder",
  },
];

// Send one reminder and mark the item as sent.
// The item is "claimed" first (reminderSent: false → true in one step), so the
// daily job and the admin button can never send the same reminder twice.
// If sending fails, the claim is undone so the next run tries again.
const remindOne = async (kind, item, parentIds) => {
  const claim = await kind.model.updateOne(
    { _id: item._id, reminderSent: false },
    { $set: { reminderSent: true } },
  );
  if (claim.modifiedCount !== 1) {
    return "skipped"; // another run already took it
  }

  try {
    await notifications.notifyMany(parentIds, {
      type: kind.type,
      link: "/dashboard",
      babyId: item.babyId,
    });
    return "sent";
  } catch (err) {
    console.error(`Reminder for ${kind.key} failed:`, err.message);
    await kind.model.updateOne(
      { _id: item._id },
      { $set: { reminderSent: false } },
    );
    return "failed";
  }
};

// THE REMINDER JOB
// Sends a reminder for every vaccination and appointment in the next 24 hours
// with reminderSent: false, then sets reminderSent: true.
// Returns counts only, never names or dates, so the result is safe to log.
const runReminders = async (now = new Date()) => {
  const until = new Date(now.getTime() + DAY_MS);
  const result = { from: now, until, sent: 0, skipped: 0, failed: 0 };

  for (const kind of REMINDER_KINDS) {
    const items = await kind.model
      .find({
        reminderSent: false,
        [kind.dateField]: { $gte: now, $lte: until },
        ...kind.extraFilter,
      })
      .select("_id babyId")
      .lean();

    result[kind.key] = items.length;
    if (items.length === 0) continue;

    // Load all the babies at once, not one query per item.
    const babyIds = [...new Set(items.map((item) => String(item.babyId)))];
    const babies = await Baby.find({ _id: { $in: babyIds } })
      .select("authorizedUserIds")
      .lean();
    const parentsByBaby = new Map(
      babies.map((baby) => [String(baby._id), baby.authorizedUserIds || []]),
    );

    for (const item of items) {
      const parentIds = parentsByBaby.get(String(item.babyId)) || [];
      if (parentIds.length === 0) {
        // No linked parent yet: keep reminderSent false, nobody to tell.
        result.skipped += 1;
        continue;
      }

      const outcome = await remindOne(kind, item, parentIds);
      result[outcome] += 1;
    }
  }

  return result;
};

// Start the daily job. Called once from server.js (not from app.js, so tests
// never start a timer).
const startReminderJob = () =>
  cron.schedule(
    REMINDER_SCHEDULE,
    async () => {
      try {
        const result = await runReminders();
        console.log(
          `Reminders: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed.`,
        );
      } catch (err) {
        console.error("Reminder job failed:", err.message);
      }
    },
    { timezone: REMINDER_TIMEZONE, name: "daily-reminders" },
  );

module.exports = {
  runReminders,
  startReminderJob,
  REMINDER_SCHEDULE,
  REMINDER_TIMEZONE,
};
