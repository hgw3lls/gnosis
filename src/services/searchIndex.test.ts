import assert from "node:assert/strict";
import test from "node:test";
import MiniSearch from "minisearch";

import { SEARCH_INDEX_OPTIONS } from "./searchIndexConfig";

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
      location: "desk",
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
