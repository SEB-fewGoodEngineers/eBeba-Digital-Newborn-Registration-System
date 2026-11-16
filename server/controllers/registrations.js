const express = require("express");
const mongoose = require("mongoose");

const Registration = require("../models/Registration");
const Baby = require("../models/Baby");
const { verifyToken, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { ROLES, REGISTRATION_STATUS } = require("../constants");
const {
  createRegistrationSchema,
  updateRegistrationSchema,
} = require("../validators/registrations");

const router = express.Router();

// A helper: is this user allowed to see / act on this baby?
// Same rule as requireBabyAccess, but it takes the baby doc we already loaded.
const isLinkedParent = (user, baby) =>
  user.role === ROLES.PARENT &&
  baby.authorizedUserIds.some((id) => id.equals(user._id));

// APPLY TO REGISTER A BABY (parent only)
router.post(
  "/",
  verifyToken,
  requireRole(ROLES.PARENT),
  validate(createRegistrationSchema),
  asyncHandler(async (req, res) => {
    const { babyId, ...fields } = req.body;

    // 1. The baby must exist. Do not leak whether it exists to a stranger:
    //    403 covers both "not found" and "not yours" from the parent's view.
    const baby = await Baby.findById(babyId);
    if (!baby || !isLinkedParent(req.user, baby)) {
      return res
        .status(403)
        .json({ err: "You can only register a baby linked to your account." });
    }

    // 2. One application per baby (the unique index is the real guard,
    //    this check gives a clean 409 instead of a Mongo error).
    const existing = await Registration.findOne({ babyId });
    if (existing) {
      return res
        .status(409)
        .json({ err: "An application for this baby already exists." });
    }

    // 3. Create. Server fields come AFTER the validated body, so they always win.
    const registration = await Registration.create({
      ...fields,
      babyId, // from the checked body, not trusted beyond ownership
      submittedByUserId: req.user._id, // never from the body
      status: REGISTRATION_STATUS.PENDING, // server-set
      statusHistory: [
        {
          from: "", // empty for the first entry (data model note)
          to: REGISTRATION_STATUS.PENDING,
          byUserId: req.user._id,
          at: new Date(),
        },
      ],
    });

    // 4. Audit trail – Hyppönen: log what happened, not just the error.
    await audit.log({
      actor: req.user,
      action: "registration.create",
      targetCollection: "registrations",
      targetDocumentId: registration._id,
    });

    // 5. Response: only application fields. No baby internals, no mother/father data.
    res.status(201).json({
      _id: registration._id,
      babyId: registration.babyId,
      proposedFirstName: registration.proposedFirstName,
      proposedLastName: registration.proposedLastName,
      residentialAddress: registration.residentialAddress,
      municipality: registration.municipality,
      status: registration.status,
      statusHistory: registration.statusHistory,
      createdAt: registration.createdAt,
    });
  }),
);

// READ ONE APPLICATION
// Allowed: the parent linked to the baby, or any MoI staff member.
router.get(
  "/:registrationId",
  verifyToken,
  asyncHandler(async (req, res) => {
    const { registrationId } = req.params;
    if (!mongoose.isValidObjectId(registrationId)) {
      return res.status(404).json({ err: "Application not found." });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ err: "Application not found." });
    }

    const isMoiStaff = req.user.role === ROLES.MOI_STAFF;

    if (!isMoiStaff) {
      // Not MoI staff: must be the parent linked to the baby.
      // Load the baby to check the link. We do NOT return the baby to the client.
      const baby = await Baby.findById(registration.babyId);
      if (!baby || !isLinkedParent(req.user, baby)) {
        return res
          .status(403)
          .json({ err: "You do not have access to this application." });
      }
    }

    res.status(200).json({
      _id: registration._id,
      babyId: registration.babyId,
      proposedFirstName: registration.proposedFirstName,
      proposedLastName: registration.proposedLastName,
      residentialAddress: registration.residentialAddress,
      municipality: registration.municipality,
      status: registration.status,
      reviewerNotes: registration.reviewerNotes,
      statusHistory: registration.statusHistory,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    });
  }),
);

module.exports = router;