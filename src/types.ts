export type CsvRow = Record<string, string>;

export type Book = {
  id: string;
  title: string;
  author?: string;
  year?: string;
  isbn?: string;
  publisher?: string;
  raw: CsvRow;
};
