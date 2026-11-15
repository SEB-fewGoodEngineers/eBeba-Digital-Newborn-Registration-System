const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Baby = require("../models/Baby");
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

// ---------- Baby access: STUB ----------
// Owner: Auth service (Epic 1), task A1.
// Now: only parents linked to the baby get access. Every other role gets 403.
// TODO A1: add the rules for pediatrician, hospital_staff, moi_staff, csw_staff,
//          health_insurance_staff (see Epic 1, task A1), with tests.

// A plain function (no database), so it is easy to test
const canAccessBaby = (user, baby) => {
  if (user.role === ROLES.PARENT) {
    return baby.authorizedUserIds.some((id) => id.equals(user._id));
  }
  return false;
};

// Use after verifyToken on every route with :babyId. Puts the baby on req.baby.
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
    if (!canAccessBaby(req.user, baby)) {
      return res
        .status(403)
        .json({ err: "You do not have access to this baby." });
    }
    req.baby = baby;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyToken, requireRole, canAccessBaby, requireBabyAccess };
