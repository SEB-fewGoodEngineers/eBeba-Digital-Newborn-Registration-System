const { test } = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");

// Zod šema za validaciju odluke o zastavici (AI2 / aiSuggestions)
const updateFlagDecisionSchema = z.object({
  decision: z.enum(["accepted", "dismissed"]),
});

// Zod šema za validaciju odgovora AI provajdera (AI1 / AI3)
const aiResponseSchema = z.object({
  model: z.string().optional(),
  flags: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
    }),
  ),
});

test("updateFlagDecisionSchema prihvata ispravnu odluku (accepted)", () => {
  const result = updateFlagDecisionSchema.safeParse({ decision: "accepted" });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.decision, "accepted");
});

test("updateFlagDecisionSchema prihvata ispravnu odluku (dismissed)", () => {
  const result = updateFlagDecisionSchema.safeParse({ decision: "dismissed" });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.decision, "dismissed");
});

test("updateFlagDecisionSchema odbija nevažeću odluku (npr. maybe)", () => {
  const result = updateFlagDecisionSchema.safeParse({ decision: "maybe" });
  assert.strictEqual(result.success, false);
});

test("aiResponseSchema validira ispravan format odgovora AI provajdera", () => {
  const validPayload = {
    model: "mock-1",
    flags: [
      {
        field: "proposedLastName",
        message: "The proposed last name may be missing a diacritic character.",
      },
    ],
  };

  const result = aiResponseSchema.safeParse(validPayload);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.model, "mock-1");
  assert.strictEqual(result.data.flags.length, 1);
});

test("aiResponseSchema odbija neispravan format odgovora AI provajdera (nedostaje message)", () => {
  const invalidPayload = {
    model: "mock-1",
    flags: [
      {
        field: "proposedLastName",
      },
    ],
  };

  const result = aiResponseSchema.safeParse(invalidPayload);
  assert.strictEqual(result.success, false);
});