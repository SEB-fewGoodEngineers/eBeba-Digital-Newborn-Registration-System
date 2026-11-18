const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

const { verifyToken } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");

const router = express.Router();

// The fields the bell and the Demo inbox need. Never the recipient id.
const NOTIFICATION_FIELDS =
  "type title message link babyId channels readAt createdAt";

// Enough for the bell and the Demo inbox; keeps the response small.
const MAX_NOTIFICATIONS = 100;

const NOT_FOUND = { err: "Notification not found." };

// Any signed-in user, but only for their own notifications.
router.use(verifyToken);

// LIST MY NOTIFICATIONS (newest first)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
      recipientUserId: req.user._id,
    })
      .select(NOTIFICATION_FIELDS)
      .sort({ createdAt: -1 })
      .limit(MAX_NOTIFICATIONS)
      .lean();

    res.status(200).json(notifications);
  }),
);

// MARK ONE OF MY NOTIFICATIONS AS READ
router.patch(
  "/:notificationId/read",
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    // Same answer for a bad id, a missing notification and another
    // user's notification, so nothing is revealed about other users.
    if (!mongoose.isValidObjectId(notificationId)) {
      return res.status(404).json(NOT_FOUND);
    }

    const owner = { _id: notificationId, recipientUserId: req.user._id };

    // Set readAt only the first time; a repeated click keeps the first time.
    const updated = await Notification.findOneAndUpdate(
      { ...owner, readAt: null }, // matches a missing or empty readAt
      { $set: { readAt: new Date() } },
      { new: true },
    )
      .select(NOTIFICATION_FIELDS)
      .lean();

    if (updated) {
      await audit.log({
        actor: req.user,
        action: "notification.read",
        targetCollection: "notifications",
        targetDocumentId: updated._id,
        changes: {
          before: { readAt: null },
          after: { readAt: updated.readAt },
        },
      });

      return res.status(200).json(updated);
    }

    // Already read, missing, or not mine.
    const existing = await Notification.findOne(owner)
      .select(NOTIFICATION_FIELDS)
      .lean();

    if (!existing) {
      return res.status(404).json(NOT_FOUND);
    }

    res.status(200).json(existing);
  }),
);

module.exports = router;
