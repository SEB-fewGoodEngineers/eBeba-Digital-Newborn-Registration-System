
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
} = require("../validators/medicalRecords");

const { MEDICAL_RECORD_TYPES } = require("../constants");
const mongoose = require("mongoose");
const { canAccessBaby } = require("../middleware/auth");
const { ROLES } = require("../constants");

// Fictional test data. No database connection is needed.
const validRecord = () => ({
  recordType: MEDICAL_RECORD_TYPES.EXAMINATION,
  title: "Routine examination",
  description: "Fictional routine examination note.",
  doctorRecommendations: "Routine follow-up.",
  examinationDate: "2026-11-16T09:00:00.000Z",
});

test("accepts a valid medical record", () => {
  const result = createMedicalRecordSchema.safeParse(
    validRecord(),
  );

  assert.equal(result.success, true);
  assert.ok(result.data.examinationDate instanceof Date);
});

test("rejects a medical record without a title", () => {
  const record = validRecord();
  delete record.title;

  const result = createMedicalRecordSchema.safeParse(record);

  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some(
      (issue) => issue.path.join(".") === "title",
    ),
  );
});

test("rejects an unknown medical record type", () => {
  const result = createMedicalRecordSchema.safeParse({
    ...validRecord(),
    recordType: "unknown_type",
  });

  assert.equal(result.success, false);
});

test("rejects an empty description", () => {
  const result = createMedicalRecordSchema.safeParse({
    ...validRecord(),
    description: "",
  });

  assert.equal(result.success, false);
});

test("rejects an invalid examination date", () => {
  const result = createMedicalRecordSchema.safeParse({
    ...validRecord(),
    examinationDate: "not-a-date",
  });

  assert.equal(result.success, false);
});

test("removes protected fields from the request body", () => {
  const result = createMedicalRecordSchema.safeParse({
    ...validRecord(),
    babyId: "fake-baby-id",
    authorUserId: "fake-user-id",
    entrySource: "pediatrician-entered",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.babyId, undefined);
  assert.equal(result.data.authorUserId, undefined);
  assert.equal(result.data.entrySource, undefined);
});

test("rejects an empty update", () => {
  const result = updateMedicalRecordSchema.safeParse({});

  assert.equal(result.success, false);
});

test("accepts a valid title update", () => {
  const result = updateMedicalRecordSchema.safeParse({
    title: "Updated examination note",
  });

  assert.equal(result.success, true);
});

test("accepts an allergy record", () => {
  const result = createMedicalRecordSchema.safeParse({
    ...validRecord(),
    recordType: MEDICAL_RECORD_TYPES.ALLERGY,
    title: "Food allergy note",
  });

  assert.equal(result.success, true);
});

test("accepts a general note", () => {
  const result = createMedicalRecordSchema.safeParse({
    ...validRecord(),
    recordType: MEDICAL_RECORD_TYPES.GENERAL_NOTE,
    title: "General health note",
  });

  assert.equal(result.success, true);
});

test("allows a parent linked to the baby", () => {
  const parentId = new mongoose.Types.ObjectId();

  const user = {
    _id: parentId,
    role: ROLES.PARENT,
  };

  const baby = {
    authorizedUserIds: [parentId],
  };

  assert.equal(canAccessBaby(user, baby), true);
});

test("blocks a parent who is not linked to the baby", () => {
  const parentId = new mongoose.Types.ObjectId();
  const otherParentId = new mongoose.Types.ObjectId();

  const user = {
    _id: otherParentId,
    role: ROLES.PARENT,
  };

  const baby = {
    authorizedUserIds: [parentId],
  };

  assert.equal(canAccessBaby(user, baby), false);
});
