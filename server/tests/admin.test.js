const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  createStaffSchema,
  updateStaffStatusSchema,
  isStaffInstitutionMatch,
  auditLogQuerySchema,
} = require("../validators/admin");

const { ROLES, INSTITUTION_TYPES } = require("../constants");

const validStaff = {
  firstName: "Demo",
  lastName: "Employee",
  email: "demo.employee@example.com",
  password: "DemoPass123",
  role: ROLES.HOSPITAL_STAFF,
  institutionId: new mongoose.Types.ObjectId().toString(),
};

test("accepts valid staff user data", () => {
  const result = createStaffSchema.safeParse(validStaff);
  assert.equal(result.success, true);
});

test("rejects a parent role for staff creation", () => {
  const result = createStaffSchema.safeParse({
    ...validStaff,
    role: ROLES.PARENT,
  });

  assert.equal(result.success, false);
});

test("rejects a short password", () => {
  const result = createStaffSchema.safeParse({
    ...validStaff,
    password: "123",
  });

  assert.equal(result.success, false);
});

test("rejects an invalid institution ID", () => {
  const result = createStaffSchema.safeParse({
    ...validStaff,
    institutionId: "invalid",
  });

  assert.equal(result.success, false);
});

test("removes fields controlled by the server", () => {
  const result = createStaffSchema.safeParse({
    ...validStaff,
    isActive: false,
    hashedPassword: "fake-hash",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.isActive, undefined);
  assert.equal(result.data.hashedPassword, undefined);
});

test("accepts a matching institution type", () => {
  const institution = {
    type: INSTITUTION_TYPES.HOSPITAL,
    isActive: true,
  };

  assert.equal(
    isStaffInstitutionMatch(ROLES.HOSPITAL_STAFF, institution),
    true,
  );
});

test("rejects an institution with the wrong type", () => {
  const institution = {
    type: INSTITUTION_TYPES.CSW,
    isActive: true,
  };

  assert.equal(
    isStaffInstitutionMatch(ROLES.HOSPITAL_STAFF, institution),
    false,
  );
});

test("rejects an inactive institution", () => {
  const institution = {
    type: INSTITUTION_TYPES.HOSPITAL,
    isActive: false,
  };

  assert.equal(
    isStaffInstitutionMatch(ROLES.HOSPITAL_STAFF, institution),
    false,
  );
});

test("accepts a boolean account status", () => {
  const result = updateStaffStatusSchema.safeParse({
    isActive: false,
  });

  assert.equal(result.success, true);
});

test("rejects a non-boolean account status", () => {
  const result = updateStaffStatusSchema.safeParse({
    isActive: "false",
  });

  assert.equal(result.success, false);
});

// A4 - AUDIT LOG QUERY VALIDATION

test("audit logs accept an empty filter", () => {
  const result = auditLogQuerySchema.safeParse({});
  assert.equal(result.success, true);
});

test("audit logs accept a valid action", () => {
  const result = auditLogQuerySchema.safeParse({
    action: "user.create",
  });
  assert.equal(result.success, true);
});

test("audit logs reject an empty action", () => {
  const result = auditLogQuerySchema.safeParse({
    action: "",
  });
  assert.equal(result.success, false);
});

test("audit logs reject an invalid action type", () => {
  const result = auditLogQuerySchema.safeParse({
    action: { $ne: "user.create" },
  });
  assert.equal(result.success, false);
});
