import { useEffect, useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { Book } from "../db/schema";
import { BookCard } from "./BookCard";
import { ViewMode } from "./AppLayout";

type BookGridProps = {
  books: Book[];
  view: ViewMode;
  onSelect: (id: number) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
};

const estimateListHeight = () => Math.max(320, window.innerHeight - 360);

export const BookGrid = ({ books, view, onSelect, selectedIds, onToggleSelect }: BookGridProps) => {
  const layoutClass = view === "list" ? "list" : "grid";
  const [listHeight, setListHeight] = useState(() => estimateListHeight());

  useEffect(() => {
    const handleResize = () => setListHeight(estimateListHeight());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      <section className="list-virtualized">
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
