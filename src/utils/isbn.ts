export type IsbnParseResult = {
  raw: string;
  normalized: string;
  isbn10: string | null;
  isbn13: string | null;
  isValid: boolean;
};

export const normalizeIsbnInput = (value: string) => value.replace(/[^0-9Xx]/g, "").toUpperCase();

const computeIsbn13CheckDigit = (first12: string) => {
  const sum = first12
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
};

export const isValidIsbn10 = (isbn10: string) => {
  const normalized = normalizeIsbnInput(isbn10);
  if (!/^\d{9}[\dX]$/.test(normalized)) {
    return false;
  }
  const sum = normalized.split("").reduce((acc, digit, index) => {
    const value = digit === "X" ? 10 : Number(digit);
    return acc + value * (10 - index);
  }, 0);
  return sum % 11 === 0;
};

export const isValidIsbn13 = (isbn13: string) => {
  const normalized = normalizeIsbnInput(isbn13);
  if (!/^97[89]\d{10}$/.test(normalized)) {
    return false;
  }
  const expectedCheckDigit = computeIsbn13CheckDigit(normalized.slice(0, 12));
  return normalized.slice(-1) === expectedCheckDigit;
};

export const convertIsbn10To13 = (isbn10: string) => {
  const normalized = normalizeIsbnInput(isbn10);
  if (!isValidIsbn10(normalized)) {
    return null;
  }
  const first12 = `978${normalized.slice(0, 9)}`;
  return `${first12}${computeIsbn13CheckDigit(first12)}`;
};

export const parseIsbn = (value: string): IsbnParseResult => {
  const normalized = normalizeIsbnInput(value);
  if (normalized.length === 13) {
    return {
      raw: value,
      normalized,
      isbn10: null,
      isbn13: isValidIsbn13(normalized) ? normalized : null,
      isValid: isValidIsbn13(normalized),
    };
  }

  if (normalized.length === 10) {
    const valid = isValidIsbn10(normalized);
    return {
      raw: value,
      normalized,
      isbn10: valid ? normalized : null,
      isbn13: valid ? convertIsbn10To13(normalized) : null,
      isValid: valid,
    };
  }

  return {
    raw: value,
    normalized,
    isbn10: null,
    isbn13: null,
    isValid: false,
  };
};
