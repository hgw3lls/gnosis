import { parseCsvText } from "../utils/csv";
import { Book } from "./schema";

export const loadBooksFromCsv = async (text: string): Promise<Book[]> =>
  parseCsvText(text);
