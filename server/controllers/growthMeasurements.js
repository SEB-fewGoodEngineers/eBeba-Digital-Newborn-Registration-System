const express = require("express");
const GrowthMeasurement = require("../models/GrowthMeasurement");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { ROLES } = require("../constants");
const {
  createGrowthMeasurementSchema,
} = require("../validators/growthMeasurements");

const router = express.Router({ mergeParams: true });

// Security: every route here requires a logged-in parent linked to this baby
router.use(verifyToken, requireRole(ROLES.PARENT), requireBabyAccess);

// LIST ALL GROWTH MEASUREMENTS FOR THIS BABY (NEWEST FIRST)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const measurements = await GrowthMeasurement.find({
      babyId: req.params.babyId,
    }).sort({ measuredAt: -1, createdAt: -1 });

    res.status(200).json(measurements);
  }),
);

// CREATE A GROWTH MEASUREMENT
router.post(
  "/",
  validate(createGrowthMeasurementSchema),
  asyncHandler(async (req, res) => {
    const measurement = await GrowthMeasurement.create({
      ...req.body,
      // Security: set owner fields on the server so the user cannot fake them
      babyId: req.params.babyId,
      loggedByUserId: req.user._id,
    });

    await audit.log({
      actor: req.user,
      action: "growth_measurement.create",
      targetCollection: "growthMeasurements",
      targetDocumentId: measurement._id,
      changes: { after: measurement },
    });

    res.status(201).json(measurement);
  }),
);

module.exports = router;
