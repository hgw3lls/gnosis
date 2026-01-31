import type { Book } from '../types/library';
import { ink } from './tokens';

const inkPlates = [ink.black, ink.crimson, ink.cobalt, ink.moss, ink.gold, ink.plum];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getCustomColor = (book: Book) =>
  book.raw?.CustomColor ||
  book.raw?.Custom_Color ||
  book.raw?.SpineColor ||
  book.raw?.Spine_Color ||
  book.raw?.Color ||
  book.raw?.Colour ||
  '';

export const getPlateColor = (key: string) => {
  if (!key) {
    return inkPlates[0];
  }
  return inkPlates[hashString(key) % inkPlates.length];
};

export const getBookPlateColor = (book: Book, fallbackKey: string) =>
  getCustomColor(book) || getPlateColor(fallbackKey);

const hexToRgb = (hex: string) => {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length !== 6) {
    return null;
  }
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
};

const getLuminance = (color: string) => {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return 1;
  }
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
};

export const getPlateTextColor = (color: string) =>
  getLuminance(color) > 0.6 ? ink.black : '#f7f2e8';
