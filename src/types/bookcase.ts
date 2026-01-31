export type Book = {
  id: string;
  title: string;
  author?: string;
};

export type Shelf = {
  id: string;
  bookIds: string[];
};

export type Bookcase = {
  id: string;
  name: string;
  shelfIds: string[];
};

export type LibraryState = {
  booksById: Record<string, Book>;
  shelvesById: Record<string, Shelf>;
  bookcases: Bookcase[];
};
