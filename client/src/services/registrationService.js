import { api } from "./api";

// Apply to register a linked baby. Returns the new registration.
export const createRegistration = (body) =>
  api("/registrations", { method: "POST", body });

// Read one application (parent of that baby, or MoI staff).
export const getRegistration = (registrationId) =>
  api(`/registrations/${registrationId}`);

// MoI queue: list applications filtered by status. Default: "pending".
export const listRegistrations = (status = "pending") => {
  const qs = new URLSearchParams({ status }).toString();
  return api(`/registrations?${qs}`);
};

// MoI review: registration + applicant + full birth record (redacted JMBG).
// server-only endpoint, moi_staff only.
export const getRegistrationReview = (registrationId) =>
  api(`/registrations/${registrationId}/review`);