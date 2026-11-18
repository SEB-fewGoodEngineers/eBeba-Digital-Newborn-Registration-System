const { z } = require("zod");
const { AI_SUGGESTION_KINDS } = require("../../constants");

// Zod šema za validaciju odgovora AI provajdera
const aiResponseSchema = z.object({
  model: z.string().optional(),
  flags: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
    }),
  ),
});

/**
 * AI1 & AI3: Jedino mesto koje komunicira sa AI provajderom.
 * Podržava AI_PROVIDER=mock (AI1) i AI_PROVIDER=openai (AI3).
 */
const suggest = async (kind, input) => {
  const provider = process.env.AI_PROVIDER || "mock";
  const timeoutMs = 15000; // Tajmaut od 15 sekundi

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let rawResult;

    if (provider === "mock") {
      // AI1: Mock provajder sa fiksnim primerom
      rawResult = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            model: "mock-1",
            flags: [
              {
                field: "proposedLastName",
                message: `The proposed last name "${input.proposedLastName}" is very close to the parents' last name. It may be missing a diacritic character like "ć".`,
              },
            ],
          });
        }, 200);
      });
    } else {
      // AI3: Pravi provajder (konfiguriše se preko .env)
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey) {
        throw new Error("AI API key is missing in environment variables.");
      }

      const prompt = `You are a strict data validation assistant for a newborn registration system. 
Analyze the following synthetic input data and return ONLY a valid JSON object with a "flags" array. Each flag must contain "field" and a single plain-English sentence "message" explaining the difference or issue. No markdown, no extra text.
Input: ${JSON.stringify(input)}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI provider error: ${response.statusText}`);
      }

      const data = await response.json();
      rawResult = JSON.parse(data.choices[0].message.content);
      rawResult.model = process.env.AI_MODEL || "gpt-4o-mini";
    }

    clearTimeout(timeoutId);

    // Provera strukture odgovora pomoću Zod šeme
    const parsed = aiResponseSchema.safeParse(rawResult);
    if (!parsed.success) {
      console.error("[AI Service] Invalid response shape from AI provider", parsed.error);
      return { available: false, provider };
    }

    return {
      available: true,
      provider,
      model: parsed.data.model,
      flags: parsed.data.flags,
    };
  } catch (err) {
    console.error("[AI Service error or timeout]:", err.message);
    return { available: false, provider };
  }
};

module.exports = { suggest };

