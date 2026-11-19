const GENERIC_MESSAGE =
  "An update is available. Sign in to your eBeba account for details.";

// Approved notification texts contain no personal or medical details.
const NOTIFICATION_TEMPLATES = Object.freeze({
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
