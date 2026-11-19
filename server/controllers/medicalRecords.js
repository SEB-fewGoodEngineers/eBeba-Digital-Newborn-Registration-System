const express = require("express");
const mongoose = require("mongoose");
const MedicalRecord = require("../models/MedicalRecord");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { ROLES, ENTRY_SOURCES } = require("../constants");
const { notifyParents } = require("../services/notifications");
const {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
} = require("../validators/medicalRecords");

const router = express.Router({ mergeParams: true }); // gives access to :babyId

// The entry source always comes from the user's role, never from the request
const SOURCE_BY_ROLE = Object.freeze({
  [ROLES.PARENT]: ENTRY_SOURCES.PARENT,
  [ROLES.PEDIATRICIAN]: ENTRY_SOURCES.PEDIATRICIAN,
});

router.use(
  verifyToken,
  requireRole(ROLES.PARENT, ROLES.PEDIATRICIAN),
  requireBabyAccess,
);

// LIST A BABY'S MEDICAL RECORDS (newest first)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const records = await MedicalRecord.find({ babyId: req.baby._id }).sort({
      examinationDate: -1,
      createdAt: -1,
    });
    res.status(200).json(records);
  }),
);

// CREATE A MEDICAL RECORD
router.post(
  "/",
  validate(createMedicalRecordSchema),
  asyncHandler(async (req, res) => {
    const record = await MedicalRecord.create({
      ...req.body, // already checked and cleaned by Zod
      babyId: req.baby._id, // server fields come LAST, so they always win
      entrySource: SOURCE_BY_ROLE[req.user.role],
      authorUserId: req.user._id,
    });
    await audit.log({
      actor: req.user,
      action: "medical_record.create",
      targetCollection: "medicalRecords",
      targetDocumentId: record._id,
      changes: { after: record },
    });

    // STORY 4.5: the parents are told when the pediatrician adds an entry
    if (req.user.role === ROLES.PEDIATRICIAN) {
      await notifyParents(req.baby, {
        type: "medical_record.added_by_pediatrician",
      });
    }

    res.status(201).json(record);
  }),
);

// CHANGE A MEDICAL RECORD (only a record that your own role entered)
router.patch(
  "/:recordId",
  validate(updateMedicalRecordSchema),
  asyncHandler(async (req, res) => {
    const { recordId } = req.params;
    if (!mongoose.isValidObjectId(recordId)) {
      return res.status(404).json({ err: "Medical record not found." });
    }

    // babyId in the filter: a record of another baby is "not found"
    const record = await MedicalRecord.findOne({
      _id: recordId,
      babyId: req.baby._id,
    });
    if (!record) {
      return res.status(404).json({ err: "Medical record not found." });
    }

    if (record.entrySource !== SOURCE_BY_ROLE[req.user.role]) {
      const who =
        record.entrySource === ENTRY_SOURCES.PEDIATRICIAN
          ? "a pediatrician"
          : "a parent";
      return res.status(403).json({
        err: `This record was entered by ${who}. You cannot change it.`,
      });
    }

    const before = record.toObject();
    record.set(req.body);
    await record.save();
    await audit.log({
      actor: req.user,
      action: "medical_record.update",
      targetCollection: "medicalRecords",
      targetDocumentId: record._id,
      changes: { before, after: record },
    });
    res.status(200).json(record);
  }),
);

module.exports = router;
