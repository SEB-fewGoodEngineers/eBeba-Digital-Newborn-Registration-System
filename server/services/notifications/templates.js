
const GENERIC_MESSAGE =
  "An update is available. Sign in to your eBeba account for details.";

// Approved notification texts contain no personal or medical details.
const NOTIFICATION_TEMPLATES = Object.freeze({
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
