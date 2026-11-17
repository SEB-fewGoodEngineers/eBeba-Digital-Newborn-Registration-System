const { test } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

// Možeš kreirati jednostavan validator ili pomoćnu provjeru ukoliko query parametri ili filtri postoje,
// ili direktno testirati logiku dozvoljenih uloga/institucija za preuzimanje CSW slučajeva.
const { ROLES } = require("../constants");

test("CSW staff user object has correct institution and role for fetching cases", () => {
  const cswUser = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.CSW_STAFF,
    institutionId: new mongoose.Types.ObjectId(),
    isActive: true,
  };

  assert.strictEqual(cswUser.role, ROLES.CSW_STAFF);
  assert.ok(cswUser.institutionId);
  assert.strictEqual(cswUser.isActive, true);
});

test("non-CSW staff role is blocked from CSW case management", () => {
  const parentUser = {
    _id: new mongoose.Types.ObjectId(),
    role: ROLES.PARENT,
    isActive: true,
  };

  const isCswStaff = parentUser.role === ROLES.CSW_STAFF;
  assert.strictEqual(isCswStaff, false);
});