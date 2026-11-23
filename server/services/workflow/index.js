// WORKFLOW SERVICE – STUB
// Owner: Workflow service (Epic 2), tasks W1–W2.
// The function names and arguments are final: call them now in your stories.
const crypto = require("crypto");
const Baby = require("../../models/Baby");
const Certificate = require("../../models/Certificate");
const CswCase = require("../../models/CswCase");
const InsuranceRecord = require("../../models/InsuranceRecord");
const Institution = require("../../models/Institution");
const {
  REGISTRATION_STATUS,
  INSTITUTION_TYPES,
} = require("../../constants");
const { MUNICIPALITY_JMBG } = require("../../constants/jmbgRegions");


// Demo JMBG region code: 99 (decided by the instructor).
// Every JMBG in eBeba is fictional and is always shown with a DEMO badge.
const DEMO_JMBG_REGION = "99";

/**
 * Change a document's status and add a statusHistory entry. Does not save.
 * TODO W1: refuse changes that are not in the status table
 *          (throw an error with err.status = 409).
 */
const transition = (doc, toStatus, user, note) => {
  doc.statusHistory.push({
    from: doc.status,
    to: toStatus,
    byUserId: user._id,
    at: new Date(),
    note,
  });
  doc.status = toStatus;
  return doc;
};

/**
 * A DEMO number, e.g. generateNumber("SC") → "SC-DEMO-7K3F9A"
 * TODO W1: check this is good enough (unique index will catch a rare repeat).
 */
const generateNumber = (prefix) =>
  `${prefix}-DEMO-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

/**
 * Mod-11 check digit, per Zakon o centralnom registru stanovništva, čl. 26.
 * Returns a single digit 0-9. There is NO error case: both m = 10 and m = 11
 * produce check digit 0. Treating m = 10 as an error is a common mistake.
 */
const jmbgCheckDigit = (first12) => {
  if (first12.length !== 12) throw new Error("JMBG needs exactly 12 digits.");
  const d = first12.split("").map(Number);
  const sum =
    7 * (d[0] + d[6]) +
    6 * (d[1] + d[7]) +
    5 * (d[2] + d[8]) +
    4 * (d[3] + d[9]) +
    3 * (d[4] + d[10]) +
    2 * (d[5] + d[11]);
  const m = 11 - (sum % 11);
  if (m === 10 || m === 11) return 0;
  return m;
};

/**
 * Generate a DEMO JMBG for a baby born in a Montenegrin municipality.
 * @param {Date}   birthDateTime
 * @param {string} municipality  e.g. "Bar", "Podgorica"
 * @param {"M"|"F"} gender
 * @returns {string} 13 digits
 */
const generateJmbg = (birthDateTime, municipality, gender) => {
  const muni = MUNICIPALITY_JMBG[municipality];
  if (!muni) {
    throw new Error(`No JMBG region for municipality "${municipality}".`);
  }

  const d = new Date(birthDateTime);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyy = String(d.getUTCFullYear()).slice(-3);

  const [min, max] = gender === "M" ? muni.male : muni.female;
  const serial = crypto.randomInt(min, max + 1); // inclusive
  const bbb = String(serial).padStart(3, "0");

  const first12 = `${dd}${mm}${yyy}${muni.area}${bbb}`;
  const k = jmbgCheckDigit(first12);
  return `${first12}${k}`;
};

/**
 * Approve a registration and start the work at CSW and FZO.
 * TODO W2: set jmbg, names, address and registeredAt on the baby; create the
 *          certificate, CSW case and insurance record (upsert by babyId);
 *          notify the parents and the hospital; write to the audit log.
 * Now it only changes the status.
 */
/**
 * Approve a registration and start the work at CSW and FZO.
 *
 * Idempotent: a second call throws 409 from transition(), and every downstream
 * write is an upsert keyed on babyId. Nothing is duplicated.
 *
 * Writes:
 *   - registrations: status -> approved, reviewedByUserId, reviewedAt, statusHistory
 *   - babies:        jmbg, firstName, lastName, residentialAddress, registeredAt
 *   - certificates:  1 per baby (upsert)
 *   - cswCases:      1 per baby (upsert), routed by municipality
 *   - insuranceRecords: 1 per baby (upsert), routed by municipality
 *   - audit.log:     registration.approve
 *   - notify:        parent(s) + hospital staff
 */
const approveRegistration = async (registration, user) => {
  // 1. Load the birth record. The baby is the source of gender and birth date.
  const baby = await Baby.findById(registration.babyId);
  if (!baby) {
    throw new Error("Baby not found for this registration.");
  }

  // 2. Generate a realistic DEMO JMBG from the birth date, the municipality
  //    the parent chose, and the baby's gender. Throws if the municipality
  //    is not in the JMBG region table — do not approve a registration with
  //    an unknown region.
  const jmbg = generateJmbg(
    baby.birthDateTime,
    registration.municipality,
    baby.gender,
  );

  // 3. Change the registration's status and add the history entry.
  //    transition() throws 409 if the current status is not "pending".
  transition(registration, REGISTRATION_STATUS.APPROVED, user, "Approved");
  registration.reviewedByUserId = user._id;
  registration.reviewedAt = new Date();
  await registration.save();

  // 4. Write the approved fields to the baby. $setOnInsert is NOT used here:
  //    on re-run we would not reach this point, because transition() throws.
  //    Use findOneAndUpdate with $set so a retried save is still safe.
  const now = new Date();
  await Baby.updateOne(
    { _id: baby._id },
    {
      $set: {
        jmbg,
        firstName: registration.proposedFirstName,
        lastName: registration.proposedLastName,
        residentialAddress: registration.residentialAddress,
        registeredAt: now,
      },
    },
  );

  // 5. Certificate — 1 per baby. Upsert so a crash-and-retry does not duplicate.
  await Certificate.findOneAndUpdate(
    { babyId: baby._id },
    {
      $setOnInsert: {
        babyId: baby._id,
        registrationId: registration._id,
        certificateNumber: generateNumber("CERT"),
        jmbg,
        verificationCode: crypto.randomUUID(),
        issuedByUserId: user._id,
        issuedAt: now,
        isDemo: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // 6. Route CSW and FZO by municipality (same rule for both).
  //    Fall back to the first active institution of that type.
  const cswInstitution = await Institution.findOne({
    type: INSTITUTION_TYPES.CSW,
    municipality: registration.municipality,
    isActive: true,
  }).lean();
  const cswId =
    cswInstitution?._id ||
    (
      await Institution.findOne({
        type: INSTITUTION_TYPES.CSW,
        isActive: true,
      }).lean()
    )?._id;

  const fundInstitution = await Institution.findOne({
    type: INSTITUTION_TYPES.HEALTH_INSURANCE_FUND,
    municipality: registration.municipality,
    isActive: true,
  }).lean();
  const fundId =
    fundInstitution?._id ||
    (
      await Institution.findOne({
        type: INSTITUTION_TYPES.HEALTH_INSURANCE_FUND,
        isActive: true,
      }).lean()
    )?._id;

  // 7. CSW case — upsert by babyId.
  if (cswId) {
    const existing = await CswCase.findOneAndUpdate(
      { babyId: baby._id },
      {
        $setOnInsert: {
          babyId: baby._id,
          registrationId: registration._id,
          cswInstitutionId: cswId,
          status: "received",
          statusHistory: [],
        },
      },
      { upsert: true, new: false, setDefaultsOnInsert: true },
    );
    if (!existing) await notifyStaff("staff.csw_case_received", cswId);
  }

  // 8. Insurance record — upsert by babyId.
  if (fundId) {
    const existing = await InsuranceRecord.findOneAndUpdate(
      { babyId: baby._id },
      {
        $setOnInsert: {
          babyId: baby._id,
          registrationId: registration._id,
          fundBranchId: fundId,
          status: "received",
          statusHistory: [],
        },
      },
      { upsert: true, new: false, setDefaultsOnInsert: true },
    );
    if (!existing) await notifyStaff("staff.insurance_received", fundId);
  }

  // 9. Audit — after all writes succeeded. One line, no PII.
  await audit.log({
    actor: user,
    action: "registration.approve",
    targetCollection: "registrations",
    targetDocumentId: registration._id,
    changes: { after: { status: REGISTRATION_STATUS.APPROVED } },
  });

  // 10. Notify parents (authorizedUserIds) and hospital staff.
  //     Messages must not contain JMBG or medical details.
  await Promise.all(
    (baby.authorizedUserIds || []).map((parentId) =>
      notify(parentId, {
        type: "registration.approved",
        title: "Your baby's registration is approved",
        message:
          "The certificate will be available to download once it is signed.",
        link: "/dashboard", // ← the only allowed link
        babyId: baby._id,
      }).catch((err) => {
        // Notification is best-effort. The approval is already saved.
        console.error("notify parent failed:", err.message);
      }),
    ),
  );

  await notifyStaff("staff.birth_registered", baby.hospitalId);

  return registration;
};

const audit = require("../audit");
const { notify, notifyStaff } = require("../notifications");

// Return a registration to the parent for correction.
// Throws 409 if the current status is not "pending" (transition() enforces).
const returnRegistration = async (registration, user, reviewerNotes) => {
  transition(registration, REGISTRATION_STATUS.RETURNED, user, reviewerNotes);
  registration.reviewerNotes = reviewerNotes;
  registration.reviewedByUserId = user._id;
  registration.reviewedAt = new Date();
  await registration.save();

  await audit.log({
    actor: user,
    action: "registration.return",
    targetCollection: "registrations",
    targetDocumentId: registration._id,
  });
  await notify(registration.submittedByUserId, {
    type: "registration.returned",
    title: "Your application was returned for correction",
    message:
      "Open your dashboard, read the note, correct the details and resubmit.",
    link: "/dashboard",
    babyId: registration.babyId,
  }).catch((err) => {
    console.error("notify parent failed:", err.message);
  });
  return registration;
};

// Reject a registration. Final in the demo: no route moves a rejected doc.
const rejectRegistration = async (registration, user, reviewerNotes) => {
  transition(registration, REGISTRATION_STATUS.REJECTED, user, reviewerNotes);
  registration.reviewerNotes = reviewerNotes;
  registration.reviewedByUserId = user._id;
  registration.reviewedAt = new Date();
  await registration.save();

  await audit.log({
    actor: user,
    action: "registration.reject",
    targetCollection: "registrations",
    targetDocumentId: registration._id,
  });
  await notify(registration.submittedByUserId, {
    type: "registration.rejected",
    title: "Your application was rejected",
    message:
      "Open your dashboard to read the officer's note. This decision is final.",
    link: "/dashboard",
    babyId: registration.babyId,
  }).catch((err) => {
    console.error("notify parent failed:", err.message);
  });
  return registration;
};

// Parent resubmits after fixing. returned -> pending.
const unreturnRegistration = async (registration, user, note) => {
  transition(
    registration,
    REGISTRATION_STATUS.PENDING,
    user,
    note || "Resubmitted after correction",
  );
  registration.reviewedByUserId = undefined;
  registration.reviewedAt = undefined;
  registration.reviewerNotes = undefined;
  await registration.save();

  await audit.log({
    actor: user,
    action: "registration.resubmit",
    targetCollection: "registrations",
    targetDocumentId: registration._id,
  });
  await notifyStaff("staff.review_requested");
  return registration;
};

module.exports = {
  DEMO_JMBG_REGION, // keep for backward compat if anything imports it; no longer used by generateJmbg
  transition,
  generateNumber,
  generateJmbg,
  jmbgCheckDigit,
  approveRegistration,
  returnRegistration,
  rejectRegistration,
  unreturnRegistration,
};
