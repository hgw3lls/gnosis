import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
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
  const [collection, setCollection] = useState("");
  const [format, setFormat] = useState("");
  const [sort, setSort] = useState("updated");

  const collections = useMemo(() => {
    const values = new Set<string>();
    books.forEach((book) => {
      const raw = book.collections?.trim();
      if (!raw) {
        return;
      }
      const parts = raw.includes("|") ? raw.split("|") : [raw];
      parts.map((value) => value.trim()).filter(Boolean).forEach((value) => values.add(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const formats = useMemo(() => {
    const values = new Set<string>();
    books.forEach((book) => {
      const value = book.format?.trim();
      if (value) {
        values.add(value);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const results = books.filter((book) => {
      const matchesQuery =
        !term ||
        [
          book.title,
          book.authors,
          book.tags,
          book.collections,
          book.projects,
          book.isbn13,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesStatus = !status || book.status === status;
      const matchesFormat = !format || book.format === format;
      const matchesCollection =
        !collection ||
        (book.collections?.includes("|")
          ? book.collections
              .split("|")
              .map((value) => value.trim())
              .includes(collection)
          : book.collections === collection);
      return matchesQuery && matchesStatus && matchesFormat && matchesCollection;
    });

    return results.sort((a, b) => {
      switch (sort) {
        case "added":
          return b.added_at.localeCompare(a.added_at);
        case "author":
          return (a.authors || "").localeCompare(b.authors || "");
        case "year": {
          const yearA = Number.parseInt(a.publish_year || "0", 10);
          const yearB = Number.parseInt(b.publish_year || "0", 10);
          return yearB - yearA;
        }
        case "updated":
        default:
          return b.updated_at.localeCompare(a.updated_at);
      }
    });
  }, [books, collection, format, query, sort, status]);

  return (
    <section>
      {books.length === 0 ? (
        <div className="panel empty-state">
          <h2>Your library is empty</h2>
          <p>Import your CSV to begin tracking your collection offline.</p>
          <NavLink to="/import" className="button primary">
            Import CSV
          </NavLink>
        </div>
      ) : null}
      <div className="toolbar">
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="updated">Recently updated</option>
            <option value="added">Recently added</option>
            <option value="author">Author A–Z</option>
            <option value="year">Year desc</option>
          </select>
        </div>
        <div className="chip-group">
          <span className="chip-label">Status</span>
          {[
            ["", "All"],
            ["to_read", "To read"],
            ["reading", "Reading"],
            ["referenced", "Referenced"],
            ["finished", "Finished"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip ${status === value ? "active" : ""}`}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="chip-group">
          <span className="chip-label">Collections</span>
          <button
            type="button"
            className={`chip ${collection === "" ? "active" : ""}`}
            onClick={() => setCollection("")}
          >
            All
          </button>
          {collections.map((value) => (
            <button
              key={value}
              type="button"
              className={`chip ${collection === value ? "active" : ""}`}
              onClick={() => setCollection(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="chip-group">
          <span className="chip-label">Format</span>
          <button
            type="button"
            className={`chip ${format === "" ? "active" : ""}`}
            onClick={() => setFormat("")}
          >
            All
          </button>
          {formats.map((value) => (
            <button
              key={value}
              type="button"
              className={`chip ${format === value ? "active" : ""}`}
              onClick={() => setFormat(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="summary">{filtered.length} of {books.length} books</div>
      <BookGrid books={filtered} view={view} onSelect={onSelectBook} />
    </section>
  );
};
