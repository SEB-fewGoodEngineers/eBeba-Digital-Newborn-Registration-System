const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const Registration = require("../models/Registration");
const audit = require("../services/audit");
const { ROLES } = require("../constants");

const STAFF_ID = "507f1f77bcf86cd799439011";
const BABY_ID = "507f1f77bcf86cd799439012";
const HOSPITAL_ID = "507f1f77bcf86cd799439013";
const OTHER_HOSPITAL_ID = "507f1f77bcf86cd799439014";
const TEST_SECRET = "synthetic-birth-edit-test-only";

const birthData = {
  gender: "M",
  birthDateTime: "2026-11-16T10:00:00.000Z",
  placeOfBirth: "Hospital",
  municipalityOfBirth: "Podgorica",
  familyType: "single_parent",
  mother: {
    firstName: "Test",
    lastName: "Parent",
    email: "test@example.com",
  },
};

test("Story 1.4 - Correct a birth record", async (t) => {
  const originalFindUser = User.findById;
  const originalFindBaby = Baby.findById;
  const originalRegistrationExists = Registration.exists;
  const originalAuditLog = audit.log;
  const originalSecret = process.env.JWT_SECRET;

  let server;
  let hospitalId = HOSPITAL_ID;
  let hasRegistration = false;
  let saveCount = 0;
  const auditCalls = [];

  const staff = {
    _id: STAFF_ID,
    role: ROLES.HOSPITAL_STAFF,
    institutionId: HOSPITAL_ID,
    isActive: true,
  };

  const baby = new Baby({
    _id: BABY_ID,
    birthRecordNumber: "BR-TEST-001",
    hospitalId: HOSPITAL_ID,
    createdByUserId: STAFF_ID,
    ...birthData,
  });

  baby.save = async () => {
    saveCount += 1;
    return baby;
  };

  try {
    process.env.JWT_SECRET = TEST_SECRET;

    User.findById = async () => staff;

    Baby.findById = async () => {
      baby.hospitalId = hospitalId;
      return baby;
    };

    Registration.exists = async () =>
      hasRegistration ? { _id: "registration-test" } : null;

    audit.log = async (entry) => {
      auditCalls.push(entry);
    };

    server = http.createServer(app);

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const port = server.address().port;

    const token = jwt.sign(
      {
        payload: {
          _id: STAFF_ID,
          role: ROLES.HOSPITAL_STAFF,
        },
      },
      TEST_SECRET,
      { expiresIn: "1h" },
    );

    const updateBirth = async (data = birthData) => {
      const response = await fetch(
        `http://127.0.0.1:${port}/babies/${BABY_ID}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      return {
        status: response.status,
        body: await response.json(),
      };
    };

    await t.test("hospital staff can update a birth record", async () => {
      hospitalId = HOSPITAL_ID;
      hasRegistration = false;

      const result = await updateBirth({
        ...birthData,
        municipalityOfBirth: "Niksic",
      });

      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.municipalityOfBirth, "Niksic");
      assert.equal(saveCount, 1);
    });

    await t.test("staff cannot edit another hospital's baby", async () => {
      hospitalId = OTHER_HOSPITAL_ID;
      hasRegistration = false;

      const result = await updateBirth();

      assert.equal(result.status, 403);
      assert.equal(saveCount, 1);
    });

    await t.test("parents already applied - return 409", async () => {
      hospitalId = HOSPITAL_ID;
      hasRegistration = true;

      const result = await updateBirth();

      assert.equal(result.status, 409);
      assert.equal(result.body.err, "The parents have already applied.");
      assert.equal(saveCount, 1);
    });

    await t.test("update creates an audit log with before and after", () => {
      assert.equal(auditCalls.length, 1);

      const entry = auditCalls[0];

      assert.equal(entry.action, "birth_record.update");
      assert.equal(entry.targetCollection, "babies");
      assert.equal(String(entry.targetDocumentId), BABY_ID);

      assert.equal(entry.changes.before.municipalityOfBirth, "Podgorica");

      assert.equal(entry.changes.after.municipalityOfBirth, "Niksic");
    });
  } finally {
    User.findById = originalFindUser;
    Baby.findById = originalFindBaby;
    Registration.exists = originalRegistrationExists;
    audit.log = originalAuditLog;

    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }

    if (server?.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
});
