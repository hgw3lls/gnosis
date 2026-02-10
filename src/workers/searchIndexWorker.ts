import MiniSearch from "minisearch";

type SearchDocument = {
  id: number;
  title: string;
  authors: string;
  publisher: string;
  tags: string;
  collections: string;
  projects: string;
  location: string;
  status: string;
  format: string;
  language: string;
  publish_year: string;
  notes: string;
  isbn13: string;
};

const SEARCH_FIELDS = [
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
];

self.onmessage = (event: MessageEvent<{ documents: SearchDocument[] }>) => {
  const { documents } = event.data;
  const miniSearch = new MiniSearch({
    fields: SEARCH_FIELDS,
    storeFields: ["id"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
    },
  });
  miniSearch.addAll(documents);
  const indexJson = JSON.stringify(miniSearch.toJSON());
  self.postMessage({ indexJson });
};
