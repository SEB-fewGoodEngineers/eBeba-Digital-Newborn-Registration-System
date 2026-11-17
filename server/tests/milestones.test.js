const { test } = require("node:test");
const assert = require("node:assert");
const { createMilestoneSchema } = require("../validators/milestones");

test("accepts a valid milestone", () => {
  const result = createMilestoneSchema.safeParse({
    category: "social",
    title: "First smile",
    achievedAt: "2026-11-16T00:00:00.000Z",
    notes: "Smiled at mom.",
  });
  assert.strictEqual(result.success, true);
});

test("rejects a milestone with an empty title", () => {
  const result = createMilestoneSchema.safeParse({
    category: "motor",
    title: "",
    achievedAt: "2026-11-16T00:00:00.000Z",
  });
  assert.strictEqual(result.success, false);
});

test("rejects an unknown milestone category", () => {
  const result = createMilestoneSchema.safeParse({
    category: "superpower",
    title: "Flying",
    achievedAt: "2026-11-16T00:00:00.000Z",
  });
  assert.strictEqual(result.success, false);
});