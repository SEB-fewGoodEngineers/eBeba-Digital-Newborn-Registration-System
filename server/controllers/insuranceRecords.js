const express = require("express");
const InsuranceRecord = require("../models/InsuranceRecord");
const Baby = require("../models/Baby");
const User = require("../models/User");
const { verifyToken, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const workflow = require("../services/workflow");
const notifications = require("../services/notifications");
const { ROLES, INSURANCE_STATUS, INSTITUTION_TYPES } = require("../constants");
const { z } = require("zod");
const { notify } = require("../services/notifications");

const router = express.Router();

router.use(verifyToken, requireRole(ROLES.HEALTH_INSURANCE_STAFF));

const { issueInsuranceSchema } = require("../validators/insuranceRecords");

const assignPediatricianSchema = z.object({
  pediatricianId: z.string().min(1, "Pediatrician ID is required."),
});

// 3.3 LISTA FZO ZAPISA ZA GRANU FZO
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const records = await InsuranceRecord.find({ fundBranchId: req.user.institutionId })
      .sort({ createdAt: -1 })
      .populate("babyId")
      .lean();
    res.status(200).json(records);
  })
);

// DETALJI JEDNOG ZAPISA
router.get(
  "/:recordId",
  asyncHandler(async (req, res) => {
    const record = await InsuranceRecord.findOne({
      _id: req.params.recordId,
      fundBranchId: req.user.institutionId,
    })
      .populate("babyId")
      .lean();

    if (!record) {
      return res.status(404).json({ err: "Insurance record not found." });
    }
    res.status(200).json(record);
  })
);

// 3.4 START FZO ZAPISA (prelazak u "in_progress")
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

    workflow.transition(record, INSURANCE_STATUS.IN_PROGRESS, req.user, "Started processing insurance");
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
  })
);

// 3.4 ISSUE INSURANCE AND CARDS (generisanje brojeva i prelazak u "card_issued")
router.post(
  "/:recordId/issue",
  validate(issueInsuranceSchema),
  asyncHandler(async (req, res) => {
    const record = await InsuranceRecord.findOne({
      _id: req.params.recordId,
      fundBranchId: req.user.institutionId,
    }).populate("babyId");

    if (!record) {
      return res.status(404).json({ err: "Insurance record not found." });
    }

    workflow.transition(record, INSURANCE_STATUS.CARD_ISSUED, req.user, "Cards issued");
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

   const baby = await Baby.findById(record.babyId);
    if (baby && baby.authorizedUserIds) {
      await notify(baby.authorizedUserIds, {
        type: "insurance_record.card_issued",
        title: "Insurance cards issued",
        message: "Your baby's health insurance cards have been issued.",
        link: `/babies/${baby._id}`,
        babyId: baby._id,
      });
    }

    res.status(200).json(record);
  })
);

// 3.5 LISTA AKTIVNIH PEDIATARA ZA DODELU
router.get(
  "/pediatricians",
  asyncHandler(async (req, res) => {
    // Nalazi sve korisnike sa ulogom PEDIATRICIAN
    const pediatricians = await User.find({
      role: ROLES.PEDIATRICIAN,
      isActive: true,
    })
      .select("firstName lastName email institutionId")
      .lean();

    res.status(200).json(pediatricians);
  })
);

// 3.5 ASSIGN PEDIATRICIAN
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
      return res.status(404).json({ err: "Active pediatrician not found." });
    }

    // Dodeljivanje pedijatra bebi (čuva se u babies.assignedPediatricianId)
    const baby = await Baby.findById(record.babyId);
    if (!baby) {
      return res.status(404).json({ err: "Baby record not found." });
    }

    baby.assignedPediatricianId = pediatrician._id;
    await baby.save();

    await audit.log({
      actor: req.user,
      action: "baby.assign_pediatrician",
      targetCollection: "babies",
      targetDocumentId: baby._id,
    });

    if (baby.authorizedUserIds) {
      await notifications.notifyMany(baby.authorizedUserIds, {
        type: "baby.pediatrician_assigned",
        title: "Pediatrician assigned",
        message: "A pediatrician has been assigned to your baby.",
      });
    }

    res.status(200).json({ message: "Pediatrician assigned successfully.", baby });
  })
);

module.exports = router;