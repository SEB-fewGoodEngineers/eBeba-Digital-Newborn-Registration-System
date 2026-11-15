// WORKFLOW SERVICE – STUB
// Owner: Workflow service (Epic 2), tasks W1–W2.
// The function names and arguments are final: call them now in your stories.
const crypto = require("crypto");
const { REGISTRATION_STATUS } = require("../../constants");

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
 * 13 digits: DDMMYYY + region (2) + 3 digits + check digit.
 * TODO W1: calculate the real check digit (now always 0).
 */
const generateJmbg = (birthDateTime) => {
  const d = new Date(birthDateTime);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyy = String(d.getUTCFullYear()).slice(1);
  const serial = String(crypto.randomInt(0, 1000)).padStart(3, "0");
  return `${dd}${mm}${yyy}${DEMO_JMBG_REGION}${serial}0`;
};

/**
 * Approve a registration and start the work at CSW and FZO.
 * TODO W2: set jmbg, names, address and registeredAt on the baby; create the
 *          certificate, CSW case and insurance record (upsert by babyId);
 *          notify the parents and the hospital; write to the audit log.
 * Now it only changes the status.
 */
const approveRegistration = async (registration, user) => {
  transition(registration, REGISTRATION_STATUS.APPROVED, user, "Approved");
  registration.reviewedByUserId = user._id;
  registration.reviewedAt = new Date();
  await registration.save();
  return registration;
};

module.exports = {
  DEMO_JMBG_REGION,
  transition,
  generateNumber,
  generateJmbg,
  approveRegistration,
};
