import MiniSearch from "minisearch";

export const SEARCH_FIELDS = [
  "title",
  "authors",
  "publisher",
  "tags",
  "collections",
  "projects",
  "location",
  "status",
  "format",
  "language",
  "publish_year",
  "notes",
  "isbn13",
] as const;

export const SEARCH_INDEX_OPTIONS: MiniSearch.Options = {
  fields: [...SEARCH_FIELDS],
  storeFields: ["id"],
  searchOptions: {
    prefix: true,
    fuzzy: 0.2,
  },
};
