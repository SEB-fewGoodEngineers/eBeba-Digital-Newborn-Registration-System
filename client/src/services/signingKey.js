const DB_NAME = "ebeba-signing";
const STORE = "keys";
const KEY_ID = "officer-signing-key";

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
export const registerSigningKey = async (passphrase) => {
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

  await idbPut(KEY_ID, {
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
export const signApprovalPayload = async (passphrase, payload) => {
  const stored = await idbGet(KEY_ID);
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

export const hasSigningKey = async () => Boolean(await idbGet(KEY_ID));

export const clearSigningKey = () =>
  new Promise((resolve, reject) => {
    openDB()
      .then((db) => {
        const tx = db.transaction(STORE, "readwrite");
        const r = tx.objectStore(STORE).delete(KEY_ID);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      })
      .catch((err) => reject(err)); // Safely catches errors if openDB fails
  });
