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

export type Shelf = {
  id: string;
  bookIds: string[];
};

export type Bookcase = {
  id: string;
  name: string;
  shelfIds: string[];
  settings: {
    shelfCount: number;
  };
};

export type LibraryLayout = {
  libraryId: string;
  bookcases: Bookcase[];
  shelvesById: Record<string, Shelf>;
};
