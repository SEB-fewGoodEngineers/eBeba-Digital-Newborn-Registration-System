const crypto = require("crypto");

/**
 * Canonical JSON for the approval payload. Must be byte-for-byte identical
 * on the browser and the server. Do not change ordering or spacing without
 * changing both sides in the same PR.
 */
const canonicalApprovalPayload = ({
  registrationId,
  decision,
  officerId,
  issuedAt,
}) =>
  JSON.stringify({
    registrationId,
    decision,
    officerId,
    issuedAt,
  });

/**
 * Verify an RSA-SHA256 signature over the canonical payload.
 * @param {object} payload   the parsed payload object
 * @param {string} signature base64 signature
 * @param {object} publicJwk the officer's public key (JWK)
 * @returns {boolean}
 */
const verifyApprovalSignature = (payload, signature, publicJwk) => {
  try {
    const key = crypto.createPublicKey({ key: publicJwk, format: "jwk" });
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(canonicalApprovalPayload(payload));
    verifier.end();
    return verifier.verify(key, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
};

module.exports = { canonicalApprovalPayload, verifyApprovalSignature };
