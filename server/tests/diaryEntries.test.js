const { test } = require("node:test");
const assert = require("node:assert");
const {
  createDiaryEntrySchema,
  diaryQuerySchema,
} = require("../validators/diaryEntries");

test("accepts a valid feeding entry", () => {
  const result = createDiaryEntrySchema.safeParse({
    category: "feeding",
    recordedAt: "2026-11-16T08:30:00.000Z",
    details: { method: "bottle", amountMl: 120 },
  });
  assert.strictEqual(result.success, true);
});

test("rejects an unknown category", () => {
  const result = createDiaryEntrySchema.safeParse({
    category: "dancing",
    recordedAt: "2026-11-16T08:30:00.000Z",
  });
  assert.strictEqual(result.success, false);
});

test("rejects a temperature of 60 °C", () => {
  const result = createDiaryEntrySchema.safeParse({
    category: "temperature",
    recordedAt: "2026-11-16T08:30:00.000Z",
    details: { temperatureCelsius: 60 },
  });
  assert.strictEqual(result.success, false);
});

test("accepts valid from and to query dates", () => {
  const result = diaryQuerySchema.safeParse({
    from: "2026-11-16T00:00:00.000Z",
    to: "2026-11-17T00:00:00.000Z",
  });
  assert.strictEqual(result.success, true);
});

test("rejects missing or invalid query dates", () => {
  const result = diaryQuerySchema.safeParse({
    from: "not-a-date",
    to: "2026-11-17T00:00:00.000Z",
  });
  assert.strictEqual(result.success, false);
});
