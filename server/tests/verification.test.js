const { test } = require("node:test");
const assert = require("node:assert");
const {
  buildVerificationAnswer,
} = require("../services/documents/verification");

const certificate = {
  _id: "64e000000000000000000001",
  babyId: "64b000000000000000000001",
  certificateNumber: "CERT-DEMO-000001",
  jmbg: "2410026990010",
  verificationCode: "11111111-2222-3333-4444-555555555555",
  issuedAt: new Date("2026-10-30T09:00:00.000Z"),
  isDemo: true,
};

test("a real certificate gives valid, document type and issue date", () => {
  assert.deepStrictEqual(buildVerificationAnswer(certificate), {
    valid: true,
    documentType: "registration_certificate",
    issueDate: "2026-10-30T09:00:00.000Z",
  });
});

test("the answer has no names and no numbers", () => {
  const text = JSON.stringify(buildVerificationAnswer(certificate));
  assert.ok(!text.includes(certificate.jmbg));
  assert.ok(!text.includes(certificate.certificateNumber));
  assert.ok(!text.includes(certificate.verificationCode));
  assert.ok(!text.includes(certificate.babyId));
});

test("the answer has exactly three fields", () => {
  const keys = Object.keys(buildVerificationAnswer(certificate)).sort();
  assert.deepStrictEqual(keys, ["documentType", "issueDate", "valid"]);
});

test("no certificate gives only valid: false", () => {
  assert.deepStrictEqual(buildVerificationAnswer(null), { valid: false });
  assert.deepStrictEqual(buildVerificationAnswer(undefined), { valid: false });
});