
const { ROLES } = require("../../constants");

const GENERIC_MESSAGE =
  "An update is available. Sign in to your eBeba account for details.";

// Approved notification texts contain no personal or medical details.
const NOTIFICATION_TEMPLATES = Object.freeze({
  "staff.review_requested": {
    title: "Registration ready for review",
    message: "Open the registration queue to review a submitted application.",
    role: ROLES.MOI_STAFF,
    link: "/moi/queue",
  },
  "staff.birth_registered": {
    title: "Birth registration approved",
    message: "A registration for a birth recorded by your hospital was approved.",
    role: ROLES.HOSPITAL_STAFF,
    link: "/hospital/babies",
    recipientField: "institutionId",
  },
  "staff.csw_case_received": {
    title: "New social welfare case",
    message: "A new case is available for your center.",
    role: ROLES.CSW_STAFF,
    link: "/csw-cases",
    recipientField: "institutionId",
  },
  "staff.insurance_received": {
    title: "New insurance record",
    message: "A new insurance record is available for your branch.",
    role: ROLES.HEALTH_INSURANCE_STAFF,
    link: "/insurance-records",
    recipientField: "institutionId",
  },
  "staff.account_created": {
    title: "Staff account created",
    message: "A staff account was created. Open the audit logs to review the event.",
    role: ROLES.ADMIN,
    link: "/admin/audit-logs",
  },
  "staff.access_changed": {
    title: "Staff access updated",
    message: "A staff account was activated or deactivated. Open the audit logs for details.",
    role: ROLES.ADMIN,
    link: "/admin/audit-logs",
  },
  "staff.patient_assigned": {
    title: "New patient assigned",
    message: "A child has been assigned to you. Open your patient list for details.",
    role: ROLES.PEDIATRICIAN,
    link: "/pediatrician/babies",
    recipientField: "_id",
  },
  "birth_record.created": {
    title: "Birth record created",
    message: "A hospital created a birth record. Use the record number below to link your baby to your eBeba account.",
  },
  // Story 4.5: the pediatrician added a clinical entry. No medical details.
  "medical_record.added_by_pediatrician": {
    title: "Health record update",
    message:
      "Your baby's pediatrician added a new entry. Sign in to your eBeba account for details.",
  },

  "vaccination.added_by_pediatrician": {
    title: "Health record update",
    message:
      "Your baby's pediatrician added a vaccination. Sign in to your eBeba account for details.",
  },

  "registration.returned": {
    title: "Registration returned for correction",
    message: "Open your dashboard to review the correction request.",
  },
  "registration.rejected": {
    title: "Registration rejected",
    message: "Open your dashboard to view the decision.",
  },
  "registration.approved": {
    title: "Registration approved",
    message: "Your application has been approved.",
  },

  "csw_case.completed": {
    title: "Account update",
    message: GENERIC_MESSAGE,
  },

  "csw_case.rejected": {
    title: "Account update",
    message: GENERIC_MESSAGE,
  },

  "insurance.card_issued": {
    title: "Account update",
    message: GENERIC_MESSAGE,
  },

  "baby.pediatrician_assigned": {
    title: "Account update",
    message: GENERIC_MESSAGE,
  },

  // N3 reminders: no vaccine name, no place, no medical details.
  "vaccination.reminder": {
    title: "Reminder",
    message:
      "A vaccination is planned in the next 24 hours. Sign in to your eBeba account for details.",
  },

  "appointment.reminder": {
    title: "Reminder",
    message:
      "A check-up is planned in the next 24 hours. Sign in to your eBeba account for details.",
  },
});

// Reject notification types without an approved template.
const getNotificationTemplate = (type) => {
  if (!Object.hasOwn(NOTIFICATION_TEMPLATES, type)) {
    throw new Error("Unknown notification type.");
  }

  return NOTIFICATION_TEMPLATES[type];
};

module.exports = {
  NOTIFICATION_TEMPLATES,
  getNotificationTemplate,
};
