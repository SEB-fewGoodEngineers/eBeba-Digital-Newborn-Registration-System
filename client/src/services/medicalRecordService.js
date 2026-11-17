
import { api } from "./api";

// Get medical records for one baby.
export const getMedicalRecords = (babyId) =>
  api(`/babies/${babyId}/medical-records`);

// Create a medical record.
export const createMedicalRecord = (babyId, record) =>
  api(`/babies/${babyId}/medical-records`, {
    method: "POST",
    body: record,
  });

// Update an existing medical record.
export const updateMedicalRecord = (babyId, recordId, changes) =>
  api(`/babies/${babyId}/medical-records/${recordId}`, {
    method: "PATCH",
    body: changes,
  });
