const express = require("express");
const CswCase = require("../models/CswCase");
const Baby = require("../models/Baby");
const Registration = require("../models/Registration");
const { verifyToken, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const validate = require("../middleware/validate");
const audit = require("../services/audit");
const workflow = require("../services/workflow");
const notifications = require("../services/notifications");
const { ROLES, CSW_CASE_STATUS } = require("../constants");
const { rejectCswCaseSchema } = require("../validators/cswCases");

// Zahteva prijavu i ulogu CSW službenika
router.use(verifyToken, requireRole(ROLES.CSW_STAFF));

// LIST CSW CASES FOR THE USER'S CENTER
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // CSW službenik vidi samo slučajeve koji pripadaju njegovoj instituciji
    const query = { cswInstitutionId: req.user.institutionId };

    const cases = await CswCase.find(query)
      .sort({ createdAt: -1 }) // najnoviji prvi
      .populate({
        path: "babyId",
        select:
          "firstName lastName jmbg gender birthDateTime municipalityOfBirth mother father",
      })
      .lean();

    res.status(200).json(cases);
  }),
);

// GET SINGLE CSW CASE DETAILS
router.get(
  "/:caseId",
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({
      _id: req.params.caseId,
      cswInstitutionId: req.user.institutionId,
    })
      .populate("babyId")
      .populate("registrationId")
      .lean();

    if (!cswCase) {
      return res.status(404).json({ err: "CSW case not found." });
    }

    res.status(200).json(cswCase);
  }),
);

//  DETALJI JEDNOG PREDMETA
router.get(
  "/:caseId",
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({
      _id: req.params.caseId,
      cswInstitutionId: req.user.institutionId,
    })
      .populate("babyId")
      .lean();

    if (!cswCase) {
      return res.status(404).json({ err: "CSW case not found." });
    }
    res.status(200).json(cswCase);
  }),
);

// 3. START PREDMETA (prelazi u status "in_progress")
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

    // Pozivamo funkciju transition iz workflow servisa
    workflow.transition(
      cswCase,
      CSW_CASE_STATUS.IN_PROGRESS,
      req.user,
      "Started processing",
    );
    cswCase.processedByUserId = req.user._id;
    await cswCase.save();

    // Upis u audit log
    await audit.log({
      actor: req.user,
      action: "csw_case.start",
      targetCollection: "cswCases",
      targetDocumentId: cswCase._id,
    });

    res.status(200).json(cswCase);
  }),
);

// 4. ZAVRŠETAK PREDMETA (generiše socijalnu kartu i prelazi u "completed")
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

    // Generišemo demo broj socijalne karte
    cswCase.socialCardNumber = workflow.generateNumber("SC");
    cswCase.completedAt = new Date();

    workflow.transition(
      cswCase,
      CSW_CASE_STATUS.COMPLETED,
      req.user,
      "Completed successfully",
    );
    await cswCase.save();

    await audit.log({
      actor: req.user,
      action: "csw_case.complete",
      targetCollection: "cswCases",
      targetDocumentId: cswCase._id,
    });

    // Obaveštavamo roditelje bebe da je predmet završen
    if (cswCase.babyId && cswCase.babyId.authorizedUserIds) {
      await notifications.notifyMany(cswCase.babyId.authorizedUserIds, {
        type: "csw_case.completed",
        title: "Social card issued",
        message:
          "Your CSW case has been completed and the social card number is issued.",
      });
    }

    res.status(200).json(cswCase);
  }),
);

// 5. ODBIJANJE PREDMETA (zahteva napoteku/notes, prelazi u "rejected")
router.post(
  "/:caseId/reject",
  validate(rejectCswCaseSchema),
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({
      _id: req.params.caseId,
      cswInstitutionId: req.user.institutionId,
    }).populate("babyId");

    if (!cswCase) {
      return res.status(404).json({ err: "CSW case not found." });
    }

    cswCase.notes = req.body.notes;
    workflow.transition(
      cswCase,
      CSW_CASE_STATUS.REJECTED,
      req.user,
      req.body.notes,
    );
    await cswCase.save();

    await audit.log({
      actor: req.user,
      action: "csw_case.reject",
      targetCollection: "cswCases",
      targetDocumentId: cswCase._id,
    });

    if (cswCase.babyId && cswCase.babyId.authorizedUserIds) {
      await notifications.notifyMany(cswCase.babyId.authorizedUserIds, {
        type: "csw_case.rejected",
        title: "CSW case rejected",
        message: "Your CSW case has been rejected. Check notes for details.",
      });
    }

    res.status(200).json(cswCase);
  }),
);

module.exports = router;
