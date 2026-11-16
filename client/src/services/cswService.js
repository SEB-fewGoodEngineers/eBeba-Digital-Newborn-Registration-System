import { api } from "./api";
export const getCswCases = () => api("/csw-cases");
export const getCswCaseDetails = (caseId) => api(`/csw-cases/${caseId}`);

export const startCswCase = (caseId) =>
  api(`/csw-cases/${caseId}/start`, { method: "POST" });

export const completeCswCase = (caseId) =>
  api(`/csw-cases/${caseId}/complete`, { method: "POST" });

export const rejectCswCase = (caseId, notes) =>
  api(`/csw-cases/${caseId}/reject`, { method: "POST", body: { notes } });