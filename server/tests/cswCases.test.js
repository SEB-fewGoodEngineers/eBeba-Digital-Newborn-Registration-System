const { test } = require("node:test");
const assert = require("node:assert");
const { notesSchema } = require("../validators/cswCases");

test("rejects CSW case rejection without notes", () => {
  const result = notesSchema.safeParse({});
  assert.strictEqual(result.success, false);
});

test("rejects CSW case rejection with empty notes", () => {
  const result = notesSchema.safeParse({ notes: "   " });
  assert.strictEqual(result.success, false);
});

test("accepts CSW case rejection with valid notes", () => {
  const result = notesSchema.safeParse({ notes: "Incomplete documentation provided by parent." });
  assert.strictEqual(result.success, true);
});

test("removes unknown fields from CSW notes validation", () => {
  const result = notesSchema.safeParse({
    notes: "Valid note.",
    status: "rejected",
    processedByUserId: "fake-user-id",
  });
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(result.data, {
    notes: "Valid note.",
  });
});