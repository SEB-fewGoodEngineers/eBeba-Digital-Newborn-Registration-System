// Readable labels for values stored in the database.
// The values must match server/constants/index.js.

export const ROLES = Object.freeze({
  ADMIN: "admin",
  HOSPITAL_STAFF: "hospital_staff",
  MOI_STAFF: "moi_staff",
  CSW_STAFF: "csw_staff",
  HEALTH_INSURANCE_STAFF: "health_insurance_staff",
  PEDIATRICIAN: "pediatrician",
  PARENT: "parent",
});

export const ROLE_LABELS = Object.freeze({
  admin: "Administrator",
  hospital_staff: "Hospital staff",
  moi_staff: "MoI staff",
  csw_staff: "CSW staff",
  health_insurance_staff: "FZO staff",
  pediatrician: "Pediatrician",
  parent: "Parent / guardian",
});

// Every status value used by registrations, CSW cases and insurance records
export const STATUS_LABELS = Object.freeze({
  pending: "Pending",
  returned: "Returned for correction",
  approved: "Approved",
  rejected: "Rejected",
  received: "Received",
  in_progress: "In progress",
  completed: "Completed",
  card_issued: "Card issued",
  waiting_for_moi: "Waiting for MoI",
  // Appointments (Story 4.4)
  upcoming: "Upcoming",
  cancelled: "Cancelled",
});

// MUI Chip colours for each status
export const STATUS_COLORS = Object.freeze({
  pending: "warning",
  returned: "warning",
  approved: "success",
  rejected: "error",
  received: "info",
  in_progress: "info",
  completed: "success",
  card_issued: "success",
  waiting_for_moi: "default",
  upcoming: "info",
  cancelled: "default",
});
