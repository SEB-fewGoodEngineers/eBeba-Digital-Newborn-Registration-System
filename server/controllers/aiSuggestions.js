const express = require("express");
const AiSuggestion = require("../models/AiSuggestion");
const Registration = require("../models/Registration");
const Baby = require("../models/Baby");
const { verifyToken, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const ai = require("../services/ai");
const { ROLES, AI_SUGGESTION_KINDS, AI_FLAG_SOURCES } = require("../constants");
const { updateFlagSchema } = require("../validators/ai");

const router = express.Router();

// 1. POKRETANJE PRE-CHECK-a (MUP službenik)
router.post(
  "/registrations/:registrationId/precheck",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  asyncHandler(async (req, res) => {
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) {
      return res.status(404).json({ err: "Registration not found." });
    }

    const baby = await Baby.findOne({ _id: registration.babyId });
    if (!baby) {
      return res.status(404).json({ err: "Baby birth record not found." });
    }

    const flags = [];

    // Pravilo 1: Provera polja
    if (!registration.proposedFirstName || !registration.proposedLastName) {
      flags.push({
        field: "proposedName",
        message: "Proposed first or last name is missing.",
        source: AI_FLAG_SOURCES.RULE,
      });
    }

    // Pravilo 2: Prezime se poklapa sa bar jednim roditeljem
    const motherLastName = baby.mother?.lastName?.toLowerCase();
    const fatherLastName = baby.father?.lastName?.toLowerCase();
    const proposedLastName = registration.proposedLastName?.toLowerCase();

    if (
      proposedLastName &&
      motherLastName &&
      fatherLastName &&
      proposedLastName !== motherLastName &&
      proposedLastName !== fatherLastName
    ) {
      flags.push({
        field: "proposedLastName",
        message:
          "The proposed last name does not match either parent's last name.",
        source: AI_FLAG_SOURCES.RULE,
      });
    }

    // Poziv AI servisa za bliže analize (bliske greške, npr. č/ć)
    const aiResult = await ai.suggest(
      AI_SUGGESTION_KINDS.REGISTRATION_PRECHECK,
      {
        proposedLastName: registration.proposedLastName,
        motherLastName: baby.mother?.lastName,
        fatherLastName: baby.father?.lastName,
      },
    );

    if (aiResult.available && aiResult.flags) {
      aiResult.flags.forEach((f) => {
        flags.push({
          field: f.field,
          message: f.message,
          source: AI_FLAG_SOURCES.AI,
        });
      });
    }

    // Čuvanje u bazi
    const suggestion = await AiSuggestion.create({
      kind: AI_SUGGESTION_KINDS.REGISTRATION_PRECHECK,
      registrationId: registration._id,
      provider: aiResult.provider || "mock",
      model: aiResult.model,
      flags,
      aiAvailable: aiResult.available,
      requestedByUserId: req.user._id,
    });

    res.status(201).json(suggestion);
  }),
);

// 2. AŽURIRANJE ODLUKE O ZASTAVICI (FLAG-u)
router.patch(
  "/ai-suggestions/:suggestionId/flags/:flagId",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  validate(updateFlagSchema),
  asyncHandler(async (req, res) => {
    const { suggestionId, flagId } = req.params;
    const suggestion = await AiSuggestion.findById(suggestionId);

    if (!suggestion) {
      return res.status(404).json({ err: "AI suggestion record not found." });
    }

    const flag = suggestion.flags.id(flagId);
    if (!flag) {
      return res.status(404).json({ err: "Flag not found." });
    }

    flag.decision = req.body.decision;
    flag.decidedByUserId = req.user._id;
    flag.decidedAt = new Date();

    await suggestion.save();

    await audit.log({
      actor: req.user,
      action: "ai_suggestion.flag.update",
      targetCollection: "aiSuggestions",
      targetDocumentId: suggestion._id,
    });

    res.status(200).json(suggestion);
  }),
);

module.exports = router;
