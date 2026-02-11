export type SearchFilter =
  | { type: "tag"; value: string }
  | { type: "status"; value: string }
  | { type: "author"; value: string }
  | { type: "year"; op: ">" | "<" | ">=" | "<=" | "="; value: number };

type YearOperator = ">" | "<" | ">=" | "<=" | "=";

export type ParsedSearchQuery = {
  text: string;
  filters: SearchFilter[];
};

const tokenPattern = /(?:[^\s"]+|"[^"]*")+/g;

const stripQuotes = (value: string) => value.replace(/^"|"$/g, "");

export const parseSearchQuery = (query: string): ParsedSearchQuery => {
  const tokens = query.match(tokenPattern) ?? [];
  const filters: SearchFilter[] = [];
  const textTokens: string[] = [];

  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (lower.startsWith("tag:")) {
      filters.push({ type: "tag", value: stripQuotes(token.slice(4)) });
      return;
    }
    if (lower.startsWith("status:")) {
      filters.push({ type: "status", value: stripQuotes(token.slice(7)) });
      return;
    }
    if (lower.startsWith("author:")) {
      filters.push({ type: "author", value: stripQuotes(token.slice(7)) });
      return;
    }
    if (lower.startsWith("year:")) {
      const payload = token.slice(5);
      const match = payload.match(/^(>=|<=|=|>|<)?(\d{4})$/);
      if (match) {
        const [, op = "=", value] = match;
        filters.push({ type: "year", op: op as YearOperator, value: Number(value) });
        return;
      }
    }
    textTokens.push(token);
  });

  return { text: textTokens.join(" ").trim(), filters };
};
