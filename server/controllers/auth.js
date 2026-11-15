const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const { createToken } = require("../services/tokens");
const { signUpSchema, signInSchema } = require("../validators/auth");
const { ROLES } = require("../constants");

const router = express.Router();
const SALT_ROUNDS = 12;

// Generous limit: the whole class may share one IP address.
const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { err: "Too many sign-in attempts. Please wait a few minutes." },
});

// CREATE AN ACCOUNT (always a parent; staff accounts are created by the admin)
router.post(
  "/sign-up",
  validate(signUpSchema),
  asyncHandler(async (req, res) => {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) {
      return res
        .status(409)
        .json({ err: "An account with this email already exists." });
    }

    const user = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      hashedPassword: await bcrypt.hash(req.body.password, SALT_ROUNDS),
      role: ROLES.PARENT, // never taken from the request
    });

    res.status(201).json({ token: createToken(user), user });
  }),
);

// SIGN IN
router.post(
  "/sign-in",
  signInLimiter,
  validate(signInSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    // Same message for every failure, so nobody can guess which emails exist
    const isPasswordCorrect =
      user?.hashedPassword &&
      (await bcrypt.compare(req.body.password, user.hashedPassword));
    if (!user || !user.isActive || !isPasswordCorrect) {
      return res.status(401).json({ err: "Invalid email or password." });
    }

    res.status(200).json({ token: createToken(user), user });
  }),
);

module.exports = router;
