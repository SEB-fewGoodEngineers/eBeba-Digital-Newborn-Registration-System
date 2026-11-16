const express = require("express");
const CswCase = require("../models/CswCase");
const Baby = require("../models/Baby");
const Registration = require("../models/Registration");
const { verifyToken, requireRole } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { ROLES } = require("../constants");

const router = express.Router();

// Zahteva prijavu i ulogu CSW službenika
router.use(verifyToken, requireRole(ROLES.CSW_STAFF));

// LIST CSW CASES FOR THE USER'S CENTER
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // CSW službenik vidi samo slučajeve koji pripadaju njegovoj instituciji
    const query = { cswInstitutionId: req.user.institutionId };

    const cases = await CswCase.find(query)
      .sort({ createdAt: -1 }) // najnoviji prvi
      .populate({
        path: "babyId",
        select:
          "firstName lastName jmbg gender birthDateTime municipalityOfBirth mother father",
      })
      .lean();

    res.status(200).json(cases);
  }),
);

// GET SINGLE CSW CASE DETAILS
router.get(
  "/:caseId",
  asyncHandler(async (req, res) => {
    const cswCase = await CswCase.findOne({
      _id: req.params.caseId,
      cswInstitutionId: req.user.institutionId,
    })
      .populate({
        path: "babyId",
      })
      .populate({
        path: "registrationId",
      })
      .lean();

    if (!cswCase) {
      return res.status(404).json({ err: "CSW case not found." });
    }

    res.status(200).json(cswCase);
  }),
);

module.exports = router;
