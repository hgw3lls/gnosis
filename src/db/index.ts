import Dexie, { Table } from "dexie";
import { Book } from "../utils/schema";

export class LibraryDB extends Dexie {
  books!: Table<Book, number>;

  constructor() {
    super("gnosis-library");
    this.version(1).stores({
      books: "id, title, authors, status, tags",
    });
  }
}

export const db = new LibraryDB();
