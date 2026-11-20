const DOCUMENT_TYPE = "registration_certificate";

// The ONLY answer the public /verify page can give.
// No names and no numbers, only: valid or not, the document type, the issue date.
const buildVerificationAnswer = (certificate) => {
  if (!certificate) return { valid: false };

  return {
    valid: true,
    documentType: DOCUMENT_TYPE,
    issueDate: new Date(certificate.issuedAt).toISOString(),
  };
};

module.exports = { buildVerificationAnswer };