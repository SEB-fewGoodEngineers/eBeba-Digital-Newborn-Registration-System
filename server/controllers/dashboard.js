
const express = require("express");
const Baby = require("../models/Baby");
const Registration = require("../models/Registration");
const CswCase = require("../models/CswCase");
const InsuranceRecord = require("../models/InsuranceRecord");
const User = require("../models/User");

const { verifyToken, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { ROLES, REGISTRATION_STATUS } = require("../constants");

const router = express.Router();

const WAITING_FOR_MOI = "waiting_for_moi";

// GET THE LOGGED-IN PARENT'S DASHBOARD
router.get(
  "/",
  verifyToken,
  requireRole(ROLES.PARENT),
  asyncHandler(async (req, res) => {
    // Only babies linked to the signed-in parent.
    const babies = await Baby.find({
      authorizedUserIds: req.user._id,
    })
      .select(
        "birthRecordNumber firstName lastName gender birthDateTime " +
          "placeOfBirth municipalityOfBirth birthWeightGrams " +
          "birthLengthCm jmbg assignedPediatricianId",
      )
      .sort({ createdAt: -1 })
      .lean();

    if (babies.length === 0) {
      return res.status(200).json([]);
    }

    const babyIds = babies.map((baby) => baby._id);

    const pediatricianIds = babies
      .map((baby) => baby.assignedPediatricianId)
      .filter(Boolean);

    // Load related records in batches, not once per baby.
    const [registrations, cswCases, insuranceRecords, pediatricians] =
      await Promise.all([
        Registration.find({ babyId: { $in: babyIds } })
          .select("babyId status")
          .lean(),

        CswCase.find({ babyId: { $in: babyIds } })
          .select("babyId status")
          .lean(),

        InsuranceRecord.find({ babyId: { $in: babyIds } })
          .select("babyId status")
          .lean(),

        User.find({
          _id: { $in: pediatricianIds },
          role: ROLES.PEDIATRICIAN,
        })
          .select("firstName lastName")
          .lean(),
      ]);

    const makeStatusMap = (records) =>
      new Map(
        records.map((record) => [
          String(record.babyId),
          record.status,
        ]),
      );

    const registrationStatuses = makeStatusMap(registrations);
    const cswStatuses = makeStatusMap(cswCases);
    const insuranceStatuses = makeStatusMap(insuranceRecords);

    const doctorsById = new Map(
      pediatricians.map((doctor) => [
        String(doctor._id),
        {
          firstName: doctor.firstName,
          lastName: doctor.lastName,
        },
      ]),
    );

    const dashboard = babies.map((baby) => {
      const { assignedPediatricianId, ...birthData } = baby;

      const babyId = String(baby._id);
      const registrationStatus =
        registrationStatuses.get(babyId) ?? null;

      return {
        ...birthData,

        registrationStatus,

        cswStatus:
          cswStatuses.get(babyId) ?? WAITING_FOR_MOI,

        insuranceStatus:
          insuranceStatuses.get(babyId) ?? WAITING_FOR_MOI,

        pediatrician:
          doctorsById.get(String(assignedPediatricianId)) ?? null,

        isRegistrationApproved:
          registrationStatus === REGISTRATION_STATUS.APPROVED,
      };
    });

    res.status(200).json(dashboard);
  }),
);

module.exports = router;
