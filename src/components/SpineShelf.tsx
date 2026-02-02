import { CSSProperties, useMemo, useRef } from "react";
import { Book } from "../db/schema";

type SpineShelfProps = {
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

const getSpineWidth = (book: Book) => {
  const year = Number.parseInt(book.publish_year || "0", 10);
  const seed = Number.isNaN(year) ? book.title.length : year;
  const width = 28 + (seed % 9) * 2;
  return clamp(width, 28, 44);
};

export const SpineShelf = ({
  books,
  activeId,
  onSelect,
  onOpen,
  onPreview,
  ariaLabel,
  onEscape,
}: SpineShelfProps) => {
  const spineRefs = useRef(new Map<number, HTMLDivElement | null>());
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const focusSpine = (id: number) => {
    const node = spineRefs.current.get(id);
    if (!node) {
      return;
    }
    node.focus({ preventScroll: true });
    node.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      inline: "center",
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
    focusSpine(nextId);
  };

  if (books.length === 0) {
    return (
      <div className="panel spineShelf-empty" role="status">
        No books match your filters yet.
      </div>
    );
  }

  return (
    <section className="spineShelf" aria-label={ariaLabel}>
      <div className="spineRail" role="listbox" aria-label="Book spines">
        {books.map((book, index) => {
          const width = getSpineWidth(book);
          const isActive = book.id === activeId || (!activeId && index === 0);
          return (
            <div
              key={book.id}
              ref={(node) => spineRefs.current.set(book.id, node)}
              className={`spine ${isActive ? "spineActive" : ""}`}
              role="option"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              style={
                {
                  "--spine-width": `${width}px`,
                  "--spine-hover-width": `${width + 8}px`,
                  "--spine-active-width": `${width + 16}px`,
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
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  handleMove(1);
                }
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  handleMove(-1);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onEscape?.();
                }
              }}
            >
              <span className="spine-title">{book.title || "Untitled"}</span>
              <span className="spine-author">
                {book.authors || "Unknown author"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
