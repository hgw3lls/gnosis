import Dexie, { Table } from "dexie";
import { Book } from "./schema";

export class LibraryDB extends Dexie {
  books!: Table<Book, number>;

  constructor() {
    super("libraryDB");
    this.version(1).stores({
      books: "id, title, authors, tags, collections, projects, status",
    });
  }
}

export const db = new LibraryDB();
