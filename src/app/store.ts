import { create } from "zustand";
import { db } from "../db/db";
import { seedFromCsv } from "../db/seedFromCsv";
import { normalizeBook, normalizeBookcase, Book, Bookcase } from "../db/schema";
import { exportCsvText, parseCsvText } from "../utils/csv";

type LibraryState = {
  books: Book[];
  bookcases: Bookcase[];
  loading: boolean;
  setBooks: (books: Book[]) => void;
  setBookcases: (bookcases: Bookcase[]) => void;
  loadFromDb: () => Promise<void>;
  seedFromCsv: () => Promise<void>;
  importCsv: (text: string) => Promise<void>;
  exportCsv: () => string;
  upsertBook: (book: Book) => Promise<void>;
  upsertBookcase: (bookcase: Bookcase) => Promise<void>;
  removeBook: (id: number) => Promise<void>;
};

const sortBooks = (books: Book[]) => [...books].sort((a, b) => a.id - b.id);

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  bookcases: [],
  loading: true,
  setBooks: (books) => set({ books: sortBooks(books) }),
  setBookcases: (bookcases) => set({ bookcases }),
  loadFromDb: async () => {
    const [books, bookcases] = await Promise.all([db.books.toArray(), db.bookcases.toArray()]);
    set({
      books: sortBooks(books.map(normalizeBook)),
      bookcases: bookcases.map(normalizeBookcase),
      loading: false,
    });
  },
  seedFromCsv: async () => {
    await seedFromCsv();
    const [books, bookcases] = await Promise.all([db.books.toArray(), db.bookcases.toArray()]);
    set({
      books: sortBooks(books.map(normalizeBook)),
      bookcases: bookcases.map(normalizeBookcase),
      loading: false,
    });
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
    set({
      books: sortBooks(get().books.filter((item) => item.id !== normalized.id).concat(normalized)),
    });
  },
  upsertBookcase: async (bookcase) => {
    const normalized = normalizeBookcase(bookcase);
    await db.bookcases.put(normalized);
    set({
      bookcases: get()
        .bookcases.filter((item) => item.id !== normalized.id)
        .concat(normalized),
    });
  },
  removeBook: async (id) => {
    await db.books.delete(id);
    set({ books: get().books.filter((book) => book.id !== id) });
  },
}));
