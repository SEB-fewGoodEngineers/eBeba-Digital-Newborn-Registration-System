const { test } = require("node:test");
const assert = require("node:assert");
const {
  createRegistrationSchema,
  updateRegistrationSchema,
} = require("../validators/registrations");

const validBody = {
  babyId: "65f0c2e9b8b3c2a1d4e5f6a7", // 24 hex chars = valid ObjectId
  proposedFirstName: "Luka",
  proposedLastName: "Vuković",
  residentialAddress: "Ulica slobode 12, Podgorica",
  municipality: "Podgorica",
};

test("accepts a valid application and cleans the names", () => {
  const result = createRegistrationSchema.safeParse({
    ...validBody,
    proposedFirstName: "  Luka  ",
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.proposedFirstName, "Luka");
});

test("strips fields the server owns (status, submittedByUserId, role)", () => {
  const result = createRegistrationSchema.safeParse({
    ...validBody,
    status: "approved",
    submittedByUserId: "someone",
    role: "admin",
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.status, undefined);
  assert.strictEqual(result.data.submittedByUserId, undefined);
  assert.strictEqual(result.data.role, undefined);
});

test("rejects an empty last name", () => {
  const result = createRegistrationSchema.safeParse({
    ...validBody,
    proposedLastName: "   ",
  });
  assert.strictEqual(result.success, false);
  const fields = result.error.issues.map((i) => i.path.join("."));
  assert.ok(fields.includes("proposedLastName"));
});

test("rejects a bad babyId", () => {
  const result = createRegistrationSchema.safeParse({
    ...validBody,
    babyId: "not-an-id",
  });
  assert.strictEqual(result.success, false);
  assert.ok(result.error.issues.some((i) => i.path[0] === "babyId"));
});

test("update schema has no babyId (a resubmit cannot move the baby)", () => {
  const result = updateRegistrationSchema.safeParse({
    ...validBody,
    babyId: "65f0c2e9b8b3c2a1d4e5f6a7",
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.babyId, undefined);
});

const { listRegistrationsQuerySchema } = require("../validators/registrations");

test("list query: defaults to pending when no status is given", () => {
  const result = listRegistrationsQuerySchema.safeParse({});
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.status, "pending");
});

test("list query: accepts a known status", () => {
  const result = listRegistrationsQuerySchema.safeParse({ status: "approved" });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.status, "approved");
});

test("list query: rejects an unknown status (blocks $ne and friends)", () => {
  for (const bad of ["all", "$ne", "pending; DROP", "", "Pending"]) {
    const result = listRegistrationsQuerySchema.safeParse({ status: bad });
    assert.strictEqual(
      result.success,
      false,
      `should reject status=${JSON.stringify(bad)}`,
    );
  }
});

test("list query: strips extra query params", () => {
  const result = listRegistrationsQuerySchema.safeParse({
    status: "pending",
    admin: "true",
    submittedByUserId: "someone-else",
  });
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(Object.keys(result.data), ["status"]);
});

const { reviewDecisionSchema } = require("../validators/registrations");

test("return/reject: requires reviewerNotes", () => {
  const result = reviewDecisionSchema.safeParse({});
  assert.strictEqual(result.success, false);
  assert.ok(
    result.error.issues.some((i) => i.path[0] === "reviewerNotes"),
  );
});

test("return/reject: accepts a real note and trims it", () => {
  const result = reviewDecisionSchema.safeParse({
    reviewerNotes: "  Please add the diacritic.  ",
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.reviewerNotes, "Please add the diacritic.");
});

test("return/reject: strips unknown fields like status or reviewerId", () => {
  const result = reviewDecisionSchema.safeParse({
    reviewerNotes: "Fix the address.",
    status: "approved",
    reviewedByUserId: "someone",
  });
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(Object.keys(result.data), ["reviewerNotes"]);
});

test("return/reject: rejects a too-long note (matches model maxlength)", () => {
  const result = reviewDecisionSchema.safeParse({
    reviewerNotes: "x".repeat(1001),
  });
  assert.strictEqual(result.success, false);
});