const express = require("express");
const CswCase = require("../models/CswCase");
const InsuranceRecord = require("../models/InsuranceRecord");
const User = require("../models/User");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { pdf } = require("../services/documents");
const {
  ROLES,
  CSW_CASE_STATUS,
  INSURANCE_STATUS,
} = require("../constants");

const router = express.Router({ mergeParams: true }); // gives access to :babyId

// Only the parents of the baby (requireBabyAccess puts the baby on req.baby)
router.use(verifyToken, requireRole(ROLES.PARENT), requireBabyAccess);

// DOWNLOAD THE SOCIAL CARD PDF
router.get(
  "/social-card",
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({ babyId: req.baby._id });
    if (
      !cswCase ||
      cswCase.status !== CSW_CASE_STATUS.COMPLETED ||
      !cswCase.socialCardNumber
    ) {
      return res
        .status(404)
        .json({ err: "The social card has not been issued yet." });
    }

    await audit.log({
      actor: req.user,
      action: "social_card.download",
      targetCollection: "cswCases",
      targetDocumentId: cswCase._id,
    });

    await pdf.card(res, { type: "social", baby: req.baby, record: cswCase });
  }),
);

// DOWNLOAD THE INSURED PERSON CARD PDF
router.get(
  "/insured-person-card",
  asyncHandler(async (req, res) => {
    const record = await InsuranceRecord.findOne({ babyId: req.baby._id });
    if (
      !record ||
      record.status !== INSURANCE_STATUS.CARD_ISSUED ||
      !record.insuredPersonCardNumber
    ) {
      return res
        .status(404)
        .json({ err: "The insured person card has not been issued yet." });
    }

    const pediatrician = req.baby.assignedPediatricianId
      ? await User.findById(req.baby.assignedPediatricianId).select(
          "firstName lastName",
        )
      : null;

    await audit.log({
      actor: req.user,
      action: "insured_person_card.download",
      targetCollection: "insuranceRecords",
      targetDocumentId: record._id,
    });

    await pdf.card(res, {
      type: "insured-person",
      baby: req.baby,
      record,
      pediatrician,
    });
  }),
);

module.exports = router;