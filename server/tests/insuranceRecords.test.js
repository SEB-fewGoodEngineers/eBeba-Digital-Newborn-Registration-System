const { test } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const {
  issueInsuranceSchema,
  assignPediatricianSchema,
} = require("../validators/insuranceRecords");

const validId = new mongoose.Types.ObjectId().toString();

test("accepts a valid insured parent ID when issuing insurance", () => {
  const result = issueInsuranceSchema.safeParse({
    insuredParentId: validId,
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.insuredParentId, validId);
});

test("rejects issuing insurance without insuredParentId", () => {
  const result = issueInsuranceSchema.safeParse({});
  assert.strictEqual(result.success, false);
});

test("accepts a valid pediatricianId when assigning a pediatrician", () => {
  const result = assignPediatricianSchema.safeParse({
    pediatricianId: validId,
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.pediatricianId, validId);
});

test("rejects assigning a pediatrician without pediatricianId", () => {
  const result = assignPediatricianSchema.safeParse({});
  assert.strictEqual(result.success, false);
});

test("rejects assigning a pediatrician with an invalid ObjectId", () => {
  const result = assignPediatricianSchema.safeParse({
    pediatricianId: "invalid-id-123",
  });
  assert.strictEqual(result.success, false);
});

test("removes unknown fields when assigning a pediatrician", () => {
  const result = assignPediatricianSchema.safeParse({
    pediatricianId: validId,
    assignedPediatricianId: "hacker-id",
    role: "admin",
  });
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(result.data, {
    pediatricianId: validId,
  });
});