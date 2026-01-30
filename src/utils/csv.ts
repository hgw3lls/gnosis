import Papa from 'papaparse';
import type { Book, LibraryState, ShelfCode } from '../types/library';
import { SHELVES } from '../types/library';
import { inferShelfFromPrimary, normalizeShelfCode } from './shelves';
import { uniqueIdFromFields } from './ids';

const requiredColumns = [
  'Title',
  'Author',
  'Primary_Shelf',
  'Shelf_Code',
  'Tags',
  'Use_Status',
  'ISBN',
  'Year',
  'Publisher',
  'Notes',
];

const trimValue = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const ensureColumns = (columns: string[]) => {
  const merged = [...columns];
  requiredColumns.forEach((column) => {
    if (!merged.includes(column)) {
      merged.push(column);
    }
  });
  return merged;
};

export const parseLibraryCsv = (csvText: string): LibraryState => {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const columns = ensureColumns(parsed.meta.fields ?? []);
  const shelves: Record<ShelfCode, string[]> = {
    I: [],
    II: [],
    III: [],
    IV: [],
    V: [],
    VI: [],
  };
  const books: Record<string, Book> = {};
  const seenIds = new Set<string>();

  (parsed.data ?? []).forEach((row, index) => {
    const title = trimValue(row.Title || row.title || row['Book Title']);
    const author = trimValue(row.Author || row.author);
    const primaryShelf =
      trimValue(row.Primary_Shelf || row.primary_shelf) ||
      trimValue(row.Shelf || row.shelf) ||
      SHELVES[0].name;
    const shelfCode = normalizeShelfCode(
      trimValue(row.Shelf_Code) || inferShelfFromPrimary(primaryShelf),
    );

    const idBase = uniqueIdFromFields([
      title,
      author,
      trimValue(row.ISBN || row.ISBN_13 || row.isbn),
      String(index),
    ]);
    let id = idBase;
    let suffix = 1;
    while (seenIds.has(id)) {
      id = `${idBase}-${suffix}`;
      suffix += 1;
    }
    seenIds.add(id);

    const now = new Date().toISOString();
    const tags = trimValue(row.Tags || row.tags)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const book: Book = {
      id,
      title: title || 'Untitled',
      author,
      shelfCode,
      primaryShelf,
      tags,
      useStatus: trimValue(row.Use_Status || row.use_status),
      notes: trimValue(row.Notes || row.notes),
      isbn: trimValue(row.ISBN || row.ISBN_13 || row.isbn),
      year: trimValue(row.Year || row.Publish_Year || row.year),
      publisher: trimValue(row.Publisher || row.publisher),
      pageCount: trimValue(row.Page_Count || row.page_count),
      createdAt: now,
      updatedAt: now,
      raw: Object.fromEntries(
        columns.map((column) => [column, trimValue(row[column])]),
      ),
    };

    book.raw.Title = book.title;
    book.raw.Author = book.author;
    book.raw.Primary_Shelf = book.primaryShelf;
    book.raw.Shelf_Code = book.shelfCode;
    book.raw.Tags = book.tags.join(', ');
    book.raw.Use_Status = book.useStatus;
    book.raw.ISBN = book.isbn ?? '';
    book.raw.Year = book.year ?? '';
    book.raw.Publisher = book.publisher ?? '';
    book.raw.Notes = book.notes;

    books[id] = book;
    shelves[shelfCode].push(id);
  });

  return { books, shelves, columns };
};

export const exportLibraryCsv = (state: LibraryState): string => {
  const rows = Object.values(state.books).map((book) => {
    const raw = { ...book.raw };
    raw.Title = book.title;
    raw.Author = book.author;
    raw.Primary_Shelf = book.primaryShelf;
    raw.Shelf_Code = book.shelfCode;
    raw.Tags = book.tags.join(', ');
    raw.Use_Status = book.useStatus;
    raw.ISBN = book.isbn ?? '';
    raw.Year = book.year ?? '';
    raw.Publisher = book.publisher ?? '';
    raw.Notes = book.notes;
    return raw;
  });

  return Papa.unparse(rows, {
    columns: state.columns,
  });
};
