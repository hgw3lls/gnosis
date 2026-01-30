export const uniqueIdFromFields = (fields: string[]): string => {
  const base = fields
    .filter(Boolean)
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  return `book-${Math.abs(hash)}`;
};
