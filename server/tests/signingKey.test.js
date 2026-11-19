const { test } = require("node:test");
const assert = require("node:assert");

const { signingKeySchema } = require("../validators/users");
const {
  verifyApprovalSignature,
  canonicalApprovalPayload,
} = require("../services/singing");

// Same algorithm and options as client/src/services/signingKey.js
const ALGORITHM = {
  name: "RSASSA-PKCS1-v1_5",
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

const makeBrowserKey = async (modulusLength = 2048) => {
  const pair = await crypto.subtle.generateKey(
    { ...ALGORITHM, modulusLength },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { pair, publicJwk, privateJwk };
};

const signLikeBrowser = async (privateKey, payload) => {
  const buf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(canonicalApprovalPayload(payload)),
  );
  return Buffer.from(buf).toString("base64");
};

const payload = {
  registrationId: "64b000000000000000000010",
  decision: "approve",
  officerId: "64b000000000000000000020",
  issuedAt: "2026-11-19T10:00:00.000Z",
};

test("accepts the public key exactly as the browser exports it (RS256)", async () => {
  const { publicJwk } = await makeBrowserKey();
  assert.strictEqual(publicJwk.alg, "RS256");

  const result = signingKeySchema.safeParse({ publicJwk });
  assert.strictEqual(result.success, true);
});

test("stores only kty, n, e and alg", async () => {
  const { publicJwk } = await makeBrowserKey();
  const { data } = signingKeySchema.safeParse({ publicJwk });

  assert.deepStrictEqual(Object.keys(data.publicJwk).sort(), [
    "alg",
    "e",
    "kty",
    "n",
  ]);
});

test("rejects a private key", async () => {
  const { privateJwk } = await makeBrowserKey();
  const result = signingKeySchema.safeParse({ publicJwk: privateJwk });
  assert.strictEqual(result.success, false);
});

test("rejects an encryption algorithm (RSA-OAEP-256)", async () => {
  const { publicJwk } = await makeBrowserKey();
  const result = signingKeySchema.safeParse({
    publicJwk: { ...publicJwk, alg: "RSA-OAEP-256" },
  });
  assert.strictEqual(result.success, false);
});

test("rejects a key shorter than 2048 bits", async () => {
  const { publicJwk } = await makeBrowserKey(1024);
  const result = signingKeySchema.safeParse({ publicJwk });
  assert.strictEqual(result.success, false);
});

test("rejects a non-RSA key and a missing key", async () => {
  const { publicJwk } = await makeBrowserKey();
  assert.strictEqual(
    signingKeySchema.safeParse({ publicJwk: { ...publicJwk, kty: "EC" } })
      .success,
    false,
  );
  assert.strictEqual(signingKeySchema.safeParse({}).success, false);
});

test("rejects a modulus that is not a valid key", async () => {
  const { publicJwk } = await makeBrowserKey();
  const result = signingKeySchema.safeParse({
    publicJwk: { ...publicJwk, n: "abc" },
  });
  assert.strictEqual(result.success, false);
});

test("a browser signature verifies against the stored key; a changed payload does not", async () => {
  const { pair, publicJwk } = await makeBrowserKey();
  const stored = signingKeySchema.parse({ publicJwk }).publicJwk;
  const signature = await signLikeBrowser(pair.privateKey, payload);

  assert.strictEqual(verifyApprovalSignature(payload, signature, stored), true);
  assert.strictEqual(
    verifyApprovalSignature(
      { ...payload, registrationId: "64b000000000000000000011" },
      signature,
      stored,
    ),
    false,
  );
});
