import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { BookGrid } from "../components/BookGrid";
import { CaseView } from "../components/CaseView";
import { useLibraryStore } from "../app/store";
import { ViewMode } from "../components/AppLayout";
import { normalizeMultiValue } from "../utils/libraryFilters";
import { buildSearchIndexState, runSearch, SearchIndexState } from "../services/searchIndex";
import {
  createSavedSearch,
  loadSavedSearches,
  persistSavedSearches,
  SavedSearch,
} from "../services/savedSearches";

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
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkTagMode, setBulkTagMode] = useState<"add" | "remove">("add");
  const [bulkCollection, setBulkCollection] = useState("");
  const [bulkProject, setBulkProject] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const bulkUpdateBooks = useLibraryStore((state) => state.bulkUpdateBooks);
  const [searchIndex, setSearchIndex] = useState<SearchIndexState>({
    index: null,
    status: "idle",
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() =>
    loadSavedSearches()
  );
  const [saveName, setSaveName] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [savedOpen, setSavedOpen] = useState(false);

  const collections = useMemo(() => {
    const values = new Set<string>();
    books.forEach((book) => {
      normalizeMultiValue(book.collections).forEach((value) => values.add(value));
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
    const results = runSearch(books, searchIndex.index, debouncedQuery);
    const filteredResults = results.filter((book) => {
      const matchesStatus = !status || book.status === status;
      const matchesFormat = !format || book.format === format;
      const matchesCollection =
        !collection || normalizeMultiValue(book.collections).includes(collection);
      return matchesStatus && matchesFormat && matchesCollection;
    });

    return filteredResults.sort((a, b) => {
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
  }, [books, collection, debouncedQuery, format, searchIndex.index, sort, status]);

  const selectedBook = useMemo(
    () => filtered.find((book) => book.id === selectedBookId) ?? null,
    [filtered, selectedBookId]
  );

  useEffect(() => {
    if (view !== "list") {
      setSelectedBookId(null);
    }
  }, [view]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set<number>();
      filtered.forEach((book) => {
        if (prev.has(book.id)) {
          next.add(book.id);
        }
      });
      return next;
    });
  }, [filtered]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    const buildIndex = async () => {
      setSearchIndex((prev) => ({ ...prev, status: "building" }));
      const index = await buildSearchIndexState(books, (status) => {
        if (!active) {
          return;
        }
        setSearchIndex((prev) => ({ ...prev, status }));
      });
      if (active) {
        setSearchIndex({ index, status: "ready" });
      }
    };
    void buildIndex();
    return () => {
      active = false;
    };
  }, [books]);

  useEffect(() => {
    persistSavedSearches(savedSearches);
  }, [savedSearches]);

  const handleSaveSearch = () => {
    if (!query.trim()) {
      return;
    }
    const saved = createSavedSearch(saveName || query, query);
    setSavedSearches((prev) => [saved, ...prev]);
    setSaveName("");
  };

  const handleSelectBook = (id: number) => {
    if (view === "list") {
      setSelectedBookId(id);
      return;
    }
    onSelectBook(id);
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filtered.map((book) => book.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleApplyBulk = async () => {
    if (!selectedIds.size) {
      return;
    }
    const now = new Date().toISOString();
    const updates = filtered
      .filter((book) => selectedIds.has(book.id))
      .map((book) => {
        const next = { ...book };
        if (bulkStatus) {
          next.status = bulkStatus as typeof book.status;
        }
        if (bulkLocation.trim()) {
          next.location = bulkLocation.trim();
        }
        if (bulkTag.trim()) {
          const tags = normalizeMultiValue(book.tags);
          if (bulkTagMode === "add") {
            if (!tags.includes(bulkTag.trim())) {
              tags.push(bulkTag.trim());
            }
          } else {
            const index = tags.indexOf(bulkTag.trim());
            if (index >= 0) {
              tags.splice(index, 1);
            }
          }
          next.tags = tags.join(" | ");
        }
        if (bulkCollection.trim()) {
          const values = normalizeMultiValue(book.collections);
          if (!values.includes(bulkCollection.trim())) {
            values.push(bulkCollection.trim());
          }
          next.collections = values.join(" | ");
        }
        if (bulkProject.trim()) {
          const values = normalizeMultiValue(book.projects);
          if (!values.includes(bulkProject.trim())) {
            values.push(bulkProject.trim());
          }
          next.projects = values.join(" | ");
        }
        if (bulkNotes.trim()) {
          next.notes = `${book.notes || ""}${book.notes ? "\n" : ""}${bulkNotes.trim()}`;
        }
        next.updated_at = now;
        return next;
      });
    await bulkUpdateBooks(updates);
    handleClearSelection();
    setBulkStatus("");
    setBulkLocation("");
    setBulkTag("");
    setBulkCollection("");
    setBulkProject("");
    setBulkNotes("");
  };

  const handleCloseDrawer = () => {
    setSelectedBookId(null);
  };

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
      {selectedIds.size ? (
        <div className="bulk-toolbar">
          <div className="bulk-summary">
            {selectedIds.size} selected
            <button className="text-link" type="button" onClick={handleSelectAll}>
              Select all
            </button>
            <button className="text-link" type="button" onClick={handleClearSelection}>
              Clear
            </button>
          </div>
          <div className="bulk-actions">
            <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
              <option value="">Set status…</option>
              <option value="to_read">To read</option>
              <option value="reading">Reading</option>
              <option value="referenced">Referenced</option>
              <option value="finished">Finished</option>
            </select>
            <input
              className="input"
              value={bulkLocation}
              onChange={(event) => setBulkLocation(event.target.value)}
              placeholder="Set location"
            />
            <div className="bulk-chip">
              <select
                value={bulkTagMode}
                onChange={(event) => setBulkTagMode(event.target.value as "add" | "remove")}
              >
                <option value="add">Add tag</option>
                <option value="remove">Remove tag</option>
              </select>
              <input
                className="input"
                value={bulkTag}
                onChange={(event) => setBulkTag(event.target.value)}
                placeholder="Tag"
              />
            </div>
            <input
              className="input"
              value={bulkCollection}
              onChange={(event) => setBulkCollection(event.target.value)}
              placeholder="Add collection"
            />
            <input
              className="input"
              value={bulkProject}
              onChange={(event) => setBulkProject(event.target.value)}
              placeholder="Add project"
            />
            <input
              className="input"
              value={bulkNotes}
              onChange={(event) => setBulkNotes(event.target.value)}
              placeholder="Append notes"
            />
            <button className="button primary" type="button" onClick={handleApplyBulk}>
              Apply
            </button>
          </div>
        </div>
      ) : null}
      <div className="saved-searches">
        <div className="saved-searches-header">
          <button
            className="button ghost"
            type="button"
            onClick={() => setSavedOpen((prev) => !prev)}
            aria-expanded={savedOpen}
          >
            Saved searches
            <span aria-hidden="true">{savedOpen ? " ▴" : " ▾"}</span>
          </button>
          {searchIndex.status === "building" ? (
            <span className="summary helper">Rebuilding search index…</span>
          ) : null}
        </div>
        {savedOpen ? (
          <div className="saved-searches-panel">
            <div>
              {savedSearches.length ? (
                <div className="saved-searches-list">
                  {savedSearches.map((search) => (
                    <div key={search.id} className="saved-search">
                      <button
                        type="button"
                        className="text-link"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("gnosis:set-search", { detail: search.query })
                          )
                        }
                      >
                        {search.name}
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() =>
                          setSavedSearches((prev) => prev.filter((item) => item.id !== search.id))
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="summary">No saved searches yet.</p>
              )}
            </div>
            <div className="saved-search-create">
              <input
                className="input"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Save current search as"
              />
              <button className="button ghost" type="button" onClick={handleSaveSearch}>
                Save
              </button>
            </div>
            <p className="summary helper">
              Operators: tag:, status:, location:"", year:&gt;=2020, author:
            </p>
          </div>
        ) : null}
      </div>
      {view === "case-spines" ? (
        <CaseView books={filtered} onOpenBook={onSelectBook} />
      ) : (
        <BookGrid
          books={filtered}
          view={view}
          onSelect={handleSelectBook}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      )}
      {view === "list" && selectedBook ? (
        <div className="drawer-overlay" onClick={handleCloseDrawer}>
          <div
            className="drawer-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="drawer-header">
              <div>
                <p className="drawer-kicker">Book details</p>
                <h3 className="drawer-title">{selectedBook.title || "Untitled"}</h3>
                <p className="drawer-meta">
                  {selectedBook.authors || "Unknown author"}
                </p>
              </div>
              <button className="icon-button" type="button" onClick={handleCloseDrawer}>
                ×
              </button>
            </header>
            <div className="drawer-body">
              <div className="drawer-cover">
                {selectedBook.cover_image ? (
                  <img
                    src={selectedBook.cover_image}
                    alt={`Cover of ${selectedBook.title || "Untitled"}`}
                  />
                ) : (
                  <span>No cover</span>
                )}
              </div>
              <div className="drawer-info">
                <p>
                  {[selectedBook.publisher, selectedBook.publish_year]
                    .filter(Boolean)
                    .join(" · ") || "Publisher and year unknown"}
                </p>
                <p>Status: {selectedBook.status.replace("_", " ")}</p>
                {selectedBook.tags ? <p>Tags: {selectedBook.tags}</p> : null}
                {selectedBook.collections ? (
                  <p>Collections: {selectedBook.collections}</p>
                ) : null}
              </div>
            </div>
            <div className="drawer-actions">
              <button
                className="button ghost"
                type="button"
                onClick={handleCloseDrawer}
              >
                Close
              </button>
              <button
                className="button primary"
                type="button"
                onClick={() => onSelectBook(selectedBook.id)}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
