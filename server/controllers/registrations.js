const express = require("express");
const mongoose = require("mongoose");

const Registration = require("../models/Registration");
const Baby = require("../models/Baby");
const { verifyToken, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");

const {
  approveRegistration: approveRegistrationService,
  returnRegistration: returnRegistrationService,
  rejectRegistration: rejectRegistrationService,
  unreturnRegistration: unreturnRegistrationService,
} = require("../services/workflow");
const {
  createRegistrationSchema,
  updateRegistrationSchema,
  listRegistrationsQuerySchema,
  reviewDecisionSchema,
} = require("../validators/registrations");

const { ROLES, REGISTRATION_STATUS } = require("../constants");

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
      statusHistory: (registration.statusHistory || []).map((h) => ({
        from: h.from,
        to: h.to,
        at: h.at,
        note: h.note,
        byUser: h.byUserId
          ? {
              firstName: h.byUserId.firstName,
              lastName: h.byUserId.lastName,
              role: h.byUserId.role,
            }
          : null,
      })),
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

// LIST APPLICATIONS (MoI queue). Oldest first. moi_staff only.
router.get(
  "/",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  asyncHandler(async (req, res) => {
    // 1. Validate the query string. Anything that is not a known status → 400.
    const parsed = listRegistrationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ err: "Bad status filter." });
    }
    const { status } = parsed.data; // "pending" by default

    // 2. Query. Explicit projection + narrow populate = no PII in the list.
    const registrations = await Registration.find({ status })
      .sort({ createdAt: 1 }) // oldest first
      .select("proposedFirstName proposedLastName status createdAt babyId")
      .populate({
        path: "babyId",
        select: "birthDateTime hospitalId gender",
        populate: {
          path: "hospitalId",
          select: "name municipality",
        },
      })
      .lean();

    // 3. Response: small, fixed shape. No JMBG, no mother/father, no address.
    res.status(200).json(
      registrations.map((r) => ({
        _id: r._id,
        proposedFirstName: r.proposedFirstName,
        proposedLastName: r.proposedLastName,
        status: r.status,
        createdAt: r.createdAt,
        birthDateTime: r.babyId?.birthDateTime,
        gender: r.babyId?.gender,
        hospital: r.babyId?.hospitalId
          ? {
              name: r.babyId.hospitalId.name,
              municipality: r.babyId.hospitalId.municipality,
            }
          : null,
      })),
    );
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

// The parent's application for one baby (used by ApplyPage).
router.get(
  "/by-baby/:babyId",
  verifyToken,
  requireRole(ROLES.PARENT),
  asyncHandler(async (req, res) => {
    const { babyId } = req.params;
    if (!mongoose.isValidObjectId(babyId)) {
      return res.status(404).json({ err: "Baby not found." });
    }
    const baby = await Baby.findById(babyId);
    if (!baby || !isLinkedParent(req.user, baby)) {
      return res
        .status(403)
        .json({ err: "You can only view applications for a linked baby." });
    }
    const registration = await Registration.findOne({ babyId });
    if (!registration) return res.status(204).end();
    res.status(200).json({
      _id: registration._id,
      babyId: registration.babyId,
      proposedFirstName: registration.proposedFirstName,
      proposedLastName: registration.proposedLastName,
      residentialAddress: registration.residentialAddress,
      municipality: registration.municipality,
      status: registration.status,
      reviewerNotes: registration.reviewerNotes,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    });
  }),
);

// REVIEW ONE APPLICATION WITH ITS BIRTH RECORD (moi_staff only).
// One query, one audit line. No JMBG digits leave the server.
router.get(
  "/:registrationId/review",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  asyncHandler(async (req, res) => {
    const { registrationId } = req.params;
    if (!mongoose.isValidObjectId(registrationId)) {
      return res.status(404).json({ err: "Application not found." });
    }

    const registration = await Registration.findById(registrationId)
      .select(
        "proposedFirstName proposedLastName residentialAddress municipality " +
          "status reviewerNotes statusHistory createdAt babyId submittedByUserId",
      )
      .populate({
        path: "babyId",
        select:
          "birthRecordNumber gender birthDateTime placeOfBirth municipalityOfBirth " +
          "birthWeightGrams birthLengthCm familyType mother father " +
          "hospitalId firstName lastName jmbg registeredAt",
        populate: { path: "hospitalId", select: "name municipality" },
      })
      .populate({
        path: "submittedByUserId",
        select: "firstName lastName email role",
      })
      .lean();

    if (!registration || !registration.babyId) {
      return res.status(404).json({ err: "Application not found." });
    }

    // Audit the read. Who saw which baby — no PII in the audit.
    await audit.log({
      actor: req.user,
      action: "registration.review",
      targetCollection: "registrations",
      targetDocumentId: registration._id,
      changes: { after: { babyId: registration.babyId._id } },
    });

    // Redact JMBGs before sending. The officer does not need the digits to
    // decide; the "is there a JMBG on file" boolean is enough.
    const redactParent = (p) =>
      p
        ? {
            firstName: p.firstName,
            lastName: p.lastName,
            maidenName: p.maidenName,
            dateOfBirth: p.dateOfBirth,
            hasJmbg: Boolean(p.jmbg),
            citizenship: p.citizenship,
            address: p.address,
            email: p.email,
          }
        : null;

    res.status(200).json({
      registration: {
        _id: registration._id,
        proposedFirstName: registration.proposedFirstName,
        proposedLastName: registration.proposedLastName,
        residentialAddress: registration.residentialAddress,
        municipality: registration.municipality,
        status: registration.status,
        reviewerNotes: registration.reviewerNotes,
        statusHistory: registration.statusHistory,
        createdAt: registration.createdAt,
      },
      applicant: {
        firstName: registration.submittedByUserId?.firstName,
        lastName: registration.submittedByUserId?.lastName,
        email: registration.submittedByUserId?.email,
        role: registration.submittedByUserId?.role,
      },
      baby: {
        _id: registration.babyId._id,
        birthRecordNumber: registration.babyId.birthRecordNumber,
        gender: registration.babyId.gender,
        birthDateTime: registration.babyId.birthDateTime,
        placeOfBirth: registration.babyId.placeOfBirth,
        municipalityOfBirth: registration.babyId.municipalityOfBirth,
        birthWeightGrams: registration.babyId.birthWeightGrams,
        birthLengthCm: registration.babyId.birthLengthCm,
        familyType: registration.babyId.familyType,
        mother: redactParent(registration.babyId.mother),
        father: redactParent(registration.babyId.father),
        hospital: registration.babyId.hospitalId
          ? {
              name: registration.babyId.hospitalId.name,
              municipality: registration.babyId.hospitalId.municipality,
            }
          : null,
      },
    });
  }),
);

// APPROVE A REGISTRATION (moi_staff only).
// The controller does NOT touch collections. approveRegistration (W2) owns
// all writes and is idempotent. 409 if the transition is not allowed.
router.post(
  "/:registrationId/approve",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  asyncHandler(async (req, res) => {
    const { registrationId } = req.params;
    if (!mongoose.isValidObjectId(registrationId)) {
      return res.status(404).json({ err: "Application not found." });
    }

    // Load the full document (not lean) — transition() mutates it and saves.
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ err: "Application not found." });
    }

    // Short-circuit the common "already approved" case, with a clear message.
    // transition() would also refuse it, but a specific message here is friendlier.
    if (registration.status === REGISTRATION_STATUS.APPROVED) {
      return res
        .status(409)
        .json({ err: "This application has already been approved." });
    }

    try {
      // Approve. transition() inside throws 409 for any not-allowed change.
      await approveRegistrationService(registration, req.user);
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({ err: err.message });
      }
      throw err; // asyncHandler -> errorHandler -> 500
    }

    // Fetch the certificate that approveRegistration created (upserted).
    // This is the read side; the write side owns the fields.
    const certificate = await Certificate.findOne({
      babyId: registration.babyId,
    })
      .select("certificateNumber jmbg verificationCode issuedAt")
      .lean();

    res.status(200).json({
      registrationId: registration._id,
      certificateId: certificate?._id ?? null,
      status: registration.status, // "approved" after W2
      jmbg: certificate?.jmbg ?? null,
      certificateNumber: certificate?.certificateNumber ?? null,
      verificationCode: certificate?.verificationCode ?? null,
      issuedAt: certificate?.issuedAt ?? null,
    });
  }),
);

router.post(
  "/:registrationId/return",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  validate(reviewDecisionSchema),
  asyncHandler(async (req, res) => {
    const { registrationId } = req.params;
    if (!mongoose.isValidObjectId(registrationId)) {
      return res.status(404).json({ err: "Application not found." });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ err: "Application not found." });
    }

    try {
      await returnRegistrationService(
        registration,
        req.user,
        req.body.reviewerNotes,
      );
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({ err: err.message });
      }
      throw err;
    }

    res.status(200).json({
      registrationId: registration._id,
      status: registration.status,
      reviewerNotes: registration.reviewerNotes,
    });
  }),
);

router.post(
  "/:registrationId/reject",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  validate(reviewDecisionSchema),
  asyncHandler(async (req, res) => {
    const { registrationId } = req.params;
    if (!mongoose.isValidObjectId(registrationId)) {
      return res.status(404).json({ err: "Application not found." });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ err: "Application not found." });
    }

    try {
      await rejectRegistrationService(
        registration,
        req.user,
        req.body.reviewerNotes,
      );
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({ err: err.message });
      }
      throw err;
    }

    res.status(200).json({
      registrationId: registration._id,
      status: registration.status,
      reviewerNotes: registration.reviewerNotes,
    });
  }),
);

router.put(
  "/:registrationId",
  verifyToken,
  requireRole(ROLES.PARENT),
  validate(updateRegistrationSchema),
  asyncHandler(async (req, res) => {
    const { registrationId } = req.params;
    if (!mongoose.isValidObjectId(registrationId)) {
      return res.status(404).json({ err: "Application not found." });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ err: "Application not found." });
    }

    // Only the applicant may edit, and only when the status is "returned".
    if (!registration.submittedByUserId.equals(req.user._id)) {
      return res
        .status(403)
        .json({ err: "You do not have access to this application." });
    }
    if (registration.status !== REGISTRATION_STATUS.RETURNED) {
      return res.status(409).json({
        err: "You can only edit an application that has been returned.",
      });
    }

    // Body already validated; only the four content fields are in it.
    // Status, babyId and reviewer fields are not in updateRegistrationSchema.
    Object.assign(registration, req.body);
    await registration.save();

    await audit.log({
      actor: req.user,
      action: "registration.edit",
      targetCollection: "registrations",
      targetDocumentId: registration._id,
    });

    res.status(200).json({
      _id: registration._id,
      babyId: registration.babyId,
      proposedFirstName: registration.proposedFirstName,
      proposedLastName: registration.proposedLastName,
      residentialAddress: registration.residentialAddress,
      municipality: registration.municipality,
      status: registration.status,
      reviewerNotes: registration.reviewerNotes,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    });
  }),
);

router.post(
  "/:registrationId/resubmit",
  verifyToken,
  requireRole(ROLES.PARENT),
  asyncHandler(async (req, res) => {
    const { registrationId } = req.params;
    if (!mongoose.isValidObjectId(registrationId)) {
      return res.status(404).json({ err: "Application not found." });
    }

    const registration = await Registration.findById(registrationId)
      .populate({
        path: "statusHistory.byUserId",
        select: "firstName lastName role",
      })
      .lean();

    if (!registration) {
      return res.status(404).json({ err: "Application not found." });
    }

    try {
      await unreturnRegistrationService(registration, req.user);
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({ err: err.message });
      }
      throw err;
    }

    res.status(200).json({
      registrationId: registration._id,
      status: registration.status,
    });
  }),
);

module.exports = router;
