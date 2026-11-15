// One place for every role, status and enum value.
// Always use these constants in code, never a plain string like "pending".

const ROLES = Object.freeze({
  ADMIN: "admin",
  HOSPITAL_STAFF: "hospital_staff",
  MOI_STAFF: "moi_staff",
  CSW_STAFF: "csw_staff",
  HEALTH_INSURANCE_STAFF: "health_insurance_staff",
  PEDIATRICIAN: "pediatrician",
  PARENT: "parent",
});

const INSTITUTION_TYPES = Object.freeze({
  HOSPITAL: "hospital",
  MOI: "moi",
  CSW: "csw",
  HEALTH_INSURANCE_FUND: "health_insurance_fund",
  PEDIATRIC_CLINIC: "pediatric_clinic",
});

// Which institution type each staff role must belong to.
const ROLE_INSTITUTION_TYPE = Object.freeze({
  [ROLES.HOSPITAL_STAFF]: INSTITUTION_TYPES.HOSPITAL,
  [ROLES.MOI_STAFF]: INSTITUTION_TYPES.MOI,
  [ROLES.CSW_STAFF]: INSTITUTION_TYPES.CSW,
  [ROLES.HEALTH_INSURANCE_STAFF]: INSTITUTION_TYPES.HEALTH_INSURANCE_FUND,
  [ROLES.PEDIATRICIAN]: INSTITUTION_TYPES.PEDIATRIC_CLINIC,
});

// Roles that must have an institutionId.
const STAFF_ROLES = Object.freeze(Object.keys(ROLE_INSTITUTION_TYPE));

const GENDERS = Object.freeze({ MALE: "M", FEMALE: "F" });

const FAMILY_TYPES = Object.freeze({
  TWO_PARENTS: "two_parents",
  SINGLE_PARENT: "single_parent",
  UNKNOWN_FATHER: "unknown_father",
  LEGAL_GUARDIAN: "legal_guardian",
});

const REGISTRATION_STATUS = Object.freeze({
  PENDING: "pending",
  RETURNED: "returned",
  APPROVED: "approved",
  REJECTED: "rejected",
});

const CSW_CASE_STATUS = Object.freeze({
  RECEIVED: "received",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  REJECTED: "rejected",
});

const INSURANCE_STATUS = Object.freeze({
  RECEIVED: "received",
  IN_PROGRESS: "in_progress",
  CARD_ISSUED: "card_issued",
});

const ENTRY_SOURCES = Object.freeze({
  PARENT: "parent-entered",
  PEDIATRICIAN: "pediatrician-entered",
});

const MEDICAL_RECORD_TYPES = Object.freeze({
  EXAMINATION: "examination",
  ALLERGY: "allergy",
  GENERAL_NOTE: "general_note",
});

const APPOINTMENT_STATUS = Object.freeze({
  UPCOMING: "upcoming",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

const DIARY_CATEGORIES = Object.freeze({
  FEEDING: "feeding",
  SLEEP: "sleep",
  DIAPER: "diaper",
  TEMPERATURE: "temperature",
  ACTIVITY: "activity",
});

const FEEDING_METHODS = Object.freeze({
  BREASTFEEDING: "breastfeeding",
  BOTTLE: "bottle",
  SOLID: "solid",
});

const DIAPER_TYPES = Object.freeze({
  WET: "wet",
  DIRTY: "dirty",
  BOTH: "both",
});

const MILESTONE_CATEGORIES = Object.freeze({
  MOTOR: "motor",
  COGNITIVE: "cognitive",
  SOCIAL: "social",
  LANGUAGE: "language",
});

const AI_SUGGESTION_KINDS = Object.freeze({
  REGISTRATION_PRECHECK: "registration_precheck",
});

// Where a pre-check flag came from: the rule-based check or the AI
const AI_FLAG_SOURCES = Object.freeze({
  RULE: "rule",
  AI: "ai",
});

const AI_FLAG_DECISIONS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  DISMISSED: "dismissed",
});

module.exports = {
  ROLES,
  INSTITUTION_TYPES,
  ROLE_INSTITUTION_TYPE,
  STAFF_ROLES,
  GENDERS,
  FAMILY_TYPES,
  REGISTRATION_STATUS,
  CSW_CASE_STATUS,
  INSURANCE_STATUS,
  ENTRY_SOURCES,
  MEDICAL_RECORD_TYPES,
  APPOINTMENT_STATUS,
  DIARY_CATEGORIES,
  FEEDING_METHODS,
  DIAPER_TYPES,
  MILESTONE_CATEGORIES,
  AI_SUGGESTION_KINDS,
  AI_FLAG_SOURCES,
  AI_FLAG_DECISIONS,
};
