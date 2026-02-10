import test from "node:test";
import assert from "node:assert/strict";
import { detectDuplicateGroups, mergeBookRecords } from "./duplicates";

const base = {
  publisher: "",
  publish_year: "",
  language: "en",
  format: "",
  tags: "",
  collections: "",
  projects: "",
  location: "",
  bookcase_id: null,
  shelf: null,
  position: null,
  status: "to_read",
  notes: "",
  cover_image: "",
  added_at: "2024-01-01",
  updated_at: "2024-01-01",
} as const;

test("detectDuplicateGroups finds isbn duplicates with normalization", () => {
  const groups = detectDuplicateGroups([
    { ...base, id: 1, title: "A", authors: "B", isbn13: "978-0-12-345678-6" },
    { ...base, id: 2, title: "A second", authors: "C", isbn13: "9780123456786" },
  ] as any);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].reason, "isbn");
});

test("mergeBookRecords fills missing fields and combines multivalue", () => {
  const merged = mergeBookRecords(
    { ...base, id: 1, title: "", authors: "Author", tags: "a", notes: "note 1", isbn13: "" } as any,
    { ...base, id: 2, title: "Title", authors: "", tags: "a | b", notes: "note 2", isbn13: "9781234567897" } as any
  );

  assert.equal(merged.title, "Title");
  assert.equal(merged.isbn13, "9781234567897");
  assert.equal(merged.tags, "a | b");
  assert.match(merged.notes, /merged/);
});
