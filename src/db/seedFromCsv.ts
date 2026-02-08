import { db } from "./db";
import { loadBooksFromCsv } from "./loadBooksFromCsv";

export const seedFromCsv = async () => {
  try {
    const csvText = await fetch(`${import.meta.env.BASE_URL}library.csv`).then(
      async (res) => (res.ok ? res.text() : null),
    );

    if (!csvText) {
      return;
    }

    const books = await loadBooksFromCsv(csvText);
    await db.books.clear();
    await db.books.bulkAdd(books);
  } catch (error) {
    console.warn("CSV seed failed", error);
  }
};
