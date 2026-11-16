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