import { Book } from "../db/schema";

export type ReviewIssue =
  | "missing_title_or_authors"
  | "missing_publish_year"
  | "missing_status_or_location"
  | "missing_cover_image";

export const getReviewIssues = (book: Book): ReviewIssue[] => {
  const issues: ReviewIssue[] = [];
  if (!book.title.trim() || !book.authors.trim()) {
    issues.push("missing_title_or_authors");
  }
  if (!book.publish_year.trim()) {
    issues.push("missing_publish_year");
  }
  if (!book.status.trim() || !book.location.trim()) {
    issues.push("missing_status_or_location");
  }
  if (!book.cover_image.trim()) {
    issues.push("missing_cover_image");
  }
  return issues;
};

export const needsReview = (book: Book) => getReviewIssues(book).length > 0;

const STORAGE_KEY = "gnosis.reviewedBookIds.v1";

export const loadReviewedBookIds = (): number[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed) ? parsed.filter((value) => Number.isFinite(value)) : [];
  } catch {
    return [];
  }
};

export const persistReviewedBookIds = (ids: number[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};
