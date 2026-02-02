import { useMemo, useState } from "react";
import { Book } from "../db/schema";
import { SpinePreviewRail } from "./SpinePreviewRail";
import { SpineStackLiteral } from "./SpineStackLiteral";

type SpinesWithRailFilters = {
  status: string;
  collection: string;
  format: string;
};

type SpinesWithRailProps = {
  books: Book[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onOpenBook: (id: number) => void;
  query: string;
  filters: SpinesWithRailFilters;
};

export const SpinesWithRail = ({
  books,
  activeId,
  onSelect,
  onOpenBook,
  query,
  filters,
}: SpinesWithRailProps) => {
  const [previewId, setPreviewId] = useState<number | null>(null);
  const previewBook = useMemo(() => {
    if (previewId != null) {
      return books.find((book) => book.id === previewId) ?? null;
    }
    if (activeId != null) {
      return books.find((book) => book.id === activeId) ?? null;
    }
    return books[0] ?? null;
  }, [activeId, books, previewId]);

  const selectedBook = useMemo(() => {
    if (activeId != null) {
      return books.find((book) => book.id === activeId) ?? null;
    }
    return books[0] ?? null;
  }, [activeId, books]);

  const shelfLabel = useMemo(() => {
    const parts: string[] = [];
    if (query.trim()) {
      parts.push(`matching "${query.trim()}"`);
    }
    if (filters.status) {
      parts.push(`status ${filters.status.replace("_", " ")}`);
    }
    if (filters.collection) {
      parts.push(`collection ${filters.collection}`);
    }
    if (filters.format) {
      parts.push(`format ${filters.format}`);
    }
    return parts.length ? `Shelf spines ${parts.join(", ")}` : "Shelf spines";
  }, [filters.collection, filters.format, filters.status, query]);

  return (
    <div className="spinesLayout">
      <SpineStackLiteral
        books={books}
        activeId={activeId}
        onSelect={onSelect}
        onOpen={onOpenBook}
        onPreview={setPreviewId}
        ariaLabel={shelfLabel}
        onEscape={() => {
          const input = document.querySelector<HTMLInputElement>(".input-dominant");
          input?.focus();
        }}
      />
      <SpinePreviewRail
        book={previewBook}
        previewing={previewBook?.id !== selectedBook?.id}
      />
    </div>
  );
};
