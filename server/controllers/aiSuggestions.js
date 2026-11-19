const express = require("express");
const mongoose = require("mongoose");
const AiSuggestion = require("../models/AiSuggestion");
const Registration = require("../models/Registration");
const Baby = require("../models/Baby");
const User = require("../models/User");
const { verifyToken, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const ai = require("../services/ai");
const { runRuleChecks } = require("../services/ai/rules");
const {
  ROLES,
  AI_SUGGESTION_KINDS,
  AI_FLAG_SOURCES,
  REGISTRATION_STATUS,
} = require("../constants");
const { updateFlagSchema } = require("../validators/ai");

const router = express.Router();

// RUN THE PRE-CHECK OF A REGISTRATION (MoI staff)
router.post(
  "/registrations/:registrationId/precheck",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  asyncHandler(async (req, res) => {
    const { registrationId } = req.params;
    const registration = mongoose.isValidObjectId(registrationId)
      ? await Registration.findById(registrationId)
      : null;
    if (!registration) {
      return res.status(404).json({ err: "Registration not found." });
    }

    if (registration.status !== REGISTRATION_STATUS.PENDING) {
      return res
        .status(409)
        .json({ err: "Only a pending registration can be checked." });
    }

    const baby = await Baby.findById(registration.babyId);
    if (!baby) {
      return res.status(404).json({ err: "Baby birth record not found." });
    }

    const applicant = await User.findById(registration.submittedByUserId).select(
      "firstName lastName",
    );

    // 1. The rule checks come first (no AI)
    const flags = runRuleChecks({ registration, baby, applicant });

    // 2. The AI explains near-misses. It gets ONLY these three last names.
    const aiResult = await ai.suggest(
      AI_SUGGESTION_KINDS.REGISTRATION_PRECHECK,
      {
        proposedLastName: registration.proposedLastName,
        motherLastName: baby.mother?.lastName,
        fatherLastName: baby.father?.lastName,
      },
    );

    if (aiResult.available) {
      aiResult.flags.forEach((flag) => {
        flags.push({
          field: flag.field,
          message: flag.message,
          source: AI_FLAG_SOURCES.AI,
        });
      });
    }

    // 3. Save one document. Every flag starts as "pending" (the model default).
    const suggestion = await AiSuggestion.create({
      kind: AI_SUGGESTION_KINDS.REGISTRATION_PRECHECK,
      registrationId: registration._id,
      provider: aiResult.provider,
      model: aiResult.model,
      flags,
      aiAvailable: aiResult.available,
      requestedByUserId: req.user._id, // set by the server
    });

    await audit.log({
      actor: req.user,
      action: "ai_suggestion.create",
      targetCollection: "aiSuggestions",
      targetDocumentId: suggestion._id,
    });

    res.status(201).json(suggestion);
  }),
);

// SAVE THE OFFICER'S DECISION ON ONE FLAG (accepted or dismissed)
router.patch(
  "/ai-suggestions/:suggestionId/flags/:flagId",
  verifyToken,
  requireRole(ROLES.MOI_STAFF),
  validate(updateFlagSchema),
  asyncHandler(async (req, res) => {
    const { suggestionId, flagId } = req.params;

    const suggestion = mongoose.isValidObjectId(suggestionId)
      ? await AiSuggestion.findById(suggestionId)
      : null;
    if (!suggestion) {
      return res.status(404).json({ err: "AI suggestion record not found." });
    }

    const flag = mongoose.isValidObjectId(flagId)
      ? suggestion.flags.id(flagId)
      : null;
    if (!flag) {
      return res.status(404).json({ err: "Flag not found." });
    }

    const previousDecision = flag.decision;
    flag.decision = req.body.decision; // already checked by Zod
    flag.decidedByUserId = req.user._id; // who: set by the server
    flag.decidedAt = new Date(); // when: set by the server
    await suggestion.save();

    await audit.log({
      actor: req.user,
      action: "ai_suggestion.flag.update",
      targetCollection: "aiSuggestions",
      targetDocumentId: suggestion._id,
      changes: {
        before: { flagId, decision: previousDecision },
        after: { flagId, decision: flag.decision },
      },
    });

    res.status(200).json(suggestion);
  }),
);

module.exports = router;