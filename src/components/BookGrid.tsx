import { Book } from "../db/schema";
import { BookCard } from "./BookCard";
import { ViewMode } from "./AppLayout";

type BookGridProps = {
  books: Book[];
  view: ViewMode;
  onSelect: (id: number) => void;
};

export const BookGrid = ({ books, view, onSelect }: BookGridProps) => {
  const layoutClass =
    view === "list" ? "list" : view === "stack" ? "stack" : "grid";

  return (
    <section className={layoutClass}>
      {books.map((book) => (
        <BookCard key={book.id} book={book} view={view} onSelect={onSelect} />
      ))}
    </section>
  );
};
