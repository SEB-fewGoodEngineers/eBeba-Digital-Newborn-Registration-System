const { test } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { issueInsuranceSchema } = require("../validators/insuranceRecords");

const validParentId = new mongoose.Types.ObjectId().toString();

test("accepts a valid insured parent ID when issuing insurance", () => {
  const result = issueInsuranceSchema.safeParse({
    insuredParentId: validParentId,
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.insuredParentId, validParentId);
});

test("rejects issuing insurance without insuredParentId", () => {
  const result = issueInsuranceSchema.safeParse({});
  assert.strictEqual(result.success, false);
});

test("rejects issuing insurance with an invalid MongoDB ObjectId", () => {
  const result = issueInsuranceSchema.safeParse({
    insuredParentId: "not-a-valid-object-id",
  });
  assert.strictEqual(result.success, false);
});

test("removes server-controlled fields from insurance issue request", () => {
  const result = issueInsuranceSchema.safeParse({
    insuredParentId: validParentId,
    status: "card_issued",
    policyNumber: "POL-DEMO-123456",
    fundBranchId: new mongoose.Types.ObjectId().toString(),
  });
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(result.data, {
    insuredParentId: validParentId,
  });
});