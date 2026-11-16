import { api } from "./api";

// Apply to register a linked baby. Returns the new registration.
export const createRegistration = (body) =>
  api("/registrations", { method: "POST", body });

// Read one application (parent of that baby, or MoI staff).
export const getRegistration = (registrationId) =>
  api(`/registrations/${registrationId}`);