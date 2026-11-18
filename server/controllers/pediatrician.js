const express = require("express");
const Baby = require("../models/Baby");
const { verifyToken, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { ROLES } = require("../constants");

const router = express.Router();

// Only what the list needs. No JMBG, no parents' details.
const BABY_LIST_FIELDS =
  "firstName lastName gender birthDateTime birthRecordNumber placeOfBirth";

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

module.exports = router;
