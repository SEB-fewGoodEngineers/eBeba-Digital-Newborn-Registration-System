const express = require("express");
const Baby = require("../models/Baby");
const GrowthMeasurement = require("../models/GrowthMeasurement");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { ROLES } = require("../constants");

const router = express.Router();

// Only what the list needs. No JMBG, no parents' details.
const BABY_LIST_FIELDS =
  "firstName lastName gender birthDateTime birthRecordNumber placeOfBirth";

// Only the measurements, not who logged them.
const GROWTH_FIELDS = "measuredAt weightGrams heightCm headCircumferenceCm";

router.use(verifyToken, requireRole(ROLES.PEDIATRICIAN));

// LIST MY BABIES (only the babies assigned to me, youngest first)
router.get(
  "/babies",
  asyncHandler(async (req, res) => {
    const babies = await Baby.find({ assignedPediatricianId: req.user._id })
      .select(BABY_LIST_FIELDS)
      .sort({ birthDateTime: -1 })
      .lean();
    res.status(200).json(babies);
  }),
);

// STORY 4.7 - SEE A BABY'S GROWTH (read-only, oldest first)
// The data belongs to Epic 5 (growthMeasurements). Its own routes stay
// parent-only; this route only reads. requireBabyAccess lets in only the
// pediatrician assigned to the baby.
router.get(
  "/babies/:babyId/growth-measurements",
  requireBabyAccess,
  asyncHandler(async (req, res) => {
    const measurements = await GrowthMeasurement.find({ babyId: req.baby._id })
      .select(GROWTH_FIELDS)
      .sort({ measuredAt: 1 })
      .lean();

    res.status(200).json({
      baby: {
        _id: req.baby._id,
        firstName: req.baby.firstName,
        lastName: req.baby.lastName,
        birthDateTime: req.baby.birthDateTime,
        birthWeightGrams: req.baby.birthWeightGrams,
        birthLengthCm: req.baby.birthLengthCm,
      },
      measurements,
    });
  }),
);

module.exports = router;
