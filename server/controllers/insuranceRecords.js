const express = require("express");
const mongoose = require("mongoose");
const InsuranceRecord = require("../models/InsuranceRecord");
const Baby = require("../models/Baby");
const User = require("../models/User");
const { verifyToken, requireRole } = require("../middleware/auth");
// const { pdf } = require("../services/documents");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { notifyParents, notifyStaff } = require("../services/notifications");
const workflow = require("../services/workflow");
const { ROLES, INSURANCE_STATUS } = require("../constants");
const {
  issueInsuranceSchema,
  assignPediatricianSchema,
} = require("../validators/insuranceRecords");

const router = express.Router();

// The baby fields the FZO page needs. Nothing else is sent to the browser.
const BABY_FIELDS =
  "firstName lastName jmbg gender birthDateTime placeOfBirth residentialAddress mother.firstName mother.lastName father.firstName father.lastName";

// Finds a record of MY branch. If there is none, sends 404 and returns null.
const findMyRecord = async (req, res) => {
  const { recordId } = req.params;
  const record = mongoose.isValidObjectId(recordId)
    ? await InsuranceRecord.findOne({
        _id: recordId,
        fundBranchId: req.user.institutionId,
      })
    : null;

  if (!record) {
    res.status(404).json({ err: "Insurance record not found." });
    return null;
  }
  return record;
};

// // DOWNLOAD THE INSURANCE CARD PDF (must stay BEFORE router.use below)
// // TODO Story 3.6: this route still has errors (parentUserIds, healthInsuranceNumber=healthCardNumber)
// // and will be replaced.
// router.get(
//   "/babies/:babyId/insurance-card/pdf",
//   verifyToken,
//   asyncHandler(async (req, res) => {
//     const baby = await Baby.findById(req.params.babyId);
//     if (!baby) {
//       return res.status(404).json({ err: "Baby not found." });
//     }

//     const isFzoStaff = req.user.role === ROLES.HEALTH_INSURANCE_STAFF;
//     const isParent =
//       req.user.role === ROLES.PARENT &&
//       baby.parentUserIds.some((id) => id.toString() === req.user._id.toString());

//     if (!isFzoStaff && !isParent) {
//       return res.status(403).json({ err: "Access denied." });
//     }

//     const record = await InsuranceRecord.findOne({ babyId: baby._id });
//     if (!record || !record.healthCardNumber) {
//       return res
//         .status(404)
//         .json({ err: "Health insurance card has not been issued yet." });
//     }

//     let pediatrician = null;
//     if (baby.assignedPediatricianId) {
//       pediatrician = await User.findById(baby.assignedPediatricianId).select(
//         "firstName lastName",
//       );
//     }

//     await pdf.card(res, {
//       type: "insurance",
//       baby,
//       record,
//       pediatrician,
//     });
//   }),
// );

// ALL ROUTES BELOW ARE ONLY FOR FZO STAFF
router.use(verifyToken, requireRole(ROLES.HEALTH_INSURANCE_STAFF));

// LIST THE RECORDS OF MY BRANCH (newest first)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const records = await InsuranceRecord.find({
      fundBranchId: req.user.institutionId,
    })
      .sort({ createdAt: -1 })
      .populate("babyId", BABY_FIELDS);
    res.status(200).json(records);
  }),
);

// LIST THE ACTIVE PEDIATRICIANS (must stay ABOVE "/:recordId")
router.get(
  "/pediatricians",
  asyncHandler(async (req, res) => {
    const pediatricians = await User.find({
      role: ROLES.PEDIATRICIAN,
      isActive: true,
    })
      .select("firstName lastName institutionId")
      .populate("institutionId", "name municipality");

    res.status(200).json(pediatricians);
  }),
);

// OPEN ONE RECORD OF MY BRANCH (with the linked parents and the pediatrician)
router.get(
  "/:recordId",
  asyncHandler(async (req, res) => {
    const record = await findMyRecord(req, res);
    if (!record) return;

    const baby = await Baby.findById(record.babyId).select(
      `${BABY_FIELDS} authorizedUserIds assignedPediatricianId`,
    );
    if (!baby) {
      return res.status(404).json({ err: "Baby not found." });
    }

    // Only active parents who are linked to this baby can be the insured parent
    const linkedParents = await User.find({
      _id: { $in: baby.authorizedUserIds },
      role: ROLES.PARENT,
      isActive: true,
    }).select("firstName lastName");

    const assignedPediatrician = baby.assignedPediatricianId
      ? await User.findById(baby.assignedPediatricianId).select(
          "firstName lastName",
        )
      : null;

    const result = record.toObject();
    result.babyId = baby.toObject();
    delete result.babyId.authorizedUserIds; // the browser does not need these ids
    delete result.babyId.assignedPediatricianId;

    res.status(200).json({ ...result, linkedParents, assignedPediatrician });
  }),
);

// START AN INSURANCE RECORD
router.post(
  "/:recordId/start",
  asyncHandler(async (req, res) => {
    const record = await findMyRecord(req, res);
    if (!record) return;

    if (record.status !== INSURANCE_STATUS.RECEIVED) {
      return res
        .status(409)
        .json({ err: "Only a received record can be started." });
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

// ISSUE THE INSURANCE AND THE CARDS
router.post(
  "/:recordId/issue",
  validate(issueInsuranceSchema),
  asyncHandler(async (req, res) => {
    const record = await findMyRecord(req, res);
    if (!record) return;

    if (record.status !== INSURANCE_STATUS.IN_PROGRESS) {
      return res
        .status(409)
        .json({ err: "Only a record in progress can be issued." });
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
    record.policyNumber = workflow.generateNumber("POL"); // set by the server
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

    await notifyParents(baby, { type: "insurance.card_issued" });

    res.status(200).json(record);
  }),
);

// ASSIGN A PEDIATRICIAN TO THE BABY
router.post(
  "/:recordId/pediatrician",
  validate(assignPediatricianSchema),
  asyncHandler(async (req, res) => {
    const record = await findMyRecord(req, res);
    if (!record) return;

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
    baby.assignedPediatricianId = pediatrician._id; // the only place it is stored
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

    if (String(previousPediatricianId) !== String(pediatrician._id)) {
      await notifyStaff("staff.patient_assigned", pediatrician._id);
    }
    await notifyParents(baby, { type: "baby.pediatrician_assigned" });

    res.status(200).json({
      _id: baby._id,
      assignedPediatricianId: baby.assignedPediatricianId,
    });
  }),
);

module.exports = router;