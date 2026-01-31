import type { Book } from '../types/library';

const trimValue = (value: string | undefined) => value?.trim() ?? '';

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

export const parseCsvText = (
  csvText: string,
): { rows: Record<string, string>[]; columns: string[] } => {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const dataLines = lines.filter((line) => line.trim().length > 0);
  if (dataLines.length === 0) {
    return { rows: [], columns: [] };
  }
  const columns = parseCsvLine(dataLines[0]).map((column, index) => {
    const trimmed = column.trim();
    if (index === 0) {
      return trimmed.replace(/^\uFEFF/, '');
    }
    return trimmed;
  });
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < dataLines.length; i += 1) {
    const values = parseCsvLine(dataLines[i]);
    const row: Record<string, string> = {};
    columns.forEach((column, index) => {
      row[column] = trimValue(values[index] ?? '');
    });
    rows.push(row);
  }

  return { rows, columns };
};

const quoteValue = (value: string) => {
  if (value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  if (value.includes(',') || value.includes('\n')) {
    return `"${value}"`;
  }
  return value;
};

export const exportBooksToCsv = (books: Book[], columns: string[]): string => {
  const resolvedColumns =
    columns.length > 0 ? columns : Array.from(new Set(books.flatMap((book) => Object.keys(book.raw))));
  const header = resolvedColumns.join(',');
  const lines = books.map((book) => {
    const row = { ...book.raw };
    row.Title = book.title ?? row.Title ?? '';
    row.Author = book.author ?? row.Author ?? '';
    row.Publisher = book.publisher ?? row.Publisher ?? '';
    row.Language = book.language ?? row.Language ?? '';
    row.Format = book.format ?? row.Format ?? '';
    row.Confidence = book.confidence ?? row.Confidence ?? '';
    row.Notes = book.notes ?? row.Notes ?? '';
    row.Publish_Year = book.publishYear ?? row.Publish_Year ?? '';
    row.Page_Count = book.pageCount ?? row.Page_Count ?? '';
    row.Subjects = book.subjects ? book.subjects.join(', ') : row.Subjects ?? '';
    row.Tags = book.tags ? book.tags.join(', ') : row.Tags ?? '';
    row.Use_Status = book.useStatus ?? row.Use_Status ?? '';
    row.Source = book.source ?? row.Source ?? '';
    row.ISBN_13 = book.isbn13 ?? row.ISBN_13 ?? '';
    row.OpenLibrary_OLID = book.olid ?? row.OpenLibrary_OLID ?? '';
    row.Cover_S = book.coverS ?? row.Cover_S ?? '';
    row.Cover_M = book.coverM ?? row.Cover_M ?? '';
    row.Cover_L = book.coverL ?? row.Cover_L ?? '';
    row.Primary_Shelf = book.primaryShelf ?? row.Primary_Shelf ?? '';
    resolvedColumns.forEach((column) => {
      if (!(column in row)) {
        row[column] = '';
      }
    });
    return resolvedColumns.map((column) => quoteValue(row[column] ?? '')).join(',');
  });
  return [header, ...lines].join('\n');
};
