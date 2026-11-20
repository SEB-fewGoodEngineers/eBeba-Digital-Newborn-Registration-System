const { test } = require("node:test");
const assert = require("node:assert");
const { runRuleChecks } = require("../services/ai/rules");
const { updateFlagSchema } = require("../validators/ai");

const registration = {
  proposedFirstName: "Mia",
  proposedLastName: "Petrović",
  residentialAddress: "Demo street 12, Podgorica",
};
const baby = {
  mother: { firstName: "Ana", lastName: "Petrović" },
  father: { firstName: "Marko", lastName: "Petrović" },
};
const applicant = { firstName: "Ana", lastName: "Petrović" };

const fieldsOf = (flags) => flags.map((flag) => flag.field);

test("a good registration has no rule flags", () => {
  const flags = runRuleChecks({ registration, baby, applicant });
  assert.deepStrictEqual(flags, []);
});

test("a missing last name is flagged", () => {
  const flags = runRuleChecks({
    registration: { ...registration, proposedLastName: "" },
    baby,
    applicant,
  });
  assert.deepStrictEqual(fieldsOf(flags), ["proposedLastName"]);
});

test("a missing address is flagged", () => {
  const flags = runRuleChecks({
    registration: { ...registration, residentialAddress: "  " },
    baby,
    applicant,
  });
  assert.deepStrictEqual(fieldsOf(flags), ["residentialAddress"]);
});

test("Vukovic and Vuković are different last names", () => {
  const flags = runRuleChecks({
    registration: { ...registration, proposedLastName: "Vukovic" },
    baby: {
      mother: { firstName: "Ana", lastName: "Vuković" },
      father: { firstName: "Marko", lastName: "Vuković" },
    },
    applicant,
  });
  assert.ok(fieldsOf(flags).includes("proposedLastName"));
});

test("a last name that matches only the mother is not flagged", () => {
  const flags = runRuleChecks({
    registration,
    baby: {
      mother: { firstName: "Ana", lastName: "Petrović" },
      father: { firstName: "Marko", lastName: "Jovanović" },
    },
    applicant,
  });
  assert.ok(!fieldsOf(flags).includes("proposedLastName"));
});

test("with one parent only, a different last name is flagged", () => {
  const flags = runRuleChecks({
    registration: { ...registration, proposedLastName: "Jovanović" },
    baby: { mother: { firstName: "Ana", lastName: "Petrović" } },
    applicant,
  });
  assert.ok(fieldsOf(flags).includes("proposedLastName"));
});

test("an applicant name that matches neither parent is flagged", () => {
  const flags = runRuleChecks({
    registration,
    baby,
    applicant: { firstName: "Ivan", lastName: "Savić" },
  });
  assert.deepStrictEqual(fieldsOf(flags), ["applicantName"]);
});

test("the applicant name ignores capital letters and spaces", () => {
  const flags = runRuleChecks({
    registration,
    baby,
    applicant: { firstName: " MARKO ", lastName: "petrović" },
  });
  assert.deepStrictEqual(flags, []);
});

test("every rule flag has source 'rule' and never talks about the law", () => {
  const flags = runRuleChecks({
    registration: { proposedFirstName: "", proposedLastName: "Savić" },
    baby,
    applicant: { firstName: "Ivan", lastName: "Savić" },
  });
  assert.ok(flags.length >= 3);
  for (const flag of flags) {
    assert.strictEqual(flag.source, "rule");
    assert.ok(!/\blaw\b|legal|allowed|must/i.test(flag.message));
  }
});

test("accepts the decisions 'accepted' and 'dismissed'", () => {
  assert.strictEqual(
    updateFlagSchema.safeParse({ decision: "accepted" }).success,
    true,
  );
  assert.strictEqual(
    updateFlagSchema.safeParse({ decision: "dismissed" }).success,
    true,
  );
});

test("rejects the decision 'pending' and a missing decision", () => {
  assert.strictEqual(
    updateFlagSchema.safeParse({ decision: "pending" }).success,
    false,
  );
  assert.strictEqual(updateFlagSchema.safeParse({}).success, false);
});

test("removes fields the client should not send", () => {
  const result = updateFlagSchema.safeParse({
    decision: "accepted",
    decidedByUserId: "64c000000000000000000001",
  });
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(result.data, { decision: "accepted" });
});