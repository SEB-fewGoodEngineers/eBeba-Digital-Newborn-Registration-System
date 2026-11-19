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
