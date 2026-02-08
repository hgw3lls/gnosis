import clsx from "clsx";
import { Book } from "../db/schema";
import { ViewMode } from "./AppLayout";

type BookCardProps = {
  book: Book;
  view: ViewMode;
  onSelect: (id: number) => void;
};

export const BookCard = ({ book, view, onSelect }: BookCardProps) => {
  return (
    <article
      className={clsx("card", view === "list" && "list")}
      tabIndex={0}
      role="button"
      aria-label={`Open ${book.title || "Untitled"}`}
      onClick={() => onSelect(book.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(book.id);
        }
      }}
    >
      <div
        className="cover"
        style={
          view === "list"
            ? { maxWidth: "80px", minWidth: "80px", aspectRatio: "2 / 3" }
            : undefined
        }
      >
        {book.cover_image ? (
          <img src={book.cover_image} alt={`Cover of ${book.title || "Untitled"}`} loading="lazy" />
        ) : (
          <span>No cover</span>
        )}
      </div>
      <div>
        <h3>{book.title || "Untitled"}</h3>
        <p>{book.authors || "Unknown author"}</p>
        {book.publisher || book.publish_year ? (
          <p>
            {[book.publisher, book.publish_year].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <span className="badge">{book.status.replace("_", " ")}</span>
      </div>
    </article>
  );
};
