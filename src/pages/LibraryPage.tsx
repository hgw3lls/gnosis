import { useMemo, useState } from "react";
import clsx from "clsx";
import { BookGrid } from "../components/BookGrid";
import { useLibraryStore } from "../app/store";

type LibraryPageProps = {
  onSelectBook: (id: number) => void;
};

export const LibraryPage = ({ onSelectBook }: LibraryPageProps) => {
  const books = useLibraryStore((state) => state.books);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesQuery =
        !term ||
        [book.title, book.authors, book.tags]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesStatus = !status || book.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [books, query, status]);

  return (
    <section>
      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Search titles, authors, tags"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="to_read">To read</option>
            <option value="reading">Reading</option>
            <option value="referenced">Referenced</option>
            <option value="finished">Finished</option>
          </select>
          <div className="view-toggle">
            <button
              className={clsx("toggle", view === "grid" && "active")}
              type="button"
              onClick={() => setView("grid")}
            >
              Grid
            </button>
            <button
              className={clsx("toggle", view === "list" && "active")}
              type="button"
              onClick={() => setView("list")}
            >
              List
            </button>
          </div>
        </div>
      </div>
      <div className="summary">{filtered.length} of {books.length} books</div>
      <BookGrid books={filtered} view={view} onSelect={onSelectBook} />
    </section>
  );
};
