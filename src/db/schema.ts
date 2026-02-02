export const CSV_SCHEMA = [
  "id",
  "title",
  "authors",
  "publisher",
  "publish_year",
  "language",
  "format",
  "isbn13",
  "tags",
  "collections",
  "projects",
  "location",
  "status",
  "notes",
  "cover_image",
  "added_at",
  "updated_at",
] as const;

export const getSchemaColumns = () => [...CSV_SCHEMA];

export type Book = {
  id: number;
  title: string;
  authors: string;
  publisher: string;
  publish_year: string;
  language: string;
  format: string;
  isbn13: string;
  tags: string;
  collections: string;
  projects: string;
  location: string;
  status: "to_read" | "reading" | "referenced" | "finished";
  notes: string;
  cover_image: string;
  added_at: string;
  updated_at: string;
};

export const STATUS_OPTIONS: Book["status"][] = [
  "to_read",
  "reading",
  "referenced",
  "finished",
];

const emptyBook: Book = {
  id: 0,
  title: "",
  authors: "",
  publisher: "",
  publish_year: "",
  language: "",
  format: "",
  isbn13: "",
  tags: "",
  collections: "",
  projects: "",
  location: "",
  status: "to_read",
  notes: "",
  cover_image: "",
  added_at: "",
  updated_at: "",
};

export const normalizeBook = (data: Partial<Book>): Book => {
  const draft = { ...emptyBook, ...data };
  const id = Number.parseInt(String(draft.id), 10);
  const status = STATUS_OPTIONS.includes(draft.status)
    ? draft.status
    : "to_read";

  return {
    ...draft,
    id: Number.isFinite(id) ? id : 0,
    status,
    isbn13: String(draft.isbn13 ?? ""),
    language: draft.language?.trim() || "en",
    publish_year: draft.publish_year ? String(draft.publish_year) : "",
  };
};
