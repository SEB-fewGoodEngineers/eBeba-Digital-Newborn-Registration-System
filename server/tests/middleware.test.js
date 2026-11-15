const { test } = require("node:test");
const assert = require("node:assert");
const { z } = require("zod");

const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const errorHandler = require("../middleware/errorHandler");
const { fakeRes } = require("./helpers");

const schema = z.object({ name: z.string().min(1) });

test("validate replaces req.body with clean data", () => {
  const req = { body: { name: "Luka", extra: "removed" } };
  let called = false;
  validate(schema)(req, fakeRes(), () => {
    called = true;
  });
  assert.strictEqual(called, true);
  assert.deepStrictEqual(req.body, { name: "Luka" });
});

test("validate responds 400 with details for a bad body", () => {
  const res = fakeRes();
  validate(schema)({ body: { name: "" } }, res, () =>
    assert.fail("next should not run"),
  );
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.details[0].field, "name");
});

test("asyncHandler passes async errors to next", async () => {
  const boom = new Error("boom");
  let received;
  await asyncHandler(async () => {
    throw boom;
  })({}, fakeRes(), (err) => {
    received = err;
  });
  assert.strictEqual(received, boom);
});

test("errorHandler hides unknown errors behind a 500", () => {
  const res = fakeRes();
  const originalError = console.error;
  console.error = () => {}; // keep the test output clean
  errorHandler(new Error("secret database detail"), {}, res, () => {});
  console.error = originalError;
  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(res.body.err, "Something went wrong.");
});

test("errorHandler turns a duplicate key into 409", () => {
  const res = fakeRes();
  errorHandler({ code: 11000 }, {}, res, () => {});
  assert.strictEqual(res.statusCode, 409);
});
