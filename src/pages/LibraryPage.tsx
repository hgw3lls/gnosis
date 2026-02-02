import { useMemo, useState } from "react";
import { BookGrid } from "../components/BookGrid";
import { useLibraryStore } from "../app/store";
import { ViewMode } from "../components/AppLayout";

type LibraryPageProps = {
  onSelectBook: (id: number) => void;
  query: string;
  view: ViewMode;
};

export const LibraryPage = ({ onSelectBook, query, view }: LibraryPageProps) => {
  const books = useLibraryStore((state) => state.books);
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
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="to_read">To read</option>
            <option value="reading">Reading</option>
            <option value="referenced">Referenced</option>
            <option value="finished">Finished</option>
          </select>
        </div>
      </div>
      <div className="summary">{filtered.length} of {books.length} books</div>
      <BookGrid books={filtered} view={view} onSelect={onSelectBook} />
    </section>
  );
};
