const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Baby = require("../models/Baby");
const CswCase = require("../models/CswCase");
const InsuranceRecord = require("../models/InsuranceRecord");
const { ROLES } = require("../constants");

// Checks the token and loads the user from the database.
// After this, req.user is a Mongoose document (role, institutionId, isActive...).
const verifyToken = async (req, res, next) => {
  try {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ err: "Please sign in." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.payload._id);

    // A deleted or deactivated user loses access at once, even with a valid token
    if (!user || !user.isActive) {
      return res.status(401).json({ err: "Please sign in." });
    }

    req.user = user;
    next();
  } catch (err) {
    // Expired, changed or fake token
    if (err instanceof jwt.JsonWebTokenError) {
      return res
        .status(401)
        .json({ err: "Your session has ended. Please sign in again." });
    }
    next(err);
  }
};

// Use after verifyToken: requireRole(ROLES.MOI_STAFF) or requireRole(ROLES.PARENT, ROLES.PEDIATRICIAN)
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ err: "You do not have permission to do this." });
    }
    next();
  };

// Compare MongoDB ObjectIds safely.
const idsMatch = (firstId, secondId) => {
  if (!firstId || !secondId) {
    return false;
  }

  if (typeof firstId.equals === "function") {
    return firstId.equals(secondId);
  }

  return String(firstId) === String(secondId);
};

// Check whether a user can access a baby.
// This is a plain function. It does not query the database.
const canAccessBaby = (user, baby, records = {}) => {
  if (!user || !baby) {
    return false;
  }

  switch (user.role) {
    case ROLES.PARENT:
      return (
        Array.isArray(baby.authorizedUserIds) &&
        baby.authorizedUserIds.some((id) => idsMatch(id, user._id))
      );

    case ROLES.PEDIATRICIAN:
      return idsMatch(baby.assignedPediatricianId, user._id);

    case ROLES.HOSPITAL_STAFF:
      return idsMatch(baby.hospitalId, user.institutionId);

    case ROLES.MOI_STAFF:
      return true;

    case ROLES.CSW_STAFF:
      return idsMatch(records.cswCase?.cswInstitutionId, user.institutionId);

    case ROLES.HEALTH_INSURANCE_STAFF:
      return idsMatch(
        records.insuranceRecord?.fundBranchId,
        user.institutionId,
      );

    case ROLES.ADMIN:
      return false;

    default:
      return false;
  }
};

// Use after verifyToken on every route with :babyId.
// Loads the baby and any records needed for access control.
// Puts the baby on req.baby when access is allowed.
const requireBabyAccess = async (req, res, next) => {
  try {
    const { babyId } = req.params;

    if (!mongoose.isValidObjectId(babyId)) {
      return res.status(404).json({ err: "Baby not found." });
    }

    const baby = await Baby.findById(babyId);

    if (!baby) {
      return res.status(404).json({ err: "Baby not found." });
    }

    const records = {};

    // CSW staff need the baby's social work case.
    if (req.user?.role === ROLES.CSW_STAFF) {
      records.cswCase = await CswCase.findOne({
        babyId: baby._id,
      });
    }

    // Health insurance staff need the baby's insurance record.
    if (req.user?.role === ROLES.HEALTH_INSURANCE_STAFF) {
      records.insuranceRecord = await InsuranceRecord.findOne({
        babyId: baby._id,
      });
    }

    if (!canAccessBaby(req.user, baby, records)) {
      return res.status(403).json({
        err: "You do not have access to this baby.",
      });
    }

    req.baby = baby;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyToken,
  requireRole,
  canAccessBaby,
  requireBabyAccess,
};
