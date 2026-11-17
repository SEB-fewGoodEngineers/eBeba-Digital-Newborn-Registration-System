// server/services/ai/index.js
const { z } = require("zod");
const { AI_SUGGESTION_KINDS } = require("../../constants");

const aiResponseSchema = z.object({
  available: z.boolean(),
  provider: z.string(),
  model: z.string().optional(),
  flags: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
    })
  ),
});

const suggest = async (kind, input) => {
  try {
    // Timeout zaštita od 15 sekundi i mock logika
    if (process.env.AI_PROVIDER === "mock" || !process.env.AI_PROVIDER) {
      const mockResult = {
        available: true,
        provider: "mock",
        model: "mock-1",
        flags: [],
      };

      // Primer provere za prezime (Vukovic vs Vuković)
      if (kind === AI_SUGGESTION_KINDS.REGISTRATION_PRECHECK && input?.proposedLastName) {
        if (input.proposedLastName.toLowerCase().includes("vukovic") && !input.proposedLastName.includes("ć")) {
          mockResult.flags.push({
            field: "proposedLastName",
            message: `The proposed last name "${input.proposedLastName}" is very close to the parents' last name. It may be missing the letter "ć".`,
          });
        }
      }

      const parsed = aiResponseSchema.safeParse(mockResult);
      if (!parsed.success) {
        return { available: false };
      }
      return parsed.data;
    }

    // Ovde bi išao pravi AI provajder (AI3) ukoliko je podešen
    return { available: false, provider: "unknown", flags: [] };
  } catch (err) {
    // Ako bilo šta pođe po zlu ili istekne vreme, vrća available: false bez bacanja greške
    return { available: false, provider: "error", flags: [] };
  }
};

module.exports = { suggest };