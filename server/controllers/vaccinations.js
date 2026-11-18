const express = require("express");
const mongoose = require("mongoose");
const Vaccination = require("../models/Vaccination");
const {
  verifyToken,
  requireRole,
  requireBabyAccess,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const audit = require("../services/audit");
const { ROLES, ENTRY_SOURCES } = require("../constants");
const {
  createVaccinationSchema,
  markVaccinationGivenSchema,
} = require("../validators/vaccinations");

const router = express.Router({ mergeParams: true }); // gives access to :babyId

// The entry source always comes from the user's role, never from the request
const SOURCE_BY_ROLE = Object.freeze({
  [ROLES.PARENT]: ENTRY_SOURCES.PARENT,
  [ROLES.PEDIATRICIAN]: ENTRY_SOURCES.PEDIATRICIAN,
});

const NOT_FOUND = { err: "Vaccination not found." };

router.use(
  verifyToken,
  requireRole(ROLES.PARENT, ROLES.PEDIATRICIAN),
  requireBabyAccess,
);

// LIST A BABY'S VACCINATIONS (by scheduled date)
// "Overdue" is not stored; the client works it out when it shows the list.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const vaccinations = await Vaccination.find({ babyId: req.baby._id })
      .sort({ scheduledDate: 1, doseNumber: 1 })
      .lean();
    res.status(200).json(vaccinations);
  }),
);

// ADD A SCHEDULED VACCINATION
router.post(
  "/",
  validate(createVaccinationSchema),
  asyncHandler(async (req, res) => {
    const vaccination = await Vaccination.create({
      ...req.body, // already checked and cleaned by Zod
      babyId: req.baby._id, // server fields come LAST, so they always win
      entrySource: SOURCE_BY_ROLE[req.user.role],
      authorUserId: req.user._id,
      reminderSent: false,
    });
    await audit.log({
      actor: req.user,
      action: "vaccination.create",
      targetCollection: "vaccinations",
      targetDocumentId: vaccination._id,
      changes: { after: vaccination },
    });
    res.status(201).json(vaccination);
  }),
);

// MARK A VACCINATION AS GIVEN (only an entry that your own role entered)
router.patch(
  "/:vaccinationId",
  validate(markVaccinationGivenSchema),
  asyncHandler(async (req, res) => {
    const { vaccinationId } = req.params;
    if (!mongoose.isValidObjectId(vaccinationId)) {
      return res.status(404).json(NOT_FOUND);
    }

    // babyId in the filter: a vaccination of another baby is "not found"
    const vaccination = await Vaccination.findOne({
      _id: vaccinationId,
      babyId: req.baby._id,
    });
    if (!vaccination) {
      return res.status(404).json(NOT_FOUND);
    }

    if (vaccination.entrySource !== SOURCE_BY_ROLE[req.user.role]) {
      const who =
        vaccination.entrySource === ENTRY_SOURCES.PEDIATRICIAN
          ? "a pediatrician"
          : "a parent";
      return res.status(403).json({
        err: `This vaccination was entered by ${who}. You cannot change it.`,
      });
    }

    if (vaccination.administeredDate) {
      return res
        .status(409)
        .json({ err: "This vaccination is already marked as given." });
    }

    const before = vaccination.toObject();
    vaccination.set({ administeredDate: req.body.administeredDate });
    await vaccination.save();
    await audit.log({
      actor: req.user,
      action: "vaccination.mark_given",
      targetCollection: "vaccinations",
      targetDocumentId: vaccination._id,
      changes: { before, after: vaccination },
    });
    res.status(200).json(vaccination);
  }),
);

module.exports = router;
