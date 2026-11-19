const { test } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const { canAccessBaby } = require("../middleware/auth");
const { ROLES } = require("../constants");

const parentId = new mongoose.Types.ObjectId();
const otherParentId = new mongoose.Types.ObjectId();

const pediatricianId = new mongoose.Types.ObjectId();
const otherPediatricianId = new mongoose.Types.ObjectId();

const hospitalId = new mongoose.Types.ObjectId();
const otherHospitalId = new mongoose.Types.ObjectId();

const cswInstitutionId = new mongoose.Types.ObjectId();
const otherCswInstitutionId = new mongoose.Types.ObjectId();

const fundBranchId = new mongoose.Types.ObjectId();
const otherFundBranchId = new mongoose.Types.ObjectId();

const baby = {
  _id: new mongoose.Types.ObjectId(),
  authorizedUserIds: [parentId],
  assignedPediatricianId: pediatricianId,
  hospitalId,
};

const records = {
  cswCase: {
    babyId: baby._id,
    cswInstitutionId,
  },
  insuranceRecord: {
    babyId: baby._id,
    fundBranchId,
  },
};

// PARENT ACCESS

test("parent can access a linked baby", () => {
  const user = {
    _id: parentId,
    role: ROLES.PARENT,
  };

  assert.strictEqual(canAccessBaby(user, baby), true);
});

test("parent cannot access another parent's baby", () => {
  const user = {
    _id: otherParentId,
    role: ROLES.PARENT,
  };

  assert.strictEqual(canAccessBaby(user, baby), false);
});

// PEDIATRICIAN ACCESS

test("assigned pediatrician can access the baby", () => {
  const user = {
    _id: pediatricianId,
    role: ROLES.PEDIATRICIAN,
  };

  assert.strictEqual(canAccessBaby(user, baby), true);
});

test("another pediatrician cannot access the baby", () => {
  const user = {
    _id: otherPediatricianId,
    role: ROLES.PEDIATRICIAN,
  };

  assert.strictEqual(canAccessBaby(user, baby), false);
});

// HOSPITAL STAFF ACCESS

test("hospital staff can access their hospital's baby", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.HOSPITAL_STAFF,
    institutionId: hospitalId,
  };

  assert.strictEqual(canAccessBaby(user, baby), true);
});

test("hospital staff cannot access another hospital's baby", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.HOSPITAL_STAFF,
    institutionId: otherHospitalId,
  };

  assert.strictEqual(canAccessBaby(user, baby), false);
});

// MINISTRY OF INTERIOR ACCESS

test("MoI staff can access any existing baby", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.MOI_STAFF,
  };

  assert.strictEqual(canAccessBaby(user, baby), true);
});

test("MoI staff cannot access a missing baby", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.MOI_STAFF,
  };

  assert.strictEqual(canAccessBaby(user, null), false);
});

// SOCIAL WORK CENTER ACCESS

test("CSW staff can access a baby assigned to their institution", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.CSW_STAFF,
    institutionId: cswInstitutionId,
  };

  assert.strictEqual(canAccessBaby(user, baby, records), true);
});

test("CSW staff cannot access another institution's case", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.CSW_STAFF,
    institutionId: otherCswInstitutionId,
  };

  assert.strictEqual(canAccessBaby(user, baby, records), false);
});

test("CSW staff cannot access a baby without a CSW case", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.CSW_STAFF,
    institutionId: cswInstitutionId,
  };

  assert.strictEqual(canAccessBaby(user, baby, {}), false);
});

// HEALTH INSURANCE ACCESS

test("health insurance staff can access their institution's record", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.HEALTH_INSURANCE_STAFF,
    institutionId: fundBranchId,
  };

  assert.strictEqual(canAccessBaby(user, baby, records), true);
});

test("health insurance staff cannot access another fund branch", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.HEALTH_INSURANCE_STAFF,
    institutionId: otherFundBranchId,
  };

  assert.strictEqual(canAccessBaby(user, baby, records), false);
});

test("health insurance staff cannot access without an insurance record", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.HEALTH_INSURANCE_STAFF,
    institutionId: fundBranchId,
  };

  assert.strictEqual(canAccessBaby(user, baby, {}), false);
});

// ADMIN ACCESS

test("admin cannot access baby data", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.ADMIN,
  };

  assert.strictEqual(canAccessBaby(user, baby), false);
});

test("admin cannot access baby data even with an institution", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.ADMIN,
    institutionId: hospitalId,
  };

  assert.strictEqual(canAccessBaby(user, baby), false);
});

// UNKNOWN AND INVALID USERS

test("unknown role cannot access baby data", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: "unknown_role",
  };

  assert.strictEqual(canAccessBaby(user, baby), false);
});

test("missing user cannot access baby data", () => {
  assert.strictEqual(canAccessBaby(null, baby), false);
});

test("parent without authorized user IDs cannot access baby", () => {
  const user = {
    _id: parentId,
    role: ROLES.PARENT,
  };

  const babyWithoutParents = {
    ...baby,
    authorizedUserIds: [],
  };

  assert.strictEqual(canAccessBaby(user, babyWithoutParents), false);
});

test("staff without an institution cannot access a hospital baby", () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.HOSPITAL_STAFF,
  };

  assert.strictEqual(canAccessBaby(user, baby), false);
});
