import { api, downloadFile } from "./api";

export const downloadCertificate = (babyId) =>
  downloadFile(
    `/babies/${babyId}/documents/certificate`,
    "registration-certificate.pdf",
  );

export const downloadSocialCard = (babyId) =>
  downloadFile(`/babies/${babyId}/documents/social-card`, "social-card.pdf");

export const downloadInsuredPersonCard = (babyId) =>
  downloadFile(
    `/babies/${babyId}/documents/insured-person-card`,
    "insured-person-card.pdf",
  );

// PUBLIC: works without login
export const verifyCertificate = (code) =>
  api(`/verify/${encodeURIComponent(code)}`);