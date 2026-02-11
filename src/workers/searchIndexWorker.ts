import MiniSearch from "minisearch";
import { SEARCH_INDEX_OPTIONS } from "../services/searchIndexConfig";

type SearchDocument = {
  id: number;
  title: string;
  authors: string;
  publisher: string;
  tags: string;
  collections: string;
  projects: string;
  status: string;
  format: string;
  language: string;
  publish_year: string;
  notes: string;
  isbn13: string;
};

self.onmessage = (event: MessageEvent<{ documents: SearchDocument[] }>) => {
  const { documents } = event.data;
  const miniSearch = new MiniSearch(SEARCH_INDEX_OPTIONS);
  miniSearch.addAll(documents);
  const indexJson = JSON.stringify(miniSearch.toJSON());
  self.postMessage({ indexJson });
};
