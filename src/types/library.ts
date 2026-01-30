export type ShelfCode =
  | 'I'
  | 'II'
  | 'III'
  | 'IV'
  | 'V'
  | 'VI';

export const SHELVES: { code: ShelfCode; name: string }[] = [
  { code: 'I', name: 'Foundations & Philosophy' },
  { code: 'II', name: 'Systems, Media & Technology' },
  { code: 'III', name: 'Power, Control & Institutions' },
  { code: 'IV', name: 'Art, Aesthetics & Practice' },
  { code: 'V', name: 'Fiction, Speculation & Myth' },
  { code: 'VI', name: 'Methods, Reference & Tools' },
];

export type Book = {
  id: string;
  title: string;
  author: string;
  shelfCode: ShelfCode;
  primaryShelf: string;
  tags: string[];
  useStatus: string;
  notes: string;
  isbn?: string;
  year?: string;
  publisher?: string;
  pageCount?: string;
  createdAt: string;
  updatedAt: string;
  raw: Record<string, string>;
};

export type LibraryState = {
  books: Record<string, Book>;
  shelves: Record<ShelfCode, string[]>;
  columns: string[];
};
