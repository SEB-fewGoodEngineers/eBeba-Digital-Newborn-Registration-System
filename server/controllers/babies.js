
const express = require("express");
const Baby = require("../models/Baby");
const Institution = require("../models/Institution");

const { verifyToken, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const { createBabySchema } = require("../validators/babies");
const { generateNumber } = require("../services/workflow");
const audit = require("../services/audit");
const { ROLES, INSTITUTION_TYPES } = require("../constants");

const router = express.Router();

// CREATE A BIRTH RECORD
router.post(
  "/",
  verifyToken,
  requireRole(ROLES.HOSPITAL_STAFF),
  validate(createBabySchema),
  asyncHandler(async (req, res) => {
    const hospital = await Institution.findById(
      req.user.institutionId,
    );

    if (
      !hospital ||
      !hospital.isActive ||
      hospital.type !== INSTITUTION_TYPES.HOSPITAL
    ) {
      return res.status(403).json({
        err: "Your hospital is not available.",
      });
    }

    const birthRecordNumber = await generateNumber(
      "BR-" + hospital.code,
    );

    const baby = await Baby.create({
      ...req.body,
      hospitalId: req.user.institutionId,
      createdByUserId: req.user._id,
      birthRecordNumber,
    });

    await audit.log({
      actor: req.user,
      action: "birth_record.create",
      targetCollection: "babies",
      targetDocumentId: baby._id,
      changes: { after: baby },
    });

    res.status(201).json(baby);
  }),
);

// GET MY HOSPITAL'S BIRTH RECORDS
router.get(
  "/",
  verifyToken,
  requireRole(ROLES.HOSPITAL_STAFF),
  asyncHandler(async (req, res) => {
    const babies = await Baby.find({
      hospitalId: req.user.institutionId,
    }).sort({ createdAt: -1 });

    res.status(200).json(babies);
  }),
);

module.exports = router;
