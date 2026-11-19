const { test } = require("node:test");
const assert = require("node:assert");
const { notesSchema } = require("../validators/cswCases");

test("rejects CSW case without notes", () => {
  const result = notesSchema.safeParse({});
  assert.strictEqual(result.success, false);
});

test("accepts CSW case with valid notes", () => {
  const result = notesSchema.safeParse({ notes: "Missing documentation." });
  assert.strictEqual(result.success, true);
});
test("rejects notes that are only spaces", () => {
  const result = notesSchema.safeParse({ notes: "    " });
  assert.strictEqual(result.success, false);
});

test("rejects notes longer than 1000 characters", () => {
  const result = notesSchema.safeParse({ notes: "a".repeat(1001) });
  assert.strictEqual(result.success, false);
});

test("cleans the notes and removes other fields like status", () => {
  const result = notesSchema.safeParse({
    notes: "  Missing papers.  ",
    status: "completed",
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.notes, "Missing papers.");
  assert.strictEqual(result.data.status, undefined);
});
