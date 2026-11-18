// Tests for the parts of the shared stubs that are already final.
// Service owners: add tests here (or in your own file) when you make the stubs real.
const { test } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const { generateJmbg } = require("../services/workflow");

const { canAccessBaby } = require("../middleware/auth");
const workflow = require("../services/workflow");
const ai = require("../services/ai");
const { ROLES } = require("../constants");

const parentId = new mongoose.Types.ObjectId();
const baby = { authorizedUserIds: [parentId] };

test("canAccessBaby: a linked parent gets access", () => {
  assert.strictEqual(
    canAccessBaby({ _id: parentId, role: ROLES.PARENT }, baby),
    true,
  );
});

test("canAccessBaby: another parent does not", () => {
  const other = { _id: new mongoose.Types.ObjectId(), role: ROLES.PARENT };
  assert.strictEqual(canAccessBaby(other, baby), false);
});

test("generateJmbg: 13 digits that start with DDMMYYY", () => {
  const jmbg = generateJmbg(new Date("2026-11-16T00:00:00Z"), "Podgorica", "M");
  assert.strictEqual(jmbg.length, 13);
  assert.strictEqual(jmbg.slice(0, 7), "1611026");
});

test("generateNumber: prefix + DEMO", () => {
  assert.match(workflow.generateNumber("SC"), /^SC-DEMO-[0-9A-F]{6}$/);
});

test("transition: changes the status and adds history", () => {
  const doc = { status: "pending", statusHistory: [] };
  workflow.transition(doc, "approved", { _id: parentId }, "ok");
  assert.strictEqual(doc.status, "approved");
  assert.deepStrictEqual(
    { from: doc.statusHistory[0].from, to: doc.statusHistory[0].to },
    { from: "pending", to: "approved" },
  );
});

test("ai.suggest (mock): returns the final result shape", async () => {
  const result = await ai.suggest("registration_precheck", {});
  assert.strictEqual(typeof result.available, "boolean");
  assert.ok(Array.isArray(result.flags));
  for (const flag of result.flags) {
    assert.strictEqual(typeof flag.field, "string");
    assert.strictEqual(typeof flag.message, "string");
  }
});
