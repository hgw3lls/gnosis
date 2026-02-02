import { create } from "zustand";
import { db } from "../db/db";
import { seedFromCsv } from "../db/seedFromCsv";
import { normalizeBook, Book } from "../db/schema";
import { exportCsvText, parseCsvText } from "../utils/csv";

type LibraryState = {
  books: Book[];
  loading: boolean;
  setBooks: (books: Book[]) => void;
  loadFromDb: () => Promise<void>;
  seedFromCsv: () => Promise<void>;
  importCsv: (text: string) => Promise<void>;
  exportCsv: () => string;
  upsertBook: (book: Book) => Promise<void>;
  removeBook: (id: number) => Promise<void>;
};

const sortBooks = (books: Book[]) => [...books].sort((a, b) => a.id - b.id);

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  loading: true,
  setBooks: (books) => set({ books: sortBooks(books) }),
  loadFromDb: async () => {
    const books = await db.books.toArray();
    set({ books: sortBooks(books.map(normalizeBook)), loading: false });
  },
  seedFromCsv: async () => {
    await seedFromCsv();
    const books = await db.books.toArray();
    set({ books: sortBooks(books.map(normalizeBook)), loading: false });
  },
  importCsv: async (text) => {
    const books = parseCsvText(text);
    await db.books.clear();
    await db.books.bulkAdd(books);
    set({ books: sortBooks(books) });
  },
  exportCsv: () => exportCsvText(get().books),
  upsertBook: async (book) => {
    const normalized = normalizeBook(book);
    await db.books.put(normalized);
    set({ books: sortBooks(get().books.filter((item) => item.id !== normalized.id).concat(normalized)) });
  },
  removeBook: async (id) => {
    await db.books.delete(id);
    set({ books: get().books.filter((book) => book.id !== id) });
  },
}));
