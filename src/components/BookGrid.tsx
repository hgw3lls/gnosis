import { Book } from "../utils/schema";
import { BookCard } from "./BookCard";

type BookGridProps = {
  books: Book[];
  view: "grid" | "list";
  onSelect: (id: number) => void;
};

export const BookGrid = ({ books, view, onSelect }: BookGridProps) => {
  return (
    <section className={view === "grid" ? "grid" : "list"}>
      {books.map((book) => (
        <BookCard key={book.id} book={book} view={view} onSelect={onSelect} />
      ))}
    </section>
  );
};
