
const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const User = require("../models/User");
const Institution = require("../models/Institution");
const AuditLog = require("../models/AuditLog");

const { ROLES } = require("../constants");
const { verifyToken, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const {
  disconnectNotificationUser,
} = require("../services/notifications");

const {
  createStaffSchema,
  updateStaffStatusSchema,
  isStaffInstitutionMatch,
  auditLogQuerySchema,
} = require("../validators/admin");

const router = express.Router();
const SALT_ROUNDS = 12;

// Only administrators can use these routes.
router.use(verifyToken, requireRole(ROLES.ADMIN));

// GET ALL USERS
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await User.find()
      .select("-hashedPassword")
      .populate("institutionId", "name type")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  }),
);

// GET INSTITUTIONS
router.get(
  "/institutions",
  asyncHandler(async (req, res) => {
    const institutions = await Institution.find({
      isActive: true,
    }).sort({ name: 1 });

    res.status(200).json(institutions);
  }),
);

// CREATE STAFF USER
router.post(
  "/users",
  validate(createStaffSchema),
  asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      institutionId,
    } = req.body;

    const institution = await Institution.findById(institutionId);

    if (!isStaffInstitutionMatch(role, institution)) {
      return res.status(400).json({
        err: "The institution does not match the selected role.",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        err: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      hashedPassword: await bcrypt.hash(password, SALT_ROUNDS),
      role,
      institutionId,
      isActive: true,
    });

    await audit.log({
      actor: req.user,
      action: "user.create",
      targetCollection: "users",
      targetDocumentId: user._id,
      changes: {
        after: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          institutionId: user.institutionId,
          isActive: user.isActive,
        },
      },
    });

    res.status(201).json(user);
  }),
);

// ACTIVATE OR DEACTIVATE A USER
router.patch(
  "/users/:userId",
  validate(updateStaffStatusSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json({ err: "User not found." });
    }

    if (String(req.user._id) === String(userId)) {
      return res.status(403).json({
        err: "You cannot change your own account status.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ err: "User not found." });
    }

    const previousStatus = user.isActive;

    if (previousStatus === req.body.isActive) {
      return res.status(200).json(user);
    }

    user.isActive = req.body.isActive;
    await user.save();

    // Disconnect active sockets when the account is deactivated.
    if (!user.isActive) {
      disconnectNotificationUser(user._id);
    }

    await audit.log({
      actor: req.user,
      action: user.isActive ? "user.activate" : "user.deactivate",
      targetCollection: "users",
      targetDocumentId: user._id,
      changes: {
        before: { isActive: previousStatus },
        after: { isActive: user.isActive },
      },
    });

    res.status(200).json(user);
  }),
);

// A4 - ADMIN: READ AUDIT LOGS
router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const result = auditLogQuerySchema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        err: "Invalid audit log filter.",
        details: result.error.issues,
      });
    }

    const filter = {};

    if (result.data.action) {
      filter.action = result.data.action;
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("actorUserId", "firstName lastName email")
      .select("actorUserId actorRole action targetCollection createdAt")
      .lean();

    res.status(200).json(logs);
  }),
);

module.exports = router;
