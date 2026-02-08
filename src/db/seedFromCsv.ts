import { db } from "./db";
import { parseCsvText } from "../utils/csv";

export const seedFromCsv = async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}library.csv`);
    if (!response.ok) {
      return;
    }
    const text = await response.text();
    const books = parseCsvText(text);
    await db.books.clear();
    await db.books.bulkAdd(books);
  } catch (error) {
    console.warn("CSV seed failed", error);
  }
};
