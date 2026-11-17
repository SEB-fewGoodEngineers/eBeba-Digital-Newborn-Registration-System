const express = require("express");
const mongoose = require("mongoose");
const DiaryEntry = require("../models/DiaryEntry");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { ROLES } = require("../constants");
const {
  createDiaryEntrySchema,
  diaryQuerySchema,
} = require("../validators/diaryEntries");

const router = express.Router({ mergeParams: true });

// Security: every route here requires a logged-in parent linked to this baby
router.use(verifyToken, requireRole(ROLES.PARENT), requireBabyAccess);

// LIST DIARY ENTRIES IN A DATE RANGE (NEWEST FIRST)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = diaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        err: "Please provide valid 'from' and 'to' dates.",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const entries = await DiaryEntry.find({
      babyId: req.params.babyId,
      recordedAt: {
        $gte: new Date(parsed.data.from),
        $lt: new Date(parsed.data.to),
      },
    }).sort({ recordedAt: -1, createdAt: -1 });

    res.status(200).json(entries);
  }),
);

// CREATE A DIARY ENTRY
router.post(
  "/",
  validate(createDiaryEntrySchema),
  asyncHandler(async (req, res) => {
    const entry = await DiaryEntry.create({
      ...req.body,
      // Security: set owner fields on the server so the user cannot fake them
      babyId: req.params.babyId,
      loggedByUserId: req.user._id,
    });

    await audit.log({
      actor: req.user,
      action: "diary_entry.create",
      targetCollection: "diaryEntries",
      targetDocumentId: entry._id,
      changes: { after: entry },
    });

    res.status(201).json(entry);
  }),
);

// DELETE A DIARY ENTRY
router.delete(
  "/:entryId",
  asyncHandler(async (req, res) => {
    const { babyId, entryId } = req.params;

    if (!mongoose.isValidObjectId(entryId)) {
      return res.status(404).json({ err: "Diary entry not found." });
    }

    const entry = await DiaryEntry.findOne({ _id: entryId, babyId });
    if (!entry) {
      return res.status(404).json({ err: "Diary entry not found." });
    }

    // Security: Server refuses to delete an entry someone else made (403)
    if (!entry.loggedByUserId.equals(req.user._id)) {
      return res
        .status(403)
        .json({ err: "You do not have permission to delete this entry." });
    }

    await entry.deleteOne();

    await audit.log({
      actor: req.user,
      action: "diary_entry.delete",
      targetCollection: "diaryEntries",
      targetDocumentId: entry._id,
      changes: { before: entry },
    });

    res.status(204).send();
  }),
);

module.exports = router;