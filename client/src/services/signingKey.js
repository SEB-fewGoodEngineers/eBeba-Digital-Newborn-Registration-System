const DB_NAME = "ebeba-signing";
const STORE = "keys";
// One key per officer, so two officers sharing a browser never use each other's key
const keyId = (userId) => `officer-signing-key:${userId}`;

const openDB = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idbGet = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
};

const idbPut = async (key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const r = tx.objectStore(STORE).put(value, key);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
};

// PBKDF2-SHA256, 200k iterations. Derives an AES-GCM key from the passphrase.
// The salt is random per wrapping and stored alongside the wrapped key.
const deriveWrappingKey = async (passphrase, salt) => {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

/**
 * Register a new signing key for the current officer.
 * Generates an RSA-2048 keypair, exports the public JWK,
 * wraps the private key with the passphrase, stores it in IndexedDB.
 * @returns {Promise<object>} the public JWK (to send to the server)
 */
export const registerSigningKey = async (userId, passphrase) => {
  const signingKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

  const publicJwk = await crypto.subtle.exportKey(
    "jwk",
    signingKeyPair.publicKey,
  );
  const pkcs8 = await crypto.subtle.exportKey(
    "pkcs8",
    signingKeyPair.privateKey,
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrappingKey = await deriveWrappingKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    pkcs8,
  );

  await idbPut(keyId(userId), {
    publicJwk,
    wrapped: {
      salt: Array.from(salt),
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext)),
    },
  });

  return publicJwk;
};

/**
 * Sign the canonical approval payload with the officer's private key.
 * Throws if no key is registered or the passphrase is wrong.
 */
export const signApprovalPayload = async (userId, passphrase, payload) => {
  const stored = await idbGet(keyId(userId));
  if (!stored)
    throw new Error("No signing key on this device. Register one first.");

  const salt = new Uint8Array(stored.wrapped.salt);
  const iv = new Uint8Array(stored.wrapped.iv);
  const ciphertext = new Uint8Array(stored.wrapped.ciphertext).buffer;

  const wrappingKey = await deriveWrappingKey(passphrase, salt);

  let pkcs8;
  try {
    pkcs8 = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      wrappingKey,
      ciphertext,
    );
  } catch {
    // AES-GCM fails if the key is wrong (wrong passphrase) OR the IV is bad.
    // We only expect the first case.
    throw new Error("Wrong passphrase.");
  }

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // MUST be identical to the server's canonicalApprovalPayload.
  const canonical = JSON.stringify({
    registrationId: payload.registrationId,
    decision: payload.decision,
    officerId: payload.officerId,
    issuedAt: payload.issuedAt,
  });
  const signatureBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(canonical),
  );

  return {
    payload,
    signature: btoa(String.fromCharCode(...new Uint8Array(signatureBuf))),
  };
};

export const hasSigningKey = async (userId) =>
  Boolean(await idbGet(keyId(userId)));

/**
 * True only if this browser holds the key the server has on file for the
 * officer. False when the officer re-registered on another device (the
 * server key was replaced), so the page asks to register again instead of
 * failing later with "Invalid signature".
 */
export const localKeyMatches = async (userId, serverJwk) => {
  if (!serverJwk) return false;
  const stored = await idbGet(keyId(userId));
  return Boolean(
    stored &&
      stored.publicJwk.n === serverJwk.n &&
      stored.publicJwk.e === serverJwk.e,
  );
};

export const clearSigningKey = (userId) =>
  new Promise((resolve, reject) => {
    openDB()
      .then((db) => {
        const tx = db.transaction(STORE, "readwrite");
        const r = tx.objectStore(STORE).delete(keyId(userId));
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      })
      .catch((err) => reject(err)); // Safely catches errors if openDB fails
  });
