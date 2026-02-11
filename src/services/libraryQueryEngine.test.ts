import test from "node:test";
import assert from "node:assert/strict";
import MiniSearch from "minisearch";
import { queryLibraryBookIds, emptyFacets } from "./libraryQueryEngine";

const books = [
  {
    id: 1,
    title: "The Medium Is the Massage",
    authors: "Marshall McLuhan",
    publisher: "Penguin",
    publish_year: "1967",
    language: "en",
    format: "paperback",
    isbn13: "",
    tags: "media | theory",
    collections: "communication",
    projects: "dissertation",
    bookcase_id: null,
    shelf: null,
    position: null,
    status: "reading",
    notes: "classic media theory",
    cover_image: "",
    added_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z",
  },
  {
    id: 2,
    title: "Algorithms of Oppression",
    authors: "Safiya Noble",
    publisher: "NYU Press",
    publish_year: "2018",
    language: "en",
    format: "hardcover",
    isbn13: "",
    tags: "algorithm | race",
    collections: "critical data",
    projects: "",
    bookcase_id: null,
    shelf: null,
    position: null,
    status: "to_read",
    notes: "search engines and bias",
    cover_image: "",
    added_at: "2024-01-03T00:00:00.000Z",
    updated_at: "2024-01-04T00:00:00.000Z",
  },
] as const;

test("queryLibraryBookIds applies facets with AND logic", () => {
  const ids = queryLibraryBookIds({
    books: books as any,
    index: null,
    query: "",
    facets: { ...emptyFacets(), status: ["reading"], tags: ["theory"] },
    sort: "updated",
  });
  assert.deepEqual(ids, [1]);
});

test("queryLibraryBookIds ranks title/authors matches above note-only matches", () => {
  const index = new MiniSearch({
    fields: [
      "title",
      "authors",
      "publisher",
      "tags",
      "collections",
      "projects",
      "status",
      "format",
      "language",
      "publish_year",
      "notes",
      "isbn13",
    ],
    storeFields: ["id"],
    searchOptions: { prefix: true, fuzzy: 0.2 },
  });
  index.addAll(books as any);

  const ids = queryLibraryBookIds({
    books: books as any,
    index,
    query: "media",
    facets: emptyFacets(),
    sort: "updated",
  });

  assert.equal(ids[0], 1);
});
