const express = require("express");
const Appointment = require("../models/Appointment");
const Vaccination = require("../models/Vaccination");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { ROLES, APPOINTMENT_STATUS } = require("../constants");
const { buildCalendar, formatLocalDay } = require("../services/calendar");

const router = express.Router({ mergeParams: true }); // gives access to :babyId

const DAY_MS = 24 * 60 * 60 * 1000;

router.use(verifyToken, requireRole(ROLES.PARENT), requireBabyAccess);

// DOWNLOAD THE BABY'S CALENDAR (.ics)
// Upcoming check-ups and scheduled vaccinations that are not given yet.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const today = formatLocalDay(now);

    const [appointments, vaccinations] = await Promise.all([
      Appointment.find({
        babyId: req.baby._id,
        status: APPOINTMENT_STATUS.UPCOMING,
        scheduledAt: { $gte: now },
      })
        .select("title scheduledAt location")
        .sort({ scheduledAt: 1 })
        .lean(),

      // A vaccination is for a whole day: one day back, then keep today and later.
      Vaccination.find({
        babyId: req.baby._id,
        administeredDate: null,
        scheduledDate: { $gte: new Date(now.getTime() - DAY_MS) },
      })
        .select("vaccineName doseNumber scheduledDate")
        .sort({ scheduledDate: 1 })
        .lean(),
    ]);

    const calendar = buildCalendar({
      baby: { firstName: req.baby.firstName },
      appointments,
      vaccinations: vaccinations.filter(
        (v) => formatLocalDay(v.scheduledDate) >= today,
      ),
      now,
    });

    res
      .status(200)
      .set({
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ebeba-calendar.ics"',
        "Cache-Control": "no-store", // health data: do not keep a copy
      })
      .send(calendar);
  }),
);

module.exports = router;
