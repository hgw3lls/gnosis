import clsx from "clsx";
import { Book } from "../utils/schema";

type BookCardProps = {
  book: Book;
  view: "grid" | "list";
  onSelect: (id: number) => void;
};

export const BookCard = ({ book, view, onSelect }: BookCardProps) => {
  return (
    <article className={clsx("card", view === "list" && "list")} onClick={() => onSelect(book.id)}>
      <div className="cover" style={view === "list" ? { maxWidth: "80px", minWidth: "80px", aspectRatio: "2 / 3" } : undefined}>
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
