import { api, downloadFile } from "./api";

// MoI staff: sign the certificate. Idempotent.
export const signCertificate = (certificateId) =>
  api(`/certificates/${certificateId}/sign`, { method: "POST" });

// Parent or MoI staff: download the signed PDF.
// downloadFile sends the token and saves the blob.
export const downloadCertificate = (certificateId) =>
  downloadFile(
    `/certificates/${certificateId}/download`,
    `certificate-${certificateId}.pdf`,
  );
