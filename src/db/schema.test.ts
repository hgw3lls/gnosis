import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBook } from "./schema";

test("normalizeBook rewrites absolute /covers paths to covers/", () => {
  const book = normalizeBook({
    id: 1,
    title: "Example",
    authors: "Author",
    cover_image: "/covers/example.jpg",
  });

  assert.equal(book.cover_image, "covers/example.jpg");
});

test("normalizeBook keeps relative covers/ paths", () => {
  const book = normalizeBook({
    id: 1,
    title: "Example",
    authors: "Author",
    cover_image: "covers/example.jpg",
  });

  assert.equal(book.cover_image, "covers/example.jpg");
});
