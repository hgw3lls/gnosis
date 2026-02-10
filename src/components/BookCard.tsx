import clsx from "clsx";
import { Book } from "../db/schema";
import { ViewMode } from "./AppLayout";

type BookCardProps = {
  book: Book;
  view: ViewMode;
  onSelect: (id: number) => void;
  selected?: boolean;
  onToggleSelect?: (id: number, options?: { shiftKey?: boolean }) => void;
};

export const BookCard = ({ book, view, onSelect, selected, onToggleSelect }: BookCardProps) => {
  return (
    <article
      className={clsx("card", view === "list" && "list", selected && "selected")}
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
      {onToggleSelect ? (
        <label className="card-select">
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={(event) => onToggleSelect(book.id, { shiftKey: event.nativeEvent.shiftKey })}
            onClick={(event) => event.stopPropagation()}
          />
        </label>
      ) : null}
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
