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

// ---------------------------------------------------------------------------
// PRIVACY: only these three text fields may ever leave the server.
// ---------------------------------------------------------------------------
const ALLOWED_INPUT_KEYS = [
  "proposedLastName",
  "motherLastName",
  "fatherLastName",
];
const MAX_VALUE_LENGTH = 100;
const PRECHECK_FIELDS = ["proposedLastName"]; // the only field the AI may flag

// Returns a clean copy of the input. Throws if anything else is in it,
// so nothing unexpected is sent to the AI.
const cleanInput = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("The AI input must be an object.");
  }

  const clean = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_INPUT_KEYS.includes(key)) {
      throw new Error(`The field "${key}" must not be sent to the AI.`);
    }
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
      throw new Error(`The value of "${key}" is not allowed.`);
    }
    clean[key] = value.trim();
  }
  return clean;
};

// ---------------------------------------------------------------------------
// The prompt: JSON only, one plain English sentence per flag, no legal advice.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = [
  "You help a government officer check a newborn registration form.",
  "You get a proposed last name and the last names of the parents.",
  "Find near-misses, for example a missing diacritic, a swapped letter or another spelling of the same name.",
  'Answer ONLY with JSON in exactly this shape: {"flags":[{"field":"proposedLastName","message":"..."}]}',
  'The only allowed value for "field" is proposedLastName.',
  "Write exactly one plain English sentence in each message. Say only what is different.",
  "Never say what the law allows or requires. Never give legal advice.",
  'If you find no near-miss, answer {"flags":[]}.',
].join("\n");

// Takes the JSON out of the answer, even if there is text or ``` around it
const parseJsonText = (text) => {
  if (typeof text !== "string") {
    throw new Error("The AI answer is not text.");
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("The AI answer has no JSON.");
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    // The original error is not used: it can contain a part of the answer
    throw new Error("The AI answer is not valid JSON.");
  }
};

// ---------------------------------------------------------------------------
// PROVIDERS
// ---------------------------------------------------------------------------

// MOCK (AI1): always the same sample answer. No key, no network.
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

// OpenAI: Chat Completions with JSON mode.
// The word "JSON" must be in the prompt for JSON mode, and it is.
const askOpenAi = async (apiKey, model, userMessage) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS), // also stops the request itself
  });
  if (!res.ok) throw new Error(`OpenAI answered with status ${res.status}.`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content;
};

// Google Gemini: generateContent. The key goes in a header, never in the URL.
const askGoogle = async (apiKey, model, userMessage) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Google answered with status ${res.status}.`);

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text || "").join("");
};

const ASKERS = { openai: askOpenAi, google: askGoogle };

const makeRealProvider = (providerName) => async (kind, input) => {
  const apiKey = process.env.AI_API_KEY; // only in server/.env
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    throw new Error("AI_API_KEY and AI_MODEL must be set in .env.");
  }

  const clean = cleanInput(input);
  const text = await ASKERS[providerName](
    apiKey,
    model,
    `Data (JSON): ${JSON.stringify(clean)}`,
  );
  const answer = parseJsonText(text);

  // Keep only flags for the field we asked about
  const flags = Array.isArray(answer.flags)
    ? answer.flags.filter((flag) => flag && PRECHECK_FIELDS.includes(flag.field))
    : [];

  return { model, flags };
};

const PROVIDERS = {
  mock: mockProvider,
  openai: makeRealProvider("openai"),
  google: makeRealProvider("google"),
};

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
    // Only the error message is logged. Never the key, the input or the answer.
    console.error("[AI service] Not available:", err.message);
    return { available: false, provider };
  }
};

module.exports = { suggest, aiResponseSchema, withTimeout };