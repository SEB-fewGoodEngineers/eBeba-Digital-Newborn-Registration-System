import { api } from "./api";

export const getCswCases = () => api("/csw-cases");

export const getCswCaseDetails = (caseId) => api(`/csw-cases/${caseId}`);
