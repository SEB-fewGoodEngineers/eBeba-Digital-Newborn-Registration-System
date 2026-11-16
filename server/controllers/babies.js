
const express = require("express");
const Baby = require("../models/Baby");
const Institution = require("../models/Institution");

const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const {
  createBabySchema,
  linkBabySchema,
} = require("../validators/babies");
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
    const hospital = await Institution.findById(req.user.institutionId);

    if (
      !hospital ||
      !hospital.isActive ||
      hospital.type !== INSTITUTION_TYPES.HOSPITAL
    ) {
      return res.status(403).json({
        err: "Your hospital is not available.",
      });
    }

    const birthRecordNumber = await generateNumber("BR-" + hospital.code);

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

// LINK MY ACCOUNT TO MY BABY
router.post(
  "/link",
  verifyToken,
  requireRole(ROLES.PARENT),
  validate(linkBabySchema),
  asyncHandler(async (req, res) => {
    const { birthRecordNumber } = req.body;

    const linkError =
      "We could not find a birth record for your account.";

    const baby = await Baby.findOne({ birthRecordNumber });

    if (!baby) {
      return res.status(404).json({ err: linkError });
    }

    const userEmail = req.user.email.trim().toLowerCase();
    const motherEmail = baby.mother?.email?.trim().toLowerCase();
    const fatherEmail = baby.father?.email?.trim().toLowerCase();

    if (userEmail !== motherEmail && userEmail !== fatherEmail) {
      return res.status(404).json({ err: linkError });
    }

    const result = await Baby.updateOne(
      { _id: baby._id },
      {
        $addToSet: {
          authorizedUserIds: req.user._id,
        },
      },
    );

    const linkedBaby = await Baby.findById(baby._id);

    if (result.modifiedCount > 0) {
      await audit.log({
        actor: req.user,
        action: "birth_record.link",
        targetCollection: "babies",
        targetDocumentId: baby._id,
        changes: {
          after: {
            authorizedUserIds: linkedBaby.authorizedUserIds,
          },
        },
      });
    }

    res.status(200).json(linkedBaby);
  }),
);

// GET ALL BABIES LINKED TO MY ACCOUNT
router.get(
  "/mine",
  verifyToken,
  requireRole(ROLES.PARENT),
  asyncHandler(async (req, res) => {
    const babies = await Baby.find({
      authorizedUserIds: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(babies);
  }),
);

// GET ONE BABY IF THE USER HAS ACCESS
router.get(
  "/:babyId",
  verifyToken,
  requireBabyAccess,
  asyncHandler(async (req, res) => {
    res.status(200).json(req.baby);
  }),
);

module.exports = router;
