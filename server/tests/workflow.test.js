const { test } = require("node:test");
const assert = require("node:assert");
const { generateJmbg, jmbgCheckDigit } = require("../services/workflow");
const { MUNICIPALITY_JMBG } = require("../constants/jmbgRegions");

// --- jmbgCheckDigit ---------------------------------------------

test("check digit: known example 0308964384007 has K=7", () => {
  assert.strictEqual(jmbgCheckDigit("030896438400"), 7);
});

test("check digit: all-zero base (m=11) gives K=0", () => {
  // sum = 0, m = 11 - 0 = 11 -> K = 0
  assert.strictEqual(jmbgCheckDigit("000000000000"), 0);
});

test("check digit: a base with m=10 also gives K=0", () => {
  // Base chosen so that (7*(d1+d7) + ... + 2*(d6+d12)) % 11 === 1,
  // which makes m = 10. We compute it here so the test does not depend on
  // a magic constant. If the formula changes, this still tests the rule:
  // "m === 10 -> K = 0".
  const digits = "100000000000";
  // sum = 7*1 + 0 + ... = 7 ; 7 % 11 = 7 ; m = 11 - 7 = 4 -> K=4
  // Not what we want, but the test below verifies the rule against a
  // candidate found by brute force.
  // Brute-force one m=10 base:
  let m10 = null;
  for (let n = 0; n < 1_000_000_000_000; n++) {
    const s = String(n).padStart(12, "0");
    const d = s.split("").map(Number);
    const sum =
      7 * (d[0] + d[6]) +
      6 * (d[1] + d[7]) +
      5 * (d[2] + d[8]) +
      4 * (d[3] + d[9]) +
      3 * (d[4] + d[10]) +
      2 * (d[5] + d[11]);
    if (sum % 11 === 1) {
      m10 = s;
      break;
    }
  }
  assert.ok(m10, "could not find an m=10 base (impossible)");
  assert.strictEqual(jmbgCheckDigit(m10), 0);
});

test("check digit: rejects a wrong-length input", () => {
  assert.throws(() => jmbgCheckDigit("123"), /12 digits/);
});

// --- generateJmbg -----------------------------------------------

test("generateJmbg: 13 digits, starts with birth date and Bar area", () => {
  const jmbg = generateJmbg(new Date("2026-11-11T14:00:00Z"), "Bar", "M");
  assert.strictEqual(jmbg.length, 13);
  assert.strictEqual(jmbg.slice(0, 7), "1111026");
  assert.strictEqual(jmbg.slice(7, 9), "22");
});

test("generateJmbg: Bar (area 22) male serial in 000-299", () => {
  for (let i = 0; i < 20; i++) {
    const jmbg = generateJmbg(new Date("2026-11-11T14:00:00Z"), "Bar", "M");
    const serial = Number(jmbg.slice(9, 12));
    assert.ok(serial >= 0 && serial <= 299, `serial ${serial}`);
  }
});

test("generateJmbg: Bar (area 22) female serial in 500-799", () => {
  for (let i = 0; i < 20; i++) {
    const jmbg = generateJmbg(new Date("2026-11-11T14:00:00Z"), "Bar", "F");
    const serial = Number(jmbg.slice(9, 12));
    assert.ok(serial >= 500 && serial <= 799, `serial ${serial}`);
  }
});

test("generateJmbg: Podgorica (area 21) male serial in 000-399", () => {
  for (let i = 0; i < 20; i++) {
    const jmbg = generateJmbg(
      new Date("2026-11-11T14:00:00Z"),
      "Podgorica",
      "M",
    );
    assert.strictEqual(jmbg.slice(7, 9), "21");
    const serial = Number(jmbg.slice(9, 12));
    assert.ok(serial >= 0 && serial <= 399, `serial ${serial}`);
  }
});

test("generateJmbg: unknown municipality throws", () => {
  assert.throws(
    () => generateJmbg(new Date(), "Atlantis", "M"),
    /No JMBG region/,
  );
});

test("generateJmbg: every produced number passes its own check digit", () => {
  const cities = ["Bar", "Podgorica"];
  for (const city of cities) {
    for (const g of ["M", "F"]) {
      for (let i = 0; i < 10; i++) {
        const jmbg = generateJmbg(new Date("2026-11-11T14:00:00Z"), city, g);
        const expected = jmbgCheckDigit(jmbg.slice(0, 12));
        assert.strictEqual(
          Number(jmbg[12]),
          expected,
          `bad check digit for ${city}/${g}: ${jmbg}`,
        );
      }
    }
  }
});

// --- data integrity --------------------------------------------

test("every seeded municipality exists in MUNICIPALITY_JMBG", () => {
  const seeded = ["Bar", "Podgorica"]; // from the DB
  for (const m of seeded) {
    assert.ok(MUNICIPALITY_JMBG[m], `seeded municipality "${m}" missing`);
  }
});
