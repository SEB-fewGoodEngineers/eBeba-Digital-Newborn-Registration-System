const express = require("express");
const CswCase = require("../models/CswCase");
const Baby = require("../models/Baby");
const {
  verifyToken,
  requireRole,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { notify } = require("../services/notifications");
const workflow = require("../services/workflow");
const { ROLES, CSW_CASE_STATUS } = require("../constants");
const { notesSchema } = require("../validators/cswCases");

const router = express.Router();

router.use(verifyToken, requireRole(ROLES.CSW_STAFF));

// GET CSW CASES FOR THE CENTER
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cases = await CswCase.find({
      cswInstitutionId: req.user.institutionId,
    })
      .sort({ createdAt: -1 })
      .populate("babyId");
    res.status(200).json(cases);
  }),
);

// GET A SINGLE CSW CASE WITH BABY AND PARENTS
router.get(
  "/:caseId",
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({
      _id: req.params.caseId,
      cswInstitutionId: req.user.institutionId,
    }).populate("babyId");

    if (!cswCase) {
      return res.status(404).json({ err: "CSW case not found." });
    }
    res.status(200).json(cswCase);
  }),
);

// START PROCESSING A CSW CASE
router.post(
  "/:caseId/start",
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({
      _id: req.params.caseId,
      cswInstitutionId: req.user.institutionId,
    });

    if (!cswCase) {
      return res.status(404).json({ err: "CSW case not found." });
    }

    workflow.transition(cswCase, CSW_CASE_STATUS.IN_PROGRESS, req.user, "Started processing");
    cswCase.processedByUserId = req.user._id;
    await cswCase.save();

    await audit.log({
      actor: req.user,
      action: "csw_case.start",
      targetCollection: "cswCases",
      targetDocumentId: cswCase._id,
      changes: { after: cswCase },
    });

    res.status(200).json(cswCase);
  }),
);

// COMPLETE A CSW CASE
router.post(
  "/:caseId/complete",
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({
      _id: req.params.caseId,
      cswInstitutionId: req.user.institutionId,
    }).populate("babyId");

    if (!cswCase) {
      return res.status(404).json({ err: "CSW case not found." });
    }

    workflow.transition(cswCase, CSW_CASE_STATUS.COMPLETED, req.user, "Completed");
    cswCase.socialCardNumber = workflow.generateNumber("SC");
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
    if (baby && baby.authorizedUserIds) {
      await notify(baby.authorizedUserIds, {
        type: "csw_case.completed",
        title: "Social card issued",
        message: "Your baby's social card has been successfully issued.",
        link: `/babies/${baby._id}`,
        babyId: baby._id,
      });
    }

    res.status(200).json(cswCase);
  }),
);

// REJECT A CSW CASE
router.post(
  "/:caseId/reject",
  validate(notesSchema),
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({
      _id: req.params.caseId,
      cswInstitutionId: req.user.institutionId,
    }).populate("babyId");

    if (!cswCase) {
      return res.status(404).json({ err: "CSW case not found." });
    }

    workflow.transition(cswCase, CSW_CASE_STATUS.REJECTED, req.user, req.body.notes);
    cswCase.notes = req.body.notes;
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
    if (baby && baby.authorizedUserIds) {
      await notify(baby.authorizedUserIds, {
        type: "csw_case.rejected",
        title: "CSW case rejected",
        message: "Your CSW case was rejected. Check the notes for details.",
        link: `/babies/${baby._id}`,
        babyId: baby._id,
      });
    }

    res.status(200).json(cswCase);
  }),
);

module.exports = router;