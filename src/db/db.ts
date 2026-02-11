import Dexie, { Table } from "dexie";
import { Book, Bookcase } from "./schema";

export class LibraryDB extends Dexie {
  books!: Table<Book, number>;
  bookcases!: Table<Bookcase, number>;

  constructor() {
    super("libraryDB");
    this.version(1).stores({
      books: "id, title, authors, tags, collections, projects, status",
    });
    this.version(2).stores({
      books: "id, title, authors, tags, collections, projects, status",
      bookcases: "id, name",
    });
    this.version(3).stores({
      books:
        "id, title, authors, tags, collections, projects, status, location, isbn13, updated_at",
      bookcases: "id, name",
    });

    this.version(4).stores({
      books:
        "id, title, authors, tags, collections, projects, status, location, format, language, publish_year, isbn13, updated_at",
      bookcases: "id, name",
    });

    this.version(5).stores({
      books:
        "id, title, authors, tags, collections, projects, status, format, language, publish_year, isbn13, updated_at",
      bookcases: "id, name",
    });
  }
}

export const db = new LibraryDB();
