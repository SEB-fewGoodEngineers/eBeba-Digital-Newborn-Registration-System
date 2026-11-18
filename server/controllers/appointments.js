const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { ROLES, APPOINTMENT_STATUS } = require("../constants");
const {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} = require("../validators/appointments");

const router = express.Router({ mergeParams: true }); // gives access to :babyId

const NOT_FOUND = { err: "Check-up not found." };

router.use(
  verifyToken,
  requireRole(ROLES.PARENT, ROLES.PEDIATRICIAN),
  requireBabyAccess,
);

// LIST A BABY'S CHECK-UPS (soonest first)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ babyId: req.baby._id })
      .sort({ scheduledAt: 1 })
      .lean();
    res.status(200).json(appointments);
  }),
);

// ADD A CHECK-UP
router.post(
  "/",
  validate(createAppointmentSchema),
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.create({
      ...req.body, // already checked and cleaned by Zod
      babyId: req.baby._id, // server fields come LAST, so they always win
      status: APPOINTMENT_STATUS.UPCOMING,
      createdByUserId: req.user._id,
      reminderSent: false,
    });
    await audit.log({
      actor: req.user,
      action: "appointment.create",
      targetCollection: "appointments",
      targetDocumentId: appointment._id,
      changes: { after: appointment },
    });
    res.status(201).json(appointment);
  }),
);

// MARK A CHECK-UP COMPLETED OR CANCELLED
// Only an upcoming check-up can change. Appointments have no statusHistory,
// so workflow.transition() does not apply; the one allowed step is checked here.
router.patch(
  "/:appointmentId",
  validate(updateAppointmentStatusSchema),
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    if (!mongoose.isValidObjectId(appointmentId)) {
      return res.status(404).json(NOT_FOUND);
    }

    // babyId in the filter: a check-up of another baby is "not found"
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      babyId: req.baby._id,
    });
    if (!appointment) {
      return res.status(404).json(NOT_FOUND);
    }

    if (appointment.status !== APPOINTMENT_STATUS.UPCOMING) {
      return res.status(409).json({
        err: `This check-up is already ${appointment.status}.`,
      });
    }

    const before = appointment.toObject();
    appointment.set({ status: req.body.status });
    await appointment.save();
    await audit.log({
      actor: req.user,
      action: "appointment.update_status",
      targetCollection: "appointments",
      targetDocumentId: appointment._id,
      changes: { before, after: appointment },
    });
    res.status(200).json(appointment);
  }),
);

module.exports = router;
