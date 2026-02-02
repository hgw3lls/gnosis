import { CSSProperties, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Book } from "../db/schema";

type SpineShelfFilters = {
  status: string;
  collection: string;
  format: string;
};

type SpineShelfProps = {
  books: Book[];
  activeId: number | null;
  onSelect: (id: number) => void;
  query: string;
  filters: SpineShelfFilters;
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
  query,
  filters,
}: SpineShelfProps) => {
  const navigate = useNavigate();
  const spineRefs = useRef(new Map<number, HTMLDivElement | null>());
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

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

  const handleNavigate = (id: number) => {
    onSelect(id);
    navigate(`/book/${id}`);
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
    <section className="spineShelf" aria-label={shelfLabel}>
      <div className="spineRail" role="listbox" aria-label="Book spines">
        {books.map((book, index) => {
          const width = getSpineWidth(book);
          const isActive = book.id === activeId || (!activeId && index === 0);
          return (
            <div
              key={book.id}
              ref={(node) => spineRefs.current.set(book.id, node)}
              className={`spine ${isActive ? "active" : ""}`}
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
              onClick={() => handleNavigate(book.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleNavigate(book.id);
                  return;
                }
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  handleMove(1);
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  handleMove(-1);
                }
              }}
            >
              <span className="spine-title">{book.title || "Untitled"}</span>
              <span className="spine-author">
                {book.authors || "Unknown author"}
              </span>
              <span className="spine-dot" aria-hidden="true" />
              <div className="spine-meta" aria-hidden={!isActive}>
                {[book.publish_year, book.format, book.status.replace("_", " ")]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
