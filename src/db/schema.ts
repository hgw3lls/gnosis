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
  "bookcase_id",
  "shelf",
  "position",
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
  bookcase_id: number | null;
  shelf: number | null;
  position: number | null;
  status: "to_read" | "reading" | "referenced" | "finished";
  notes: string;
  cover_image: string;
  added_at: string;
  updated_at: string;
};

export type Bookcase = {
  id: number;
  name: string;
  shelves: number;
  capacity_per_shelf: number;
  notes: string;
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
  bookcase_id: null,
  shelf: null,
  position: null,
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
  const bookcaseId = Number.parseInt(String(draft.bookcase_id), 10);
  const shelf = Number.parseInt(String(draft.shelf), 10);
  const position = Number.parseInt(String(draft.position), 10);

  const normalized = {
    ...draft,
    id: Number.isFinite(id) ? id : 0,
    status,
    isbn13: String(draft.isbn13 ?? ""),
    language: draft.language?.trim() || "en",
    publish_year: draft.publish_year ? String(draft.publish_year) : "",
    bookcase_id: Number.isFinite(bookcaseId) && bookcaseId > 0 ? bookcaseId : null,
    shelf: Number.isFinite(shelf) && shelf > 0 ? shelf : null,
    position: Number.isFinite(position) && position > 0 ? position : null,
  };
  if (!normalized.bookcase_id) {
    return { ...normalized, shelf: null, position: null };
  }
  return normalized;
};

const emptyBookcase: Bookcase = {
  id: 0,
  name: "",
  shelves: 4,
  capacity_per_shelf: 20,
  notes: "",
  added_at: "",
  updated_at: "",
};

export const normalizeBookcase = (data: Partial<Bookcase>): Bookcase => {
  const draft = { ...emptyBookcase, ...data };
  const id = Number.parseInt(String(draft.id), 10);
  const shelves = Number.parseInt(String(draft.shelves), 10);
  const capacity = Number.parseInt(String(draft.capacity_per_shelf), 10);

  return {
    ...draft,
    id: Number.isFinite(id) ? id : 0,
    name: draft.name?.trim() || "Untitled bookcase",
    shelves: Number.isFinite(shelves) && shelves > 0 ? shelves : emptyBookcase.shelves,
    capacity_per_shelf:
      Number.isFinite(capacity) && capacity > 0 ? capacity : emptyBookcase.capacity_per_shelf,
  };
};
