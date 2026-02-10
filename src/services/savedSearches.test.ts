import assert from "node:assert/strict";
import test from "node:test";

import { createSavedSearch } from "./savedSearches";
import { emptyFacets } from "./libraryQueryEngine";

test("createSavedSearch stores sort with saved shelf", () => {
  const saved = createSavedSearch("Recent", "", emptyFacets(), "updated");
  assert.equal(saved.sort, "updated");
});
