import { downloadFile } from "./api";

export const downloadSocialCard = (babyId) =>
  downloadFile(`/babies/${babyId}/documents/social-card`, "social-card.pdf");

export const downloadInsuredPersonCard = (babyId) =>
  downloadFile(
    `/babies/${babyId}/documents/insured-person-card`,
    "insured-person-card.pdf",
  );