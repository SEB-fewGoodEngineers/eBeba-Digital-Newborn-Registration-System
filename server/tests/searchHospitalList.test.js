
const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Baby = require("../models/Baby");
const Registration = require("../models/Registration");
const { ROLES } = require("../constants");

const STAFF_ID = "507f1f77bcf86cd799439011";
const HOSPITAL_ID = "507f1f77bcf86cd799439012";
const OTHER_HOSPITAL_ID = "507f1f77bcf86cd799439013";
const TEST_SECRET = "synthetic-search-test-only";

const babies = [
  {
    _id: "507f1f77bcf86cd799439021",
    hospitalId: HOSPITAL_ID,
    birthRecordNumber: "BR-HOSP-PG-001",
    mother: { firstName: "Ana", lastName: "Petrović" },
  },
  {
    _id: "507f1f77bcf86cd799439022",
    hospitalId: HOSPITAL_ID,
    birthRecordNumber: "BR-HOSP-PG-002",
    mother: { firstName: "Mila", lastName: "Jovanović" },
  },
  {
    _id: "507f1f77bcf86cd799439023",
    hospitalId: OTHER_HOSPITAL_ID,
    birthRecordNumber: "BR-HOSP-NK-003",
    mother: { firstName: "Sara", lastName: "Petrović" },
  },
];

test("Story 1.5 - Search the hospital list", async (t) => {
  const originalFindUser = User.findById;
  const originalFindBaby = Baby.find;
  const originalFindRegistration = Registration.find;
  const originalSecret = process.env.JWT_SECRET;

  let server;

  try {
    process.env.JWT_SECRET = TEST_SECRET;

    User.findById = async () => ({
      _id: STAFF_ID,
      role: ROLES.HOSPITAL_STAFF,
      institutionId: HOSPITAL_ID,
      isActive: true,
    });

    Baby.find = (filter) => ({
      sort: async () => {
        const matches = babies.filter((baby) => {
          if (String(baby.hospitalId) !== String(filter.hospitalId)) {
            return false;
          }

          if (!filter.$or) {
            return true;
          }

          return filter.$or.some((condition) => {
            if (condition["mother.lastName"]) {
              return condition["mother.lastName"].test(
                baby.mother.lastName,
              );
            }

            if (condition.birthRecordNumber) {
              return condition.birthRecordNumber.test(
                baby.birthRecordNumber,
              );
            }

            return false;
          });
        });

        return matches.map((baby) => ({
          ...baby,
          toObject() {
            return { ...baby };
          },
        }));
      },
    });

    Registration.find = async () => [];

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

    const searchBabies = async (search = "") => {
      const response = await fetch(
        `http://127.0.0.1:${port}/babies?search=${encodeURIComponent(search)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const body = await response.json();

      assert.equal(response.status, 200, JSON.stringify(body));

      return body;
    };

    await t.test("search by mother's last name", async () => {
      const result = await searchBabies("Petrović");

      assert.equal(result.length, 1);
      assert.equal(result[0].mother.lastName, "Petrović");
    });

    await t.test("search by birth record number", async () => {
      const result = await searchBabies("PG-002");

      assert.equal(result.length, 1);
      assert.equal(result[0].birthRecordNumber, "BR-HOSP-PG-002");
    });

    await t.test("search is case-insensitive", async () => {
      const result = await searchBabies("pEtRoViĆ");

      assert.equal(result.length, 1);
      assert.equal(result[0].mother.lastName, "Petrović");

      const numberResult = await searchBabies("br-hosp-pg-001");
      assert.equal(numberResult.length, 1);
    });

    await t.test("special regex characters are escaped", async () => {
      const result = await searchBabies(".*");
      assert.equal(result.length, 0);
    });

    await t.test("only my hospital records are returned", async () => {
      const result = await searchBabies("");

      assert.equal(result.length, 2);

      for (const baby of result) {
        assert.equal(String(baby.hospitalId), HOSPITAL_ID);
      }

      const otherHospital = await searchBabies("NK-003");
      assert.equal(otherHospital.length, 0);
    });
  } finally {
    User.findById = originalFindUser;
    Baby.find = originalFindBaby;
    Registration.find = originalFindRegistration;

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
