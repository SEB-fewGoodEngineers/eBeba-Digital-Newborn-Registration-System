const { test, mock } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const AuditLog = require("../models/AuditLog");
const audit = require("../services/audit");

test("audit.log saves an audit record", async () => {
  const actorId = new mongoose.Types.ObjectId();
  const documentId = new mongoose.Types.ObjectId();

  const createMock = mock.method(AuditLog, "create", async (data) => data);

  try {
    await audit.log({
      actor: {
        _id: actorId,
        role: "hospital_staff",
      },
      action: "baby.create",
      targetCollection: "babies",
      targetDocumentId: documentId,
      changes: {
        before: null,
        after: { gender: "female" },
      },
    });

    assert.equal(createMock.mock.callCount(), 1);

    const savedData = createMock.mock.calls[0].arguments[0];

    assert.deepEqual(savedData, {
      actorUserId: actorId,
      actorRole: "hospital_staff",
      action: "baby.create",
      targetCollection: "babies",
      targetDocumentId: documentId,
      changes: {
        before: null,
        after: { gender: "female" },
      },
    });
  } finally {
    createMock.mock.restore();
  }
});

test("audit.log works without optional changes", async () => {
  const createMock = mock.method(AuditLog, "create", async (data) => data);

  try {
    await audit.log({
      actor: {
        _id: new mongoose.Types.ObjectId(),
        role: "parent",
      },
      action: "baby.link",
      targetCollection: "babies",
      targetDocumentId: new mongoose.Types.ObjectId(),
    });

    assert.equal(createMock.mock.callCount(), 1);

    const savedData = createMock.mock.calls[0].arguments[0];

    assert.equal(savedData.action, "baby.link");
    assert.equal(savedData.changes, undefined);
  } finally {
    createMock.mock.restore();
  }
});

test("audit.log does not throw when saving fails", async () => {
  const createMock = mock.method(AuditLog, "create", async () => {
    throw new Error("Database error");
  });

  const errorMock = mock.method(console, "error", () => {});

  try {
    await assert.doesNotReject(
      audit.log({
        actor: {
          _id: new mongoose.Types.ObjectId(),
          role: "hospital_staff",
        },
        action: "baby.create",
        targetCollection: "babies",
        targetDocumentId: new mongoose.Types.ObjectId(),
      }),
    );

    assert.equal(createMock.mock.callCount(), 1);
    assert.equal(errorMock.mock.callCount(), 1);

    assert.equal(
      errorMock.mock.calls[0].arguments[0],
      "Failed to save audit log:",
    );
  } finally {
    createMock.mock.restore();
    errorMock.mock.restore();
  }
});
