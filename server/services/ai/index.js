const { z } = require("zod");
const { AI_SUGGESTION_KINDS } = require("../../constants");

const TIMEOUT_MS = 15000; // 15 seconds

// What the AI is allowed to answer. The limits match the aiSuggestions model:
// a message longer than 500 characters could not be saved later.
const aiResponseSchema = z.object({
  model: z.string().trim().max(100).optional(),
  flags: z
    .array(
      z.object({
        field: z.string().trim().min(1).max(100),
        message: z.string().trim().min(1).max(500),
      }),
    )
    .max(10),
});

// Rejects when the promise takes longer than `ms` milliseconds.
// Works for every provider, not only for fetch.
const withTimeout = (promise, ms) => {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error("AI request timed out.")),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId));
};

// MOCK PROVIDER (AI1): always the same sample answer. No API key, no network.
// It does not use the input, so the text never depends on what a user typed.
const mockProvider = async () => ({
  model: "mock-1",
  flags: [
    {
      field: "proposedLastName",
      message:
        'The proposed last name "Vukovic" is very close to "Vuković". It may be missing the letter "ć".',
    },
  ],
});

// The real provider is added in story AI3, when we know which one to use.
const PROVIDERS = { mock: mockProvider };

/**
 * The ONLY code that talks to an AI provider.
 * Never throws. If anything goes wrong it returns { available: false, provider }.
 */
const suggest = async (kind, input) => {
  const provider = process.env.AI_PROVIDER || "mock";

  try {
    if (!Object.values(AI_SUGGESTION_KINDS).includes(kind)) {
      throw new Error("Unknown suggestion kind.");
    }
    if (!Object.hasOwn(PROVIDERS, provider)) {
      throw new Error(`AI provider "${provider}" is not set up.`);
    }

    const rawResult = await withTimeout(
      PROVIDERS[provider](kind, input),
      TIMEOUT_MS,
    );

    const parsed = aiResponseSchema.safeParse(rawResult);
    if (!parsed.success) {
      console.error("[AI service] The answer has a wrong shape.");
      return { available: false, provider };
    }

    return {
      available: true,
      provider,
      model: parsed.data.model,
      flags: parsed.data.flags,
    };
  } catch (err) {
    // Only the error message is logged. The input is never logged.
    console.error("[AI service] Not available:", err.message);
    return { available: false, provider };
  }
};

module.exports = { suggest, aiResponseSchema, withTimeout };