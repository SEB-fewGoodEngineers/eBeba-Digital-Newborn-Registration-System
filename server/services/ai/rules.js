const { AI_FLAG_SOURCES } = require("../../constants");

// "  Ana " and "ana" are the same. Letters with marks are NOT changed:
// "Vukovic" and "Vuković" are different. The AI explains that near-miss.
const clean = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const fullName = (person) =>
  `${clean(person?.firstName)} ${clean(person?.lastName)}`.trim();

const ruleFlag = (field, message) => ({
  field,
  message,
  source: AI_FLAG_SOURCES.RULE,
});

/**
 * The rule checks. No AI, no database. Returns a list of flags.
 * A flag says what is different. It never says what the law allows.
 */
const runRuleChecks = ({ registration, baby, applicant }) => {
  const flags = [];

  // Rule 1: missing fields (one flag for each field)
  const requiredFields = [
    "proposedFirstName",
    "proposedLastName",
    "residentialAddress",
  ];
  for (const field of requiredFields) {
    if (!clean(registration?.[field])) {
      flags.push(ruleFlag(field, `The field "${field}" is missing.`));
    }
  }

  // The parents on the birth record (the father can be missing)
  const parents = [baby?.mother, baby?.father].filter(Boolean);

  // Rule 2: the proposed last name is not the same as a parent's last name
  const proposedLastName = clean(registration?.proposedLastName);
  const parentLastNames = parents
    .map((parent) => clean(parent.lastName))
    .filter(Boolean);

  if (
    proposedLastName &&
    parentLastNames.length > 0 &&
    !parentLastNames.includes(proposedLastName)
  ) {
    flags.push(
      ruleFlag(
        "proposedLastName",
        "The proposed last name is not the same as the last name of either parent on the birth record.",
      ),
    );
  }

  // Rule 3: the applicant's account name is not the same as the mother's
  // or the father's name on the birth record
  const applicantName = fullName(applicant);
  const parentNames = parents.map(fullName).filter(Boolean);

  if (
    applicantName &&
    parentNames.length > 0 &&
    !parentNames.includes(applicantName)
  ) {
    flags.push(
      ruleFlag(
        "applicantName",
        "The applicant's account name is not the same as the mother's or the father's name on the birth record.",
      ),
    );
  }

  return flags;
};

module.exports = { runRuleChecks };