import { create } from "zustand";
import { db } from "../db/db";
import { seedFromCsv } from "../db/seedFromCsv";
import { normalizeBook, normalizeBookcase, Book, Bookcase } from "../db/schema";
import { exportCsvText, parseCsvText } from "../utils/csv";

type LibraryState = {
  books: Book[];
  bookcases: Bookcase[];
  loading: boolean;
  isUnlocked: boolean;
  setBooks: (books: Book[]) => void;
  setBookcases: (bookcases: Bookcase[]) => void;
  unlockWithCode: (code: string) => boolean;
  lock: () => void;
  loadFromDb: () => Promise<void>;
  seedFromCsv: () => Promise<void>;
  importCsv: (text: string) => Promise<void>;
  exportCsv: () => string;
  upsertBook: (book: Book) => Promise<void>;
  upsertBookcase: (bookcase: Bookcase) => Promise<void>;
  removeBook: (id: number) => Promise<void>;
};

const sortBooks = (books: Book[]) => [...books].sort((a, b) => a.id - b.id);
const makeSlotKey = (shelf: number, position: number) => `${shelf}-${position}`;

const sanitizeBookPlacement = (
  book: Book,
  bookcases: Bookcase[],
  books: Book[]
): Book => {
  if (!book.bookcase_id) {
    return { ...book, bookcase_id: null, shelf: null, position: null };
  }
  const bookcase = bookcases.find((item) => item.id === book.bookcase_id);
  if (!bookcase) {
    return { ...book, bookcase_id: null, shelf: null, position: null };
  }
  if (!book.shelf || !book.position) {
    return { ...book, shelf: null, position: null };
  }
  if (
    book.shelf < 1 ||
    book.shelf > bookcase.shelves ||
    book.position < 1 ||
    book.position > bookcase.capacity_per_shelf
  ) {
    return { ...book, shelf: null, position: null };
  }
  const hasConflict = books.some(
    (item) =>
      item.id !== book.id &&
      item.bookcase_id === book.bookcase_id &&
      item.shelf === book.shelf &&
      item.position === book.position
  );
  if (hasConflict) {
    return { ...book, shelf: null, position: null };
  }
  return book;
};

const normalizeBookcaseAssignments = (
  books: Book[],
  bookcase: Bookcase
): { books: Book[]; updates: Book[] } => {
  const occupied = new Set<string>();
  const updates: Book[] = [];
  const normalizedBooks = books.map((book) => {
    if (book.bookcase_id !== bookcase.id) {
      return book;
    }
    let nextShelf = book.shelf ?? null;
    let nextPosition = book.position ?? null;
    if (!nextShelf || !nextPosition) {
      nextShelf = null;
      nextPosition = null;
    }
    if (
      nextShelf &&
      (nextShelf < 1 || nextShelf > bookcase.shelves)
    ) {
      nextShelf = null;
      nextPosition = null;
    }
    if (
      nextPosition &&
      (nextPosition < 1 || nextPosition > bookcase.capacity_per_shelf)
    ) {
      nextShelf = null;
      nextPosition = null;
    }
    if (nextShelf && nextPosition) {
      const key = makeSlotKey(nextShelf, nextPosition);
      if (occupied.has(key)) {
        nextShelf = null;
        nextPosition = null;
      } else {
        occupied.add(key);
      }
    }
    if (nextShelf !== book.shelf || nextPosition !== book.position) {
      const updated = {
        ...book,
        shelf: nextShelf,
        position: nextPosition,
        updated_at: new Date().toISOString(),
      };
      updates.push(updated);
      return updated;
    }
    return book;
  });

  return { books: normalizedBooks, updates };
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  bookcases: [],
  loading: true,
  isUnlocked: false,
  setBooks: (books) => set({ books: sortBooks(books) }),
  setBookcases: (bookcases) => set({ bookcases }),
  unlockWithCode: (code) => {
    if (code === "1984") {
      set({ isUnlocked: true });
      return true;
    }
    return false;
  },
  lock: () => set({ isUnlocked: false }),
  loadFromDb: async () => {
    const [books, bookcases] = await Promise.all([db.books.toArray(), db.bookcases.toArray()]);
    const normalizedBookcases = bookcases.map(normalizeBookcase);
    const normalizedBooks = books.map(normalizeBook);
    const sanitizedBooks = normalizedBooks.map((book) =>
      sanitizeBookPlacement(book, normalizedBookcases, normalizedBooks)
    );
    set({
      books: sortBooks(sanitizedBooks),
      bookcases: normalizedBookcases,
      loading: false,
    });
  },
  seedFromCsv: async () => {
    await seedFromCsv();
    const [books, bookcases] = await Promise.all([db.books.toArray(), db.bookcases.toArray()]);
    const normalizedBookcases = bookcases.map(normalizeBookcase);
    const normalizedBooks = books.map(normalizeBook);
    const sanitizedBooks = normalizedBooks.map((book) =>
      sanitizeBookPlacement(book, normalizedBookcases, normalizedBooks)
    );
    set({
      books: sortBooks(sanitizedBooks),
      bookcases: normalizedBookcases,
      loading: false,
    });
  },
  importCsv: async (text) => {
    const books = parseCsvText(text);
    const state = get();
    const sanitizedBooks = books.map((book) =>
      sanitizeBookPlacement(book, state.bookcases, books)
    );
    await db.books.clear();
    await db.books.bulkAdd(sanitizedBooks);
    set({ books: sortBooks(sanitizedBooks) });
  },
  exportCsv: () => exportCsvText(get().books),
  upsertBook: async (book) => {
    const normalized = normalizeBook(book);
    const state = get();
    const sanitized = sanitizeBookPlacement(
      normalized,
      state.bookcases,
      state.books
    );
    await db.books.put(sanitized);
    set({
      books: sortBooks(
        get()
          .books.filter((item) => item.id !== sanitized.id)
          .concat(sanitized)
      ),
    });
  },
  upsertBookcase: async (bookcase) => {
    const normalized = normalizeBookcase(bookcase);
    await db.bookcases.put(normalized);
    const state = get();
    const nextBookcases = state.bookcases
      .filter((item) => item.id !== normalized.id)
      .concat(normalized);
    const { books: nextBooks, updates } = normalizeBookcaseAssignments(
      state.books,
      normalized
    );
    if (updates.length) {
      await Promise.all(updates.map((update) => db.books.put(update)));
    }
    set({
      bookcases: nextBookcases,
      books: sortBooks(nextBooks),
    });
  },
  removeBook: async (id) => {
    await db.books.delete(id);
    set({ books: get().books.filter((book) => book.id !== id) });
  },
}));
