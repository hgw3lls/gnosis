import test from "node:test";
import assert from "node:assert/strict";
import { mapOpenLibraryBook } from "./openLibraryLookup";

test("mapOpenLibraryBook maps core fields and extracts year", () => {
  const mapped = mapOpenLibraryBook(
    {
      title: "My Book",
      publish_date: "May 12, 2008",
      authors: [{ name: "Author A" }, { name: "Author B" }],
      publishers: [{ name: "Pub House" }],
      cover: { medium: "https://example.com/cover.jpg" },
      identifiers: { isbn_13: ["9781234567890"] },
    },
    "9780000000000"
  );

  assert.ok(mapped);
  assert.equal(mapped?.title, "My Book");
  assert.equal(mapped?.authors, "Author A, Author B");
  assert.equal(mapped?.publisher, "Pub House");
  assert.equal(mapped?.publish_year, "2008");
  assert.equal(mapped?.cover_image, "https://example.com/cover.jpg");
  assert.equal(mapped?.isbn13, "9781234567890");
});

test("mapOpenLibraryBook uses fallback cover and isbn when missing", () => {
  const mapped = mapOpenLibraryBook({ title: "Fallback" }, "9781111111111");
  assert.ok(mapped);
  assert.equal(mapped?.isbn13, "9781111111111");
  assert.match(mapped?.cover_image ?? "", /9781111111111-L.jpg$/);
});
