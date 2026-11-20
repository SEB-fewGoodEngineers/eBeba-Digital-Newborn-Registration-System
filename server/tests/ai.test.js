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
// ---------------------------------------------------------------------------
// AI3: real providers (fetch is replaced, no real call, no real key)
// ---------------------------------------------------------------------------

const withEnv = async (values, fn) => {
  const before = {};
  for (const key of Object.keys(values)) {
    before[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(values)) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
};

const fakeResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const openAiBody = (content) => ({ choices: [{ message: { content } }] });
const googleBody = (text) => ({
  candidates: [{ content: { parts: [{ text }] } }],
});

const GOOD_ANSWER = JSON.stringify({
  flags: [
    {
      field: "proposedLastName",
      message: 'The name "Vukovic" differs from "Vuković" only by one letter.',
    },
  ],
});
const GOOD_INPUT = { proposedLastName: "Vukovic", motherLastName: "Vuković" };

const ENV = { AI_API_KEY: "secret-test-key", AI_MODEL: "test-model" };

test("openai: a good answer gives a flag, and the key is in the header only", async () => {
  mock.method(globalThis, "fetch", async () =>
    fakeResponse(openAiBody(GOOD_ANSWER)),
  );
  await withEnv({ ...ENV, AI_PROVIDER: "openai" }, async () => {
    const result = await suggest(KIND, GOOD_INPUT);
    assert.strictEqual(result.available, true);
    assert.strictEqual(result.provider, "openai");
    assert.strictEqual(result.model, "test-model");
    assert.strictEqual(result.flags.length, 1);

    const [url, options] = globalThis.fetch.mock.calls[0].arguments;
    assert.ok(url.startsWith("https://api.openai.com/"));
    assert.strictEqual(options.headers.Authorization, "Bearer secret-test-key");
    assert.ok(!url.includes("secret-test-key"));
  });
  mock.restoreAll();
});

test("google: a good answer gives a flag, and the key is not in the URL", async () => {
  mock.method(globalThis, "fetch", async () =>
    fakeResponse(googleBody(GOOD_ANSWER)),
  );
  await withEnv({ ...ENV, AI_PROVIDER: "google" }, async () => {
    const result = await suggest(KIND, GOOD_INPUT);
    assert.strictEqual(result.available, true);
    assert.strictEqual(result.provider, "google");

    const [url, options] = globalThis.fetch.mock.calls[0].arguments;
    assert.ok(url.startsWith("https://generativelanguage.googleapis.com/"));
    assert.ok(!url.includes("secret-test-key"));
    assert.strictEqual(options.headers["x-goog-api-key"], "secret-test-key");
  });
  mock.restoreAll();
});

test("JSON inside text and ``` marks is still read", async () => {
  mock.method(globalThis, "fetch", async () =>
    fakeResponse(openAiBody("Here you go:\n```json\n" + GOOD_ANSWER + "\n```")),
  );
  await withEnv({ ...ENV, AI_PROVIDER: "openai" }, async () => {
    const result = await suggest(KIND, GOOD_INPUT);
    assert.strictEqual(result.available, true);
    assert.strictEqual(result.flags.length, 1);
  });
  mock.restoreAll();
});

test("an answer that is not JSON gives available: false", async () => {
  mock.method(console, "error", () => {});
  mock.method(globalThis, "fetch", async () =>
    fakeResponse(openAiBody("I could not find anything.")),
  );
  await withEnv({ ...ENV, AI_PROVIDER: "openai" }, async () => {
    const result = await suggest(KIND, GOOD_INPUT);
    assert.strictEqual(result.available, false);
  });
  mock.restoreAll();
});

test("an HTTP error gives available: false and the key is not logged", async () => {
  const logged = [];
  mock.method(console, "error", (...args) => logged.push(args.join(" ")));
  mock.method(globalThis, "fetch", async () => fakeResponse({}, 401));
  await withEnv({ ...ENV, AI_PROVIDER: "google" }, async () => {
    const result = await suggest(KIND, GOOD_INPUT);
    assert.strictEqual(result.available, false);
  });
  assert.ok(logged.length > 0);
  assert.ok(!logged.join(" ").includes("secret-test-key"));
  mock.restoreAll();
});

test("without a key nothing is sent and available is false", async () => {
  mock.method(console, "error", () => {});
  mock.method(globalThis, "fetch", async () =>
    fakeResponse(openAiBody(GOOD_ANSWER)),
  );
  await withEnv(
    { AI_PROVIDER: "openai", AI_API_KEY: undefined, AI_MODEL: "test-model" },
    async () => {
      const result = await suggest(KIND, GOOD_INPUT);
      assert.strictEqual(result.available, false);
    },
  );
  assert.strictEqual(globalThis.fetch.mock.calls.length, 0);
  mock.restoreAll();
});

test("input with an extra field (like jmbg) is never sent", async () => {
  mock.method(console, "error", () => {});
  mock.method(globalThis, "fetch", async () =>
    fakeResponse(openAiBody(GOOD_ANSWER)),
  );
  await withEnv({ ...ENV, AI_PROVIDER: "openai" }, async () => {
    const result = await suggest(KIND, { ...GOOD_INPUT, jmbg: "2410026990010" });
    assert.strictEqual(result.available, false);
  });
  assert.strictEqual(globalThis.fetch.mock.calls.length, 0);
  mock.restoreAll();
});

test("flags for other fields are dropped", async () => {
  const answer = JSON.stringify({
    flags: [{ field: "jmbg", message: "Something about a number." }],
  });
  mock.method(globalThis, "fetch", async () =>
    fakeResponse(openAiBody(answer)),
  );
  await withEnv({ ...ENV, AI_PROVIDER: "openai" }, async () => {
    const result = await suggest(KIND, GOOD_INPUT);
    assert.strictEqual(result.available, true);
    assert.deepStrictEqual(result.flags, []);
  });
  mock.restoreAll();
});