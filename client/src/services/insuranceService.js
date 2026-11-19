import { api } from "./api";

export const getInsuranceRecords = () => api("/insurance-records");

export const getInsuranceRecord = (recordId) =>
  api(`/insurance-records/${recordId}`);

export const startInsuranceRecord = (recordId) =>
  api(`/insurance-records/${recordId}/start`, { method: "POST" });

export const issueInsurance = (recordId, insuredParentId) =>
  api(`/insurance-records/${recordId}/issue`, {
    method: "POST",
    body: { insuredParentId },
  });
  export const getPediatricians = () => api("/insurance-records/pediatricians");

export const assignPediatrician = (recordId, pediatricianId) =>
  api(`/insurance-records/${recordId}/pediatrician`, {
    method: "POST",
    body: { pediatricianId },
  });