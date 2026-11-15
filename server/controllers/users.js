const express = require("express");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// GET MY PROFILE
// The template's open "list all users" route was removed: it showed every user
// to anyone. User management for the admin is built by the Auth service owner.
router.get("/me", verifyToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
