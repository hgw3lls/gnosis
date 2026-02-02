import { CSSProperties, useMemo, useRef } from "react";
import { Book } from "../db/schema";

type SpineStackLiteralProps = {
  books: Book[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onPreview: (id: number | null) => void;
  ariaLabel?: string;
  onEscape?: () => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getTitleWidth = (title: string) => {
  if (!title) {
    return 32;
  }
  const width = 28 + (title.length % 5) * 2;
  return clamp(width, 28, 36);
};

export const SpineStackLiteral = ({
  books,
  activeId,
  onSelect,
  onOpen,
  onPreview,
  ariaLabel,
  onEscape,
}: SpineStackLiteralProps) => {
  const rowRefs = useRef(new Map<number, HTMLDivElement | null>());
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const focusRow = (id: number) => {
    const node = rowRefs.current.get(id);
    if (!node) {
      return;
    }
    node.focus({ preventScroll: true });
    node.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  };

  const handleMove = (delta: number) => {
    if (books.length === 0) {
      return;
    }
    const currentIndex = Math.max(
      0,
      books.findIndex((book) => book.id === activeId)
    );
    const nextIndex = clamp(currentIndex + delta, 0, books.length - 1);
    const nextId = books[nextIndex]?.id;
    if (nextId == null) {
      return;
    }
    onSelect(nextId);
    focusRow(nextId);
  };

  if (books.length === 0) {
    return (
      <div className="panel spineShelf-empty" role="status">
        No books match your filters yet.
      </div>
    );
  }

  return (
    <section className="literalSpineList" aria-label={ariaLabel}>
      {books.map((book, index) => {
        const isActive = book.id === activeId || (!activeId && index === 0);
        const titleWidth = getTitleWidth(book.title);
        return (
          <div
            key={book.id}
            ref={(node) => rowRefs.current.set(book.id, node)}
            className={`literalSpineRow ${isActive ? "active" : ""}`}
            role="button"
            tabIndex={isActive ? 0 : -1}
            style={
              {
                "--spine-title-width": `${titleWidth}px`,
              } as CSSProperties
            }
            onClick={() => {
              onSelect(book.id);
              onOpen(book.id);
            }}
            onMouseEnter={() => onPreview(book.id)}
            onMouseLeave={() => onPreview(null)}
            onFocus={() => onPreview(book.id)}
            onBlur={() => onPreview(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSelect(book.id);
                onOpen(book.id);
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                handleMove(1);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                handleMove(-1);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onEscape?.();
              }
            }}
          >
            <span className="literalSpineActiveMarker" aria-hidden="true" />
            <span className="literalSpineTitleBlock">
              {book.title || "Untitled"}
            </span>
            <span className="literalSpineMeta">
              <span className="literalSpineMetaTitle">
                {book.title || "Untitled"}
              </span>
              <span className="literalSpineMetaLine">
                {book.authors || "Unknown author"}
              </span>
              <span className="literalSpineMetaLine">
                {[book.publish_year, book.format, book.status.replace("_", " ")]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="pillStatus">{book.status.replace("_", " ")}</span>
            </span>
          </div>
        );
      })}
    </section>
  );
};
