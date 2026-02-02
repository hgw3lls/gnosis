export const normalizeMultiValue = (value?: string) =>
  value
    ? value
        .split("|")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
