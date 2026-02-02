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
