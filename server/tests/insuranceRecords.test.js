const { test } = require("node:test");
const assert = require("node:assert");
const { issueInsuranceSchema } = require("../validators/insuranceRecords");

test("rejects issuing insurance without insuredParentId", () => {
  const result = issueInsuranceSchema.safeParse({});
  assert.strictEqual(result.success, false);
});

test("accepts valid insuredParentId", () => {
  const result = issueInsuranceSchema.safeParse({
    insuredParentId: "507f1f77bcf86cd799439011",
  });
  assert.strictEqual(result.success, true);
});