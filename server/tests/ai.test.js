const { test, mock } = require("node:test");
const assert = require("node:assert");
const {
  suggest,
  aiResponseSchema,
  withTimeout,
} = require("../services/ai");
const { AI_SUGGESTION_KINDS } = require("../constants");

const KIND = AI_SUGGESTION_KINDS.REGISTRATION_PRECHECK;

// Runs a test with a chosen AI_PROVIDER, then puts the old value back.
const withProvider = async (provider, fn) => {
  const before = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = provider;
  try {
    await fn();
  } finally {
    if (before === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = before;
  }
};

test("mock provider returns the fixed sample flag", async () => {
  await withProvider("mock", async () => {
    const result = await suggest(KIND, { proposedLastName: "Vukovic" });
    assert.strictEqual(result.available, true);
    assert.strictEqual(result.provider, "mock");
    assert.strictEqual(result.flags.length, 1);
    assert.strictEqual(result.flags[0].field, "proposedLastName");
  });
});

test("mock answer does not depend on the input", async () => {
  await withProvider("mock", async () => {
    const a = await suggest(KIND, { proposedLastName: "Anything" });
    const b = await suggest(KIND);
    assert.deepStrictEqual(a, b);
  });
});

test("unknown kind returns available: false and does not throw", async () => {
  mock.method(console, "error", () => {});
  await withProvider("mock", async () => {
    const result = await suggest("something_else", {});
    assert.strictEqual(result.available, false);
  });
  mock.restoreAll();
});

test("provider that is not set up returns available: false", async () => {
  mock.method(console, "error", () => {});
  await withProvider("other-provider", async () => {
    const result = await suggest(KIND, {});
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.provider, "other-provider");
  });
  mock.restoreAll();
});

test("schema accepts a valid answer", () => {
  const result = aiResponseSchema.safeParse({
    model: "mock-1",
    flags: [{ field: "proposedLastName", message: "A short sentence." }],
  });
  assert.strictEqual(result.success, true);
});

test("schema rejects a flag without a message", () => {
  const result = aiResponseSchema.safeParse({
    flags: [{ field: "proposedLastName" }],
  });
  assert.strictEqual(result.success, false);
});

test("schema rejects a message longer than 500 characters", () => {
  const result = aiResponseSchema.safeParse({
    flags: [{ field: "proposedLastName", message: "a".repeat(501) }],
  });
  assert.strictEqual(result.success, false);
});

test("schema rejects more than 10 flags", () => {
  const flag = { field: "proposedLastName", message: "A short sentence." };
  const result = aiResponseSchema.safeParse({
    flags: Array.from({ length: 11 }, () => flag),
  });
  assert.strictEqual(result.success, false);
});

test("schema removes unknown fields from a flag", () => {
  const result = aiResponseSchema.safeParse({
    flags: [{ field: "x", message: "y", decision: "accepted" }],
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.flags[0].decision, undefined);
});

test("withTimeout rejects an answer that is too slow", async () => {
  const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 200));
  await assert.rejects(() => withTimeout(slow, 20), /timed out/);
});

test("withTimeout returns a fast answer", async () => {
  const result = await withTimeout(Promise.resolve("ok"), 1000);
  assert.strictEqual(result, "ok");
});