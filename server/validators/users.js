const crypto = require("crypto");
const { z } = require("zod");

const INVALID_KEY = "Invalid public key: expected an RSA-2048 RS256 signing key.";
const MIN_MODULUS_BITS = 2048;

const base64url = z.string().regex(/^[A-Za-z0-9_-]+$/, INVALID_KEY);

// The public half of the officer's key, as the browser's
// crypto.subtle.exportKey("jwk") returns it (RSASSA-PKCS1-v1_5 / SHA-256).
// Strict: a private JWK (with "d", "p", "q"...) is refused, never stored.
const publicJwk = z
  .strictObject(
    {
      kty: z.literal("RSA", { error: INVALID_KEY }),
      alg: z.literal("RS256", { error: INVALID_KEY }).optional(),
      n: base64url,
      e: base64url,
      ext: z.boolean().optional(),
      key_ops: z.array(z.literal("verify", { error: INVALID_KEY })).optional(),
    },
    { error: INVALID_KEY },
  )
  .superRefine((jwk, ctx) => {
    try {
      const key = crypto.createPublicKey({
        key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
        format: "jwk",
      });
      if (key.asymmetricKeyDetails.modulusLength < MIN_MODULUS_BITS) {
        ctx.addIssue({ code: "custom", message: INVALID_KEY });
      }
    } catch {
      ctx.addIssue({ code: "custom", message: INVALID_KEY });
    }
  })
  // Store only what verification needs
  .transform(({ kty, n, e }) => ({ kty, n, e, alg: "RS256" }));

const signingKeySchema = z.object({ publicJwk });

module.exports = { signingKeySchema, INVALID_KEY };
