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
  }
}

export const db = new LibraryDB();
