const express = require("express");
const InsuranceRecord = require("../models/InsuranceRecord");
const Baby = require("../models/Baby");
const User = require("../models/User");
const { verifyToken, requireRole } = require("../middleware/auth");
const { pdf } = require("../services/documents");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { notifyMany } = require("../services/notifications");
const workflow = require("../services/workflow");
const { ROLES, INSURANCE_STATUS } = require("../constants");
const {
  issueInsuranceSchema,
  assignPediatricianSchema,
} = require("../validators/insuranceRecords");

const router = express.Router();

// 1. PREUZIMANJE PDF-a (MORA BITI PRVI - dozvoljava i FZO i roditelje)
router.get(
  "/babies/:babyId/insurance-card/pdf",
  verifyToken,
  asyncHandler(async (req, res) => {
    const baby = await Baby.findById(req.params.babyId);
    if (!baby) {
      return res.status(404).json({ err: "Baby not found." });
    }

    const isFzoStaff = req.user.role === ROLES.HEALTH_INSURANCE_STAFF;
    const isParent =
      req.user.role === ROLES.PARENT &&
      baby.parentUserIds.some((id) => id.toString() === req.user._id.toString());

    if (!isFzoStaff && !isParent) {
      return res.status(403).json({ err: "Access denied." });
    }

    const record = await InsuranceRecord.findOne({ babyId: baby._id });
    if (!record || !record.healthInsuranceNumber) {
      return res
        .status(404)
        .json({ err: "Health insurance card has not been issued yet." });
    }

    let pediatrician = null;
    if (baby.assignedPediatricianId) {
      pediatrician = await User.findById(baby.assignedPediatricianId).select(
        "firstName lastName",
      );
    }

    await pdf.card(res, {
      type: "insurance",
      baby,
      record,
      pediatrician,
    });
  }),
);

// ZAŠTITA ZA SVE OSTALE FZO RUTE (Samo FZO službenici)
router.use(verifyToken, requireRole(ROLES.HEALTH_INSURANCE_STAFF));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const records = await InsuranceRecord.find({
      fundBranchId: req.user.institutionId,
    })
      .sort({ createdAt: -1 })
      .populate("babyId");
    res.status(200).json(records);
  }),
);

router.get(
  "/pediatricians",
  asyncHandler(async (req, res) => {
    const pediatricians = await User.find({
      role: ROLES.PEDIATRICIAN,
      isActive: true,
    })
      .select("firstName lastName email institutionId")
      .populate("institutionId", "name municipality");

    res.status(200).json(pediatricians);
  }),
);

router.get(
  "/:recordId",
  asyncHandler(async (req, res) => {
    const record = await InsuranceRecord.findOne({
      _id: req.params.recordId,
      fundBranchId: req.user.institutionId,
    }).populate("babyId");

    if (!record) {
      return res.status(404).json({ err: "Insurance record not found." });
    }
    res.status(200).json(record);
  }),
);

router.post(
  "/:recordId/start",
  asyncHandler(async (req, res) => {
    const record = await InsuranceRecord.findOne({
      _id: req.params.recordId,
      fundBranchId: req.user.institutionId,
    });

    if (!record) {
      return res.status(404).json({ err: "Insurance record not found." });
    }

    workflow.transition(
      record,
      INSURANCE_STATUS.IN_PROGRESS,
      req.user,
      "Started insurance processing",
    );
    record.processedByUserId = req.user._id;
    await record.save();

    await audit.log({
      actor: req.user,
      action: "insurance_record.start",
      targetCollection: "insuranceRecords",
      targetDocumentId: record._id,
      changes: { after: record },
    });

    res.status(200).json(record);
  }),
);

router.post(
  "/:recordId/issue",
  validate(issueInsuranceSchema),
  asyncHandler(async (req, res) => {
    const record = await InsuranceRecord.findOne({
      _id: req.params.recordId,
      fundBranchId: req.user.institutionId,
    });

    if (!record) {
      return res.status(404).json({ err: "Insurance record not found." });
    }

    const baby = await Baby.findById(record.babyId);
    if (!baby) {
      return res.status(404).json({ err: "Baby not found." });
    }

    const isLinkedParent = baby.authorizedUserIds.some((id) =>
      id.equals(req.body.insuredParentId),
    );
    if (!isLinkedParent) {
      return res
        .status(400)
        .json({ err: "Selected parent is not linked to this baby." });
    }

    workflow.transition(
      record,
      INSURANCE_STATUS.CARD_ISSUED,
      req.user,
      "Cards issued",
    );
    record.insuredParentId = req.body.insuredParentId;
    record.policyNumber = workflow.generateNumber("POL");
    record.healthCardNumber = workflow.generateNumber("HC");
    record.insuredPersonCardNumber = workflow.generateNumber("IPC");
    record.cardIssuedAt = new Date();
    record.processedByUserId = req.user._id;
    await record.save();

    await audit.log({
      actor: req.user,
      action: "insurance_record.issue",
      targetCollection: "insuranceRecords",
      targetDocumentId: record._id,
      changes: { after: record },
    });

    if (baby.authorizedUserIds.length > 0) {
      await notifyMany(baby.authorizedUserIds, {
        type: "insurance_record.card_issued",
        title: "Insurance cards issued",
        message: "Your baby's health insurance cards have been issued.",
        link: `/babies/${baby._id}`,
        babyId: baby._id,
      });
    }

    res.status(200).json(record);
  }),
);

router.post(
  "/:recordId/pediatrician",
  validate(assignPediatricianSchema),
  asyncHandler(async (req, res) => {
    const record = await InsuranceRecord.findOne({
      _id: req.params.recordId,
      fundBranchId: req.user.institutionId,
    });

    if (!record) {
      return res.status(404).json({ err: "Insurance record not found." });
    }

    const pediatrician = await User.findOne({
      _id: req.body.pediatricianId,
      role: ROLES.PEDIATRICIAN,
      isActive: true,
    });

    if (!pediatrician) {
      return res
        .status(400)
        .json({ err: "Selected user is not an active pediatrician." });
    }

    const baby = await Baby.findById(record.babyId);
    if (!baby) {
      return res.status(404).json({ err: "Baby not found." });
    }

    const previousPediatricianId = baby.assignedPediatricianId;
    baby.assignedPediatricianId = pediatrician._id;
    await baby.save();

    await audit.log({
      actor: req.user,
      action: "baby.assign_pediatrician",
      targetCollection: "babies",
      targetDocumentId: baby._id,
      changes: {
        before: { assignedPediatricianId: previousPediatricianId },
        after: { assignedPediatricianId: baby.assignedPediatricianId },
      },
    });

    if (baby.authorizedUserIds.length > 0) {
      await notifyMany(baby.authorizedUserIds, {
        type: "baby.pediatrician_assigned",
        title: "Pediatrician assigned",
        message: `Dr. ${pediatrician.firstName} ${pediatrician.lastName} has been assigned as your baby's pediatrician.`,
        link: `/babies/${baby._id}`,
        babyId: baby._id,
      });
    }

    res.status(200).json(baby);
  }),
);

module.exports = router;