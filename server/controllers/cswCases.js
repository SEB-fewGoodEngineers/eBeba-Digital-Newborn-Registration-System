const express = require("express");
const mongoose = require("mongoose");
const CswCase = require("../models/CswCase");
const Baby = require("../models/Baby");
const { verifyToken, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { pdf } = require("../services/documents");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const workflow = require("../services/workflow");
const { notifyParents } = require("../services/notifications");
const { ROLES, CSW_CASE_STATUS } = require("../constants");
const { notesSchema } = require("../validators/cswCases");
const router = express.Router();

// Finds a case of MY center. If there is none, sends 404 and returns null.
const findMyCase = async (req, res) => {
  const { caseId } = req.params;
  const cswCase = mongoose.isValidObjectId(caseId)
    ? await CswCase.findOne({
        _id: caseId,
        cswInstitutionId: req.user.institutionId,
      })
    : null;

  if (!cswCase) {
    res.status(404).json({ err: "CSW case not found." });
    return null;
  }
  return cswCase;
};

router.use(verifyToken, requireRole(ROLES.CSW_STAFF));
// 1. PREUZIMANJE PDF SOCIJALNE KARTICE (MORA BITI PRVO)
router.get(
  "/babies/:babyId/social-card/pdf",
  verifyToken,
  asyncHandler(async (req, res) => {
    const baby = await Baby.findById(req.params.babyId);
    if (!baby) {
      return res.status(404).json({ err: "Baby not found." });
    }

     const cswCase = await CswCase.findOne({ babyId: baby._id });

    // CSW staff: only cases of their own center
    const isCswStaff =
      req.user.role === ROLES.CSW_STAFF &&
      cswCase &&
      cswCase.cswInstitutionId.equals(req.user.institutionId);

    // Parent: only their own baby
    const isParent =
      req.user.role === ROLES.PARENT &&
      baby.authorizedUserIds.some((id) => id.equals(req.user._id));

    if (!isCswStaff && !isParent) {
      return res.status(403).json({ err: "Access denied." });
    }

    if (!cswCase || !cswCase.socialCardNumber) {
      return res
        .status(404)
        .json({ err: "Social card has not been issued yet." });
    }

    await pdf.card(res, { type: "social", baby, record: cswCase });
  }),
);

// ZAŠTITA ZA OSTALE CSW RUTE (Samo CSW službenici)

// LIST THE CASES OF MY CENTER (newest first)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cases = await CswCase.find({
      cswInstitutionId: req.user.institutionId,
    })
      .sort({ createdAt: -1 })
      .populate(
        "babyId",
        "firstName lastName jmbg gender birthDateTime placeOfBirth residentialAddress mother father",
      );
    res.status(200).json(cases);
  }),
);

// OPEN ONE CASE OF MY CENTER
router.get(
  "/:caseId",
  asyncHandler(async (req, res) => {
    const cswCase = await findMyCase(req, res);
    if (!cswCase) return;
    await cswCase.populate(
      "babyId",
      "firstName lastName jmbg gender birthDateTime placeOfBirth residentialAddress mother father",
    );
    res.status(200).json(cswCase);
  }),
);

// START A CSW CASE
router.post(
  "/:caseId/start",
  asyncHandler(async (req, res) => {
    const cswCase = await findMyCase(req, res);
    if (!cswCase) return;

    if (cswCase.status !== CSW_CASE_STATUS.RECEIVED) {
      return res.status(409).json({ err: "Only a received case can be started." });
    }

    workflow.transition(
      cswCase,
      CSW_CASE_STATUS.IN_PROGRESS,
      req.user,
      "Started CSW processing",
    );
    cswCase.processedByUserId = req.user._id;
    await cswCase.save();

    await audit.log({
      actor: req.user,
      action: "csw_case.start",
      targetCollection: "cswCases",
      targetDocumentId: cswCase._id,
      changes: { after: cswCase },
    });

    // TODO: when "csw_case.started" is added to templates.js,
    // call notifyParents here (same as in complete).

    res.status(200).json(cswCase);
  }),
);

// COMPLETE A CSW CASE AND ISSUE THE SOCIAL CARD NUMBER
router.post(
  "/:caseId/complete",
  asyncHandler(async (req, res) => {
    const cswCase = await findMyCase(req, res);
    if (!cswCase) return;

    if (cswCase.status !== CSW_CASE_STATUS.IN_PROGRESS) {
      return res
        .status(409)
        .json({ err: "Only a case in progress can be completed." });
    }

    workflow.transition(
      cswCase,
      CSW_CASE_STATUS.COMPLETED,
      req.user,
      "Completed and issued social card",
    );
    cswCase.socialCardNumber = workflow.generateNumber("SOC"); // set by the server
    cswCase.completedAt = new Date();
    cswCase.processedByUserId = req.user._id;
    await cswCase.save();

    await audit.log({
      actor: req.user,
      action: "csw_case.complete",
      targetCollection: "cswCases",
      targetDocumentId: cswCase._id,
      changes: { after: cswCase },
    });

    const baby = await Baby.findById(cswCase.babyId);
    await notifyParents(baby, { type: "csw_case.completed" });

    res.status(200).json(cswCase);
  }),
);

// REJECT A CSW CASE (a note is required)
router.post(
  "/:caseId/reject",
  validate(notesSchema),
  asyncHandler(async (req, res) => {
    const cswCase = await findMyCase(req, res);
    if (!cswCase) return;

    if (cswCase.status !== CSW_CASE_STATUS.IN_PROGRESS) {
      return res
        .status(409)
        .json({ err: "Only a case in progress can be rejected." });
    }

    workflow.transition(
      cswCase,
      CSW_CASE_STATUS.REJECTED,
      req.user,
      "Rejected CSW case",
    );
    cswCase.notes = req.body.notes; // already checked and cleaned by Zod
    cswCase.processedByUserId = req.user._id;
    await cswCase.save();

    await audit.log({
      actor: req.user,
      action: "csw_case.reject",
      targetCollection: "cswCases",
      targetDocumentId: cswCase._id,
      changes: { after: cswCase },
    });

    const baby = await Baby.findById(cswCase.babyId);
    await notifyParents(baby, { type: "csw_case.rejected" });

    res.status(200).json(cswCase);
  }),
);

module.exports = router;
