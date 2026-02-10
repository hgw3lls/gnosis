import test from "node:test";
import assert from "node:assert/strict";
import { convertIsbn10To13, isValidIsbn10, isValidIsbn13, parseIsbn } from "./isbn";

test("parseIsbn normalizes hyphens and maps ISBN-10 to ISBN-13", () => {
  const parsed = parseIsbn("0-7432-7356-7");
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.isbn10, "0743273567");
  assert.equal(parsed.isbn13, "9780743273565");
});

test("isbn13 validator rejects wrong check digits", () => {
  assert.equal(isValidIsbn13("9780743273565"), true);
  assert.equal(isValidIsbn13("9780743273566"), false);
});

test("convertIsbn10To13 returns null for invalid isbn10", () => {
  assert.equal(isValidIsbn10("1234567890"), false);
  assert.equal(convertIsbn10To13("1234567890"), null);
});
