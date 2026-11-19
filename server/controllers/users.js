const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const { ROLES } = require('../constants');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

// GET MY PROFILE
// The template's open "list all users" route was removed: it showed every user
// to anyone. User management for the admin is built by the Auth service owner.
router.get("/me", verifyToken, (req, res) => {
  res.json(req.user);
});

// POST /users/me/signing-key  — body: { publicJwk }
// Allowed for MOI_STAFF only. Other roles do not need a signing key.
router.post(
  "/me/signing-key",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  asyncHandler(async (req, res) => {
    const { publicJwk } = req.body || {};
    if (
      !publicJwk ||
      publicJwk.kty !== "RSA" ||
      publicJwk.alg !== "RSA-OAEP-256" && publicJwk.alg !== undefined ||
      !publicJwk.n ||
      !publicJwk.e
    ) {
      return res.status(400).json({ err: "Invalid public key." });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          signingPublicKey: publicJwk,
          signingPublicKeyRegisteredAt: new Date(),
        },
      },
      { new: true },
    );
    await audit.log({
      actor: req.user,
      action: "user.signing_key.registered",
      targetCollection: "users",
      targetDocumentId: req.user._id,
    });
    res.status(200).json({ registeredAt: user.signingPublicKeyRegisteredAt });
  }),
);

module.exports = router;
