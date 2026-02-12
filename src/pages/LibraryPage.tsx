import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { BookGrid } from "../components/BookGrid";
import { CaseView } from "../components/CaseView";
import { useLibraryStore } from "../app/store";
import { ViewMode } from "../components/AppLayout";
import { normalizeMultiValue } from "../utils/libraryFilters";
import { normalizeBook } from "../db/schema";
import { isValidIsbn13, lookupByIsbn13 } from "../lib/isbnLookup";
import { findIsbn13ByTitleAuthor } from "../services/isbnLookup";
import { buildSearchIndexState, SearchIndexState } from "../services/searchIndex";
import {
  emptyFacets,
  LibraryFacets,
  LibrarySort,
  queryLibraryBookIds,
} from "../services/libraryQueryEngine";
import { detectDuplicateGroups } from "../services/duplicates";
import { getReviewIssues, needsReview } from "../services/reviewQueue";

type LibraryPageProps = {
  onSelectBook: (id: number) => void;
  query: string;
  onQueryChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
};

const toggleValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const makeFacetOptions = (books: ReturnType<typeof useLibraryStore.getState>["books"]) => {
  const collect = (values: string[]) =>
    [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );

  return {
    status: collect(books.map((book) => book.status)),
    format: collect(books.map((book) => book.format)),
    language: collect(books.map((book) => book.language)),
    location: collect(books.map((book) => book.location)),
    tags: collect(books.flatMap((book) => normalizeMultiValue(book.tags))),
    collections: collect(books.flatMap((book) => normalizeMultiValue(book.collections))),
    projects: collect(books.flatMap((book) => normalizeMultiValue(book.projects))),
  };
};

export const LibraryPage = ({ onSelectBook, query, onQueryChange, view, onViewChange }: LibraryPageProps) => {
  const books = useLibraryStore((state) => state.books);
  const [sort, setSort] = useState<LibrarySort>("updated");
  const [facets, setFacets] = useState<LibraryFacets>(emptyFacets);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkTagMode, setBulkTagMode] = useState<"add" | "remove">("add");
  const [bulkCollection, setBulkCollection] = useState("");
  const [bulkProject, setBulkProject] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [metadataScope, setMetadataScope] = useState<"selected" | "all_filtered" | "all_except_selected">("selected");
  const [metadataState, setMetadataState] = useState<"idle" | "updating" | "success" | "error">("idle");
  const [metadataMessage, setMetadataMessage] = useState("");
  const bulkUpdateBooks = useLibraryStore((state) => state.bulkUpdateBooks);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const mergeBooks = useLibraryStore((state) => state.mergeBooks);
  const removeBook = useLibraryStore((state) => state.removeBook);
  const reviewedBookIds = useLibraryStore((state) => state.reviewedBookIds);
  const markReviewed = useLibraryStore((state) => state.markReviewed);
  const [searchIndex, setSearchIndex] = useState<SearchIndexState>({
    index: null,
    status: "idle",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [screenMode, setScreenMode] = useState<"results" | "duplicates" | "review">("results");
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [skippedDuplicateIds, setSkippedDuplicateIds] = useState<Set<number>>(new Set());

  const facetOptions = useMemo(() => makeFacetOptions(books), [books]);

  const filteredIds = useMemo(
    () =>
      queryLibraryBookIds({
        books,
        index: searchIndex.index,
        query,
        facets,
        sort,
      }),
    [books, facets, query, searchIndex.index, sort]
  );

  const filtered = useMemo(() => {
    const map = new Map(books.map((book) => [book.id, book]));
    return filteredIds.map((id) => map.get(id)).filter(Boolean) as typeof books;
  }, [books, filteredIds]);

  const duplicateGroups = useMemo(() => detectDuplicateGroups(books), [books]);
  const visibleDuplicateGroups = useMemo(
    () =>
      duplicateGroups
        .map((group) => ({
          ...group,
          books: [group.books[0], ...group.books.slice(1).filter((book) => !skippedDuplicateIds.has(book.id))],
        }))
        .filter((group) => group.books.length > 1),
    [duplicateGroups, skippedDuplicateIds]
  );
  const reviewBooks = useMemo(
    () => books.filter((book) => needsReview(book) && !reviewedBookIds.has(book.id)),
    [books, reviewedBookIds]
  );

  const handleMarkAllReviewed = () => {
    reviewBooks.forEach((book) => markReviewed(book.id));
  };

  const handleSkipDuplicate = (id: number) => {
    setSkippedDuplicateIds((prev) => new Set(prev).add(id));
  };

  const handleResetSkippedDuplicates = () => {
    setSkippedDuplicateIds(new Set());
  };

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
    setSkippedDuplicateIds((prev) => {
      const next = new Set<number>();
      books.forEach((book) => {
        if (prev.has(book.id)) {
          next.add(book.id);
        }
      });
      return next;
    });
  }, [books]);

  const handleSelectBook = (id: number) => {
    if (view === "list") {
      setSelectedBookId(id);
      return;
    }
    onSelectBook(id);
  };

  const handleToggleSelect = (id: number, options?: { shiftKey?: boolean }) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelect = !next.has(id);

      if (options?.shiftKey && lastSelectedId != null) {
        const ids = filtered.map((book) => book.id);
        const from = ids.indexOf(lastSelectedId);
        const to = ids.indexOf(id);
        if (from >= 0 && to >= 0) {
          const [start, end] = from < to ? [from, to] : [to, from];
          ids.slice(start, end + 1).forEach((value) => {
            if (shouldSelect) {
              next.add(value);
            } else {
              next.delete(value);
            }
          });
          setLastSelectedId(id);
          return next;
        }
      }

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setLastSelectedId(id);
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

  const handleUpdateMetadata = async () => {
    const targets =
      metadataScope === "selected"
        ? filtered.filter((book) => selectedIds.has(book.id))
        : metadataScope === "all_except_selected"
          ? filtered.filter((book) => !selectedIds.has(book.id))
          : filtered;

    if (!targets.length) {
      setMetadataState("error");
      setMetadataMessage("No books match this metadata update scope.");
      return;
    }

    setMetadataState("updating");
    setMetadataMessage(`Updating metadata for ${targets.length} books...`);

    try {
      const updates = [];
      let skipped = 0;

      for (const book of targets) {
        const trimmedIsbn = book.isbn13.trim();
        const seededIsbn = isValidIsbn13(trimmedIsbn) ? trimmedIsbn : "";
        const candidate =
          seededIsbn || !book.title.trim() || !book.authors.trim()
            ? null
            : await findIsbn13ByTitleAuthor(book.title, book.authors, book.publish_year);
        const lookupIsbn = seededIsbn || candidate?.isbn13 || "";
        const meta = lookupIsbn ? await lookupByIsbn13(lookupIsbn) : null;

        if (!meta && !candidate) {
          skipped += 1;
          continue;
        }

        const updated = normalizeBook({
          ...book,
          title: meta?.title || candidate?.title || book.title,
          authors: meta?.authors || candidate?.authors || book.authors,
          publisher: meta?.publisher || candidate?.publisher || book.publisher,
          publish_year: meta?.publishYear || candidate?.publish_year || book.publish_year,
          isbn13: meta?.isbn13 || lookupIsbn || book.isbn13,
          cover_image: book.cover_image || meta?.coverImage || candidate?.cover_image || "",
          updated_at: new Date().toISOString(),
        });

        updates.push(updated);
      }

      await bulkUpdateBooks(updates);
      setMetadataState("success");
      setMetadataMessage(`Metadata updated for ${updates.length} books. Skipped ${skipped}.`);
    } catch {
      setMetadataState("error");
      setMetadataMessage("Metadata update failed. Check your connection and try again.");
    }
  };

  const handleCloseDrawer = () => {
    setSelectedBookId(null);
  };

  const renderFacetBlock = (
    title: string,
    options: string[],
    selected: string[],
    onToggle: (value: string) => void
  ) => (
    <section className="facet-block">
      <p className="facet-title">{title}</p>
      <div className="facet-chip-wrap">
        {options.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip ${selected.includes(value) ? "active" : ""}`}
            onClick={() => onToggle(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <section className="library-page">
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
        <div className="chip-group">
          {[
            ["results", "Results"],
            ["duplicates", `Duplicates (${visibleDuplicateGroups.length})`],
            ["review", `Review (${reviewBooks.length})`],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip ${screenMode === value ? "active" : ""}`}
              onClick={() => setScreenMode(value as typeof screenMode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {screenMode === "duplicates" ? (
        <div className="panel">
          <div className="actions">
            <h3>Duplicate candidates</h3>
            <button
              className="button ghost"
              type="button"
              onClick={handleResetSkippedDuplicates}
              disabled={!skippedDuplicateIds.size}
            >
              Reset skipped
            </button>
          </div>
          {visibleDuplicateGroups.length ? visibleDuplicateGroups.map((group) => {
            const [primary, ...rest] = group.books;
            return (
              <div key={group.key} className="duplicate-group">
                <p className="summary">Match: {group.reason === "isbn" ? "ISBN" : "Title + Author"}</p>
                <p><strong>Primary:</strong> {primary.title || "Untitled"} · {primary.authors || "Unknown"}</p>
                {rest.map((candidate) => (
                  <div key={candidate.id} className="duplicate-row">
                    <span>{candidate.title || "Untitled"} · {candidate.authors || "Unknown"}</span>
                    <div className="duplicate-actions">
                      <button className="button ghost" type="button" onClick={() => void mergeBooks(primary.id, candidate.id)}>
                        Merge into primary
                      </button>
                      <button className="button ghost" type="button" onClick={() => handleSkipDuplicate(candidate.id)}>
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          }) : <p className="summary">No duplicate groups detected.</p>}
        </div>
      ) : null}

      {screenMode === "review" ? (
        <div className="panel">
          <div className="actions">
            <h3>Import review queue</h3>
            <button
              className="button ghost"
              type="button"
              onClick={handleMarkAllReviewed}
              disabled={!reviewBooks.length}
            >
              Mark all reviewed
            </button>
          </div>
          {reviewBooks.length ? reviewBooks.map((book) => (
            <div key={book.id} className="review-row">
              <div>
                <p><strong>#{book.id}</strong> {book.title || "Untitled"}</p>
                <p className="summary">Needs: {getReviewIssues(book).join(", ")}</p>
              </div>
              <div className="review-edit-grid">
                <input className="input" value={book.title} placeholder="Title" onChange={(event) => void upsertBook({ ...book, title: event.target.value, updated_at: new Date().toISOString() })} />
                <input className="input" value={book.authors} placeholder="Authors" onChange={(event) => void upsertBook({ ...book, authors: event.target.value, updated_at: new Date().toISOString() })} />
                <input className="input" value={book.publish_year} placeholder="Publish year" onChange={(event) => void upsertBook({ ...book, publish_year: event.target.value, updated_at: new Date().toISOString() })} />
                <input className="input" value={book.location} placeholder="Location" onChange={(event) => void upsertBook({ ...book, location: event.target.value, updated_at: new Date().toISOString() })} />
                <input className="input" value={book.cover_image} placeholder="Cover URL" onChange={(event) => void upsertBook({ ...book, cover_image: event.target.value, updated_at: new Date().toISOString() })} />
                <div className="review-actions">
                  <button className="button ghost" type="button" onClick={() => markReviewed(book.id)}>
                    Accept
                  </button>
                  <button
                    className="button danger"
                    type="button"
                    onClick={() => {
                      if (window.confirm("Reject this review item and remove the book from your library?")) {
                        void removeBook(book.id);
                      }
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )) : <p className="summary">No books need review.</p>}
        </div>
      ) : null}

      {screenMode === "results" ? (
      <div className={`library-shell${filtersOpen ? " library-shell--filters-open" : ""}`}>
        {filtersOpen ? (
          <aside className={`facets-panel ${filtersOpen ? "open" : ""}`}>
          <div className="facets-header-row">
            <h3>Filters</h3>
            <button className="icon-button facets-close" type="button" onClick={() => setFiltersOpen(false)}>
              ×
            </button>
          </div>

          {renderFacetBlock("Status", facetOptions.status, facets.status, (value) =>
            setFacets((prev) => ({ ...prev, status: toggleValue(prev.status, value) }))
          )}
          {renderFacetBlock("Format", facetOptions.format, facets.format, (value) =>
            setFacets((prev) => ({ ...prev, format: toggleValue(prev.format, value) }))
          )}
          {renderFacetBlock("Language", facetOptions.language, facets.language, (value) =>
            setFacets((prev) => ({ ...prev, language: toggleValue(prev.language, value) }))
          )}
          {renderFacetBlock("Location", facetOptions.location, facets.location, (value) =>
            setFacets((prev) => ({ ...prev, location: toggleValue(prev.location, value) }))
          )}
          {renderFacetBlock("Tags", facetOptions.tags, facets.tags, (value) =>
            setFacets((prev) => ({ ...prev, tags: toggleValue(prev.tags, value) }))
          )}
          {renderFacetBlock("Collections", facetOptions.collections, facets.collections, (value) =>
            setFacets((prev) => ({ ...prev, collections: toggleValue(prev.collections, value) }))
          )}
          {renderFacetBlock("Projects", facetOptions.projects, facets.projects, (value) =>
            setFacets((prev) => ({ ...prev, projects: toggleValue(prev.projects, value) }))
          )}

          <section className="facet-block">
            <p className="facet-title">Publish year</p>
            <div className="year-range">
              <input
                className="input"
                inputMode="numeric"
                placeholder="Min"
                value={facets.publishYearMin}
                onChange={(event) =>
                  setFacets((prev) => ({ ...prev, publishYearMin: event.target.value }))
                }
              />
              <input
                className="input"
                inputMode="numeric"
                placeholder="Max"
                value={facets.publishYearMax}
                onChange={(event) =>
                  setFacets((prev) => ({ ...prev, publishYearMax: event.target.value }))
                }
              />
            </div>
          </section>

          <button className="button ghost" type="button" onClick={() => setFacets(emptyFacets())}>
            Clear filters
          </button>
        </aside>
        ) : null}

        <div className="library-main">
          <div className="toolbar">
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button className="button ghost filters-trigger" type="button" onClick={() => setFiltersOpen((prev) => !prev)}>
                {filtersOpen ? "Hide filters" : "Show filters"}
              </button>
              <select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)}>
                <option value="updated">Recently updated</option>
                <option value="added">Recently added</option>
                <option value="author">Author A–Z</option>
                <option value="year">Year desc</option>
              </select>
            </div>
          </div>

          <div className="summary">{filtered.length} of {books.length} books</div>

          {filtered.length ? (
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
                <input className="input" value={bulkLocation} onChange={(event) => setBulkLocation(event.target.value)} placeholder="Set location" />
                <div className="bulk-chip">
                  <select value={bulkTagMode} onChange={(event) => setBulkTagMode(event.target.value as "add" | "remove")}>
                    <option value="add">Add tag</option>
                    <option value="remove">Remove tag</option>
                  </select>
                  <input className="input" value={bulkTag} onChange={(event) => setBulkTag(event.target.value)} placeholder="Tag" />
                </div>
                <input className="input" value={bulkCollection} onChange={(event) => setBulkCollection(event.target.value)} placeholder="Add collection" />
                <input className="input" value={bulkProject} onChange={(event) => setBulkProject(event.target.value)} placeholder="Add project" />
                <input className="input" value={bulkNotes} onChange={(event) => setBulkNotes(event.target.value)} placeholder="Append notes" />
                <button className="button primary" type="button" onClick={handleApplyBulk}>
                  Apply
                </button>
                <select value={metadataScope} onChange={(event) => setMetadataScope(event.target.value as typeof metadataScope)}>
                  <option value="selected">Metadata: selected</option>
                  <option value="all_filtered">Metadata: all filtered</option>
                  <option value="all_except_selected">Metadata: all except selected</option>
                </select>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => void handleUpdateMetadata()}
                  disabled={metadataState === "updating" || (metadataScope === "selected" && !selectedIds.size)}
                >
                  {metadataState === "updating" ? "Updating metadata..." : "Update metadata"}
                </button>
                {metadataMessage ? <span className="helper-text">{metadataMessage}</span> : null}
              </div>
            </div>
          ) : null}

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
        </div>
      </div>
      ) : null}

      {view === "list" && selectedBook ? (
        <div className="drawer-overlay" onClick={handleCloseDrawer}>
          <div className="drawer-panel" onClick={(event) => event.stopPropagation()}>
            <header className="drawer-header">
              <div>
                <p className="drawer-kicker">Book details</p>
                <h3 className="drawer-title">{selectedBook.title || "Untitled"}</h3>
                <p className="drawer-meta">{selectedBook.authors || "Unknown author"}</p>
              </div>
              <button className="icon-button" type="button" onClick={handleCloseDrawer}>
                ×
              </button>
            </header>
            <div className="drawer-body">
              <div className="drawer-cover">
                {selectedBook.cover_image ? (
                  <img src={selectedBook.cover_image} alt={`Cover of ${selectedBook.title || "Untitled"}`} />
                ) : (
                  <span>No cover</span>
                )}
              </div>
              <div className="drawer-info">
                <p>{[selectedBook.publisher, selectedBook.publish_year].filter(Boolean).join(" · ") || "Publisher and year unknown"}</p>
                <p>Status: {selectedBook.status.replace("_", " ")}</p>
                {selectedBook.tags ? <p>Tags: {selectedBook.tags}</p> : null}
                {selectedBook.collections ? <p>Collections: {selectedBook.collections}</p> : null}
              </div>
            </div>
            <div className="drawer-actions">
              <button className="button ghost" type="button" onClick={handleCloseDrawer}>
                Close
              </button>
              <button className="button primary" type="button" onClick={() => onSelectBook(selectedBook.id)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
