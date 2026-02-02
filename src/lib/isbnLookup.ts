export type BookMeta = {
  isbn13: string;
  title: string;
  authors: string;
  publishYear: string;
  publisher: string;
  coverImage: string;
};

export const sanitizeIsbnDigits = (value: string) => value.replace(/\D/g, "");

export const isValidIsbn13 = (value: string) => {
  const digits = sanitizeIsbnDigits(value);
  return digits.length === 13 && (digits.startsWith("978") || digits.startsWith("979"));
};

export const lookupByIsbn13 = async (isbn: string): Promise<BookMeta | null> => {
  const normalized = sanitizeIsbnDigits(isbn);
  if (!isValidIsbn13(normalized)) {
    return null;
  }

  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${normalized}&format=json&jscmd=data`,
  );
  if (!response.ok) {
    throw new Error("Open Library lookup failed.");
  }

  const data = (await response.json()) as Record<string, any>;
  const entry = data[`ISBN:${normalized}`];
  if (!entry) {
    return null;
  }

  return {
    isbn13: normalized,
    title: entry.title ?? "",
    authors: Array.isArray(entry.authors)
      ? entry.authors.map((author: { name?: string }) => author.name).filter(Boolean).join(", ")
      : "",
    publishYear: entry.publish_date ?? "",
    publisher: Array.isArray(entry.publishers)
      ? entry.publishers.map((publisher: { name?: string }) => publisher.name).filter(Boolean).join(", ")
      : "",
    coverImage: `https://covers.openlibrary.org/b/isbn/${normalized}-L.jpg`,
  };
};
