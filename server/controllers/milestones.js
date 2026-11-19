const express = require("express");
const Milestone = require("../models/Milestone");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { ROLES } = require("../constants");
const { createMilestoneSchema } = require("../validators/milestones");

const router = express.Router({ mergeParams: true });

// Security: every route here requires a logged-in parent linked to this baby
router.use(verifyToken, requireRole(ROLES.PARENT), requireBabyAccess);

// LIST ALL MILESTONES FOR THIS BABY (NEWEST FIRST)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const milestones = await Milestone.find({
      babyId: req.params.babyId,
    }).sort({ achievedAt: -1, createdAt: -1 });

    res.status(200).json(milestones);
  }),
);

// CREATE A MILESTONE
router.post(
  "/",
  validate(createMilestoneSchema),
  asyncHandler(async (req, res) => {
    const milestone = await Milestone.create({
      ...req.body,
      // Security: set owner fields on the server so the user cannot fake them
      babyId: req.params.babyId,
      loggedByUserId: req.user._id,
    });

    await audit.log({
      actor: req.user,
      action: "milestone.create",
      targetCollection: "milestones",
      targetDocumentId: milestone._id,
      changes: { after: milestone },
    });

    res.status(201).json(milestone);
  }),
);

module.exports = router;
