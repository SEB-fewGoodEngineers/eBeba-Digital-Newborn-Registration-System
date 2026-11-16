const { test } = require("node:test");
const assert = require("node:assert");
const {
  createGrowthMeasurementSchema,
} = require("../validators/growthMeasurements");

test("accepts a valid growth measurement", () => {
  const result = createGrowthMeasurementSchema.safeParse({
    measuredAt: "2026-11-16T00:00:00.000Z",
    weightGrams: 4250,
    heightCm: 54.5,
    headCircumferenceCm: 37.2,
  });
  assert.strictEqual(result.success, true);
});

test("accepts a valid growth measurement without head circumference", () => {
  const result = createGrowthMeasurementSchema.safeParse({
    measuredAt: "2026-11-16T00:00:00.000Z",
    weightGrams: 4250,
    heightCm: 54.5,
  });
  assert.strictEqual(result.success, true);
});

test("rejects a weight of 0", () => {
  const result = createGrowthMeasurementSchema.safeParse({
    measuredAt: "2026-11-16T00:00:00.000Z",
    weightGrams: 0,
    heightCm: 54.5,
  });
  assert.strictEqual(result.success, false);
});
