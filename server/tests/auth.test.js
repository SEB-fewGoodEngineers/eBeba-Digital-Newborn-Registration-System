const { test } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");

const { signUpSchema, signInSchema } = require("../validators/auth");
const { requireRole } = require("../middleware/auth");
const { createToken } = require("../services/tokens");
const { ROLES } = require("../constants");
const { fakeRes } = require("./helpers");

test("sign-up accepts a valid body and cleans the email", () => {
  const result = signUpSchema.safeParse({
    firstName: " Ana ",
    lastName: "Vuković",
    email: "  Ana.Vukovic@Example.ME ",
    password: "lozinka123",
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.email, "ana.vukovic@example.me");
  assert.strictEqual(result.data.firstName, "Ana");
});

test("sign-up removes fields that are not in the schema, like role", () => {
  const result = signUpSchema.safeParse({
    firstName: "Ana",
    lastName: "Vuković",
    email: "ana@example.me",
    password: "lozinka123",
    role: "admin",
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.role, undefined);
});

test("sign-up rejects a short password and a bad email", () => {
  const result = signUpSchema.safeParse({
    firstName: "Ana",
    lastName: "Vuković",
    email: "not-an-email",
    password: "short",
  });
  assert.strictEqual(result.success, false);
  const fields = result.error.issues.map((i) => i.path.join("."));
  assert.ok(fields.includes("email"));
  assert.ok(fields.includes("password"));
});

test("sign-in requires a password", () => {
  const result = signInSchema.safeParse({
    email: "ana@example.me",
    password: "",
  });
  assert.strictEqual(result.success, false);
});

test("requireRole lets the right role through", () => {
  let called = false;
  const req = { user: { role: ROLES.MOI_STAFF } };
  requireRole(ROLES.MOI_STAFF)(req, fakeRes(), () => {
    called = true;
  });
  assert.strictEqual(called, true);
});

test("requireRole blocks other roles with 403", () => {
  let called = false;
  const res = fakeRes();
  requireRole(ROLES.MOI_STAFF)({ user: { role: ROLES.PARENT } }, res, () => {
    called = true;
  });
  assert.strictEqual(called, false);
  assert.strictEqual(res.statusCode, 403);
  assert.ok(res.body.err);
});

test("tokens hold only _id and role, and expire after 8 hours", () => {
  process.env.JWT_SECRET = "test-secret";
  const token = createToken({
    _id: "abc123",
    role: ROLES.PARENT,
    firstName: "Ana",
  });
  const decoded = jwt.verify(token, "test-secret");
  assert.deepStrictEqual(Object.keys(decoded.payload).sort(), ["_id", "role"]);
  assert.strictEqual(decoded.exp - decoded.iat, 8 * 60 * 60);
});
