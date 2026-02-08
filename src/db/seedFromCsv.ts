import { loadBooksFromCsv } from "./loadBooksFromCsv";

export async function seedFromCsv(): Promise<number> {
  const response = await fetch(`${import.meta.env.BASE_URL}library.csv`);

  if (!response.ok) {
    throw new Error("Failed to fetch library.csv");
  }

  const csvText = await response.text();
  const books = await loadBooksFromCsv(csvText);
  return books.length;
}
