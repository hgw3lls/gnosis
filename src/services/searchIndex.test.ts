import assert from "node:assert/strict";
import test from "node:test";
import MiniSearch from "minisearch";

import { SEARCH_INDEX_OPTIONS } from "./searchIndexConfig";
import { getSearchIndexSignature } from "./searchIndex";

test("MiniSearch serialized index reloads with shared options", () => {
  const index = new MiniSearch(SEARCH_INDEX_OPTIONS);
  index.addAll([
    {
      id: 1,
      title: "Gnosis",
      authors: "Ada",
      publisher: "Press",
      tags: "theory",
      collections: "library",
      projects: "app",
      status: "to_read",
      format: "book",
      language: "en",
      publish_year: "2024",
      notes: "",
      isbn13: "9781234567897",
    },
  ]);

  const serialized = JSON.stringify(index.toJSON());
  const reloaded = MiniSearch.loadJSON(serialized, SEARCH_INDEX_OPTIONS);
  const hits = reloaded.search("Gnosis", { prefix: true, fuzzy: 0.2 });

  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.id, 1);
});

test("getSearchIndexSignature is order-insensitive and changes on updates", () => {
  const books = [
    { id: 2, updated_at: "2024-01-01T00:00:00.000Z" },
    { id: 1, updated_at: "2024-01-02T00:00:00.000Z" },
  ];
  const permuted = [books[1], books[0]];

  const a = getSearchIndexSignature(books);
  const b = getSearchIndexSignature(permuted);
  assert.equal(a, b);

  const changed = getSearchIndexSignature(
    [
      { id: 2, updated_at: "2024-01-01T00:00:00.000Z" },
      { id: 1, updated_at: "2024-01-03T00:00:00.000Z" },
    ],
  );
  assert.notEqual(a, changed);
});
