import type { Book, CsvRow } from '../types';
import { uniqueIdFromFields } from './ids';
import { normalizeRow } from './csv';

const getFirstValue = (row: CsvRow, keys: string[]) => {
  for (const key of keys) {
    if (row[key]) {
      return row[key];
    }
  }
  return '';
};

const resolveRowId = (row: CsvRow, fallback: string) => {
  const holdingId = getFirstValue(row, ['HoldingID', 'Holding Id', 'Holding_ID']);
  if (holdingId) {
    return holdingId;
  }
  const originalId = getFirstValue(row, ['OriginalID', 'Original Id', 'Original_ID']);
  if (originalId) {
    return originalId;
  }
  return fallback;
};

export const booksFromRows = (rows: CsvRow[], header: string[]) => {
  const booksById: Record<string, Book> = {};
  const rowOrder: string[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row) => {
    const normalizedRow = normalizeRow(row, header);
    const title = getFirstValue(normalizedRow, ['Title', 'title', 'Book Title']);
    const author = getFirstValue(normalizedRow, ['Author', 'author']);
    const year = getFirstValue(normalizedRow, ['Year', 'Publish_Year', 'year']);
    const hashId = uniqueIdFromFields([author, title, year]);
    const baseId = resolveRowId(normalizedRow, hashId);

    let id = baseId || hashId;
    let suffix = 1;
    while (seenIds.has(id)) {
      id = `${baseId || hashId}-${suffix}`;
      suffix += 1;
    }
    seenIds.add(id);
    rowOrder.push(id);

    booksById[id] = {
      id,
      title,
      author,
      year,
      isbn: getFirstValue(normalizedRow, ['ISBN', 'ISBN_13', 'isbn']),
      publisher: getFirstValue(normalizedRow, ['Publisher', 'publisher']),
      raw: normalizedRow,
    };
  });

  return { booksById, rowOrder, header };
};
