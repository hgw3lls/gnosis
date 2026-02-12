import { useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { Book } from "../db/schema";
import { BookCard } from "./BookCard";
import { ViewMode } from "./AppLayout";

type BookGridProps = {
  books: Book[];
  view: ViewMode;
  onSelect: (id: number) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number, options?: { shiftKey?: boolean }) => void;
};

const MIN_LIST_HEIGHT = 320;
const LIST_BOTTOM_GUTTER = 20;

const getViewportHeight = () =>
  window.visualViewport?.height ?? window.innerHeight;

export const BookGrid = ({ books, view, onSelect, selectedIds, onToggleSelect }: BookGridProps) => {
  const layoutClass = view === "list" ? "list" : "grid";
  const listContainerRef = useRef<HTMLElement>(null);
  const [listHeight, setListHeight] = useState(MIN_LIST_HEIGHT);

  useEffect(() => {
    if (view !== "list") {
      return;
    }

    const resize = () => {
      const top = listContainerRef.current?.getBoundingClientRect().top ?? 0;
      const available = getViewportHeight() - top - LIST_BOTTOM_GUTTER;
      setListHeight(Math.max(MIN_LIST_HEIGHT, Math.floor(available)));
    };

    resize();
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, [view]);

  const itemData = useMemo(
    () => ({
      books,
      onSelect,
      onToggleSelect,
      selectedIds,
    }),
    [books, onSelect, onToggleSelect, selectedIds]
  );

  if (view === "list") {
    return (
      <section className="list-virtualized" ref={listContainerRef}>
        <List
          height={listHeight}
          itemCount={books.length}
          itemSize={124}
          width="100%"
          itemData={itemData}
        >
          {({ index, style, data }) => {
            const book = data.books[index] as Book;
            return (
              <div style={style}>
                <BookCard
                  book={book}
                  view="list"
                  onSelect={data.onSelect}
                  selected={data.selectedIds.has(book.id)}
                  onToggleSelect={data.onToggleSelect}
                />
              </div>
            );
          }}
        </List>
      </section>
    );
  }

  return (
    <section className={layoutClass}>
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          view={view}
          onSelect={onSelect}
          selected={selectedIds.has(book.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </section>
  );
};
