import { api, downloadFile } from "./api";

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

// MoI staff: approve an application. Returns { jmbg, certificateNumber, … }.
// Idempotent on the server: second call returns 409.
export const approveRegistration = (registrationId, body) =>
  api(`/registrations/${registrationId}/approve`, { method: "POST", body });

// MoI staff: return the application for correction. Body: { reviewerNotes }.
export const returnRegistration = (registrationId, reviewerNotes) =>
  api(`/registrations/${registrationId}/return`, {
    method: "POST",
    body: { reviewerNotes },
  });

// MoI staff: reject the application. Body: { reviewerNotes }. Final.
export const rejectRegistration = (registrationId, reviewerNotes) =>
  api(`/registrations/${registrationId}/reject`, {
    method: "POST",
    body: { reviewerNotes },
  });

// Parent: edit the four content fields. Server enforces status === "returned".
export const updateRegistration = (registrationId, body) =>
  api(`/registrations/${registrationId}`, { method: "PUT", body });

// Parent: move returned -> pending. No body.
export const resubmitRegistration = (registrationId) =>
  api(`/registrations/${registrationId}/resubmit`, { method: "POST" });

export const getRegistrationByBaby = (babyId) =>
  api(`/registrations/by-baby/${babyId}`);

export const signCertificate = (certificateId) =>
  api(`/certificates/${certificateId}/sign`, { method: "POST" });

export const downloadCertificate = (certificateId) =>
  downloadFile(
    `/certificates/${certificateId}/download`,
    `certificate-${certificateId}.pdf`,
  );
