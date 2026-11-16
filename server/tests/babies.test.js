const { test } = require("node:test");
const assert = require("node:assert");

const { createBabySchema } = require("../validators/babies");
const { GENDERS, FAMILY_TYPES } = require("../constants");

const validBirth = {
  gender: GENDERS.MALE,
  birthDateTime: "2026-11-16T08:30:00.000Z",
  placeOfBirth: "Fictional Hospital",
  municipalityOfBirth: "Demo Municipality",
  birthWeightGrams: 3400,
  birthLengthCm: 51,
  familyType: FAMILY_TYPES.TWO_PARENTS,
  mother: {
    firstName: "Demo",
    lastName: "Mother",
    email: "mother@example.test",
  },
  father: {
    firstName: "Demo",
    lastName: "Father",
    email: "father@example.test",
  },
};

test("accepts a valid birth record", () => {
  const result = createBabySchema.safeParse(validBirth);

  assert.strictEqual(result.success, true);
});

test("rejects birth without mother's email", () => {
  const result = createBabySchema.safeParse({
    ...validBirth,
    mother: {
      firstName: "Demo",
      lastName: "Mother",
    },
  });

  assert.strictEqual(result.success, false);
  assert.ok(
    result.error.issues.some(
      (issue) => issue.path.join(".") === "mother.email",
    ),
  );
});

test("rejects an invalid gender", () => {
  const result = createBabySchema.safeParse({
    ...validBirth,
    gender: "X",
  });

  assert.strictEqual(result.success, false);
});

test("requires father for two-parent families", () => {
  const { father, ...birthWithoutFather } = validBirth;

  const result = createBabySchema.safeParse(birthWithoutFather);

  assert.strictEqual(result.success, false);
});

test("accepts a single-parent family without father", () => {
  const { father, ...birthWithoutFather } = validBirth;

  const result = createBabySchema.safeParse({
    ...birthWithoutFather,
    familyType: FAMILY_TYPES.SINGLE_PARENT,
  });

  assert.strictEqual(result.success, true);
});

test("removes fields controlled by the server", () => {
  const result = createBabySchema.safeParse({
    ...validBirth,
    hospitalId: "fake-hospital",
    createdByUserId: "fake-user",
    birthRecordNumber: "fake-number",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.hospitalId, undefined);
  assert.strictEqual(result.data.createdByUserId, undefined);
  assert.strictEqual(result.data.birthRecordNumber, undefined);
});
