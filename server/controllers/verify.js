const express = require("express");
const Certificate = require("../models/Certificate");
const asyncHandler = require("../middleware/asyncHandler");
const {
  buildVerificationAnswer,
} = require("../services/documents/verification");

const router = express.Router();

// PUBLIC: no login. Anyone who scans the QR code can use it.
router.get(
  "/:code",
  asyncHandler(async (req, res) => {
    // Only issuedAt is loaded. No names and no numbers leave the database.
    const certificate = await Certificate.findOne({
      verificationCode: req.params.code,
    }).select("issuedAt");

    res.status(200).json(buildVerificationAnswer(certificate));
  }),
);

module.exports = router;