import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { Book } from "../db/schema";
import { useLibraryStore } from "../app/store";

type BookcaseCategory = {
  label: string;
  scope: "bookcase" | "shelf" | "position_range";
  range: string;
};

type Bookcase = {
  name: string;
  shelves: number;
  capacityPerShelf: number;
  categories: BookcaseCategory[];
};

type BookLocation = {
  book: Book;
  shelf: number;
  position: number;
};

type CaseViewProps = {
  books: Book[];
  onOpenBook: (id: number) => void;
};

const buildBookcase = (
  books: Book[],
  shelves: number,
  capacityPerShelf: number,
): { bookcase: Bookcase; locations: BookLocation[] } => {
  const bookcase: Bookcase = {
    name: "Bookcase A",
    shelves,
    capacityPerShelf,
    categories: [
      {
        label: "Bookcase A–Z",
        scope: "bookcase",
        range: `S1-P1 → S${shelves}-P${capacityPerShelf}`,
      },
      {
        label: "Shelf bands",
        scope: "shelf",
        range: `S1-P1 → S${shelves}-P${capacityPerShelf}`,
      },
      {
        label: "Position ranges",
        scope: "position_range",
        range: "S1-P1 → S1-P6",
      },
    ],
  };

  const locations = books.map((book, index) => {
    const shelf = Math.floor(index / capacityPerShelf) + 1;
    const position = (index % capacityPerShelf) + 1;
    return { book, shelf, position };
  });

  return { bookcase, locations };
};

export const CaseView = ({ books, onOpenBook }: CaseViewProps) => {
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const [bookcaseName, setBookcaseName] = useState("Bookcase A");
  const [shelvesCount, setShelvesCount] = useState(3);
  const [capacityPerShelf, setCapacityPerShelf] = useState(12);
  const [organizeMode, setOrganizeMode] = useState<
    "category" | "random" | "updated" | "manual"
  >("category");
  const [showDetails, setShowDetails] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [quickEditId, setQuickEditId] = useState<number | null>(null);
  const [quickEditPosition, setQuickEditPosition] = useState({ x: 0, y: 0 });
  const [manualOrderIds, setManualOrderIds] = useState<number[] | null>(null);
  const [dragUnlocked, setDragUnlocked] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [formState, setFormState] = useState({
    status: "",
    location: "",
    tags: "",
    collections: "",
    projects: "",
    notes: "",
  });
  const clickTimerRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);

  const effectiveShelvesCount = showDetails
    ? Math.max(1, shelvesCount)
    : 3;
  const effectiveCapacityPerShelf = showDetails
    ? Math.max(6, capacityPerShelf)
    : Math.max(6, Math.ceil(books.length / 3));

  useEffect(() => {
    setManualOrderIds((prev) => {
      if (!prev) {
        return null;
      }
      const ids = books.map((book) => book.id);
      const trimmed = prev.filter((id) => ids.includes(id));
      const missing = ids.filter((id) => !trimmed.includes(id));
      return [...trimmed, ...missing];
    });
  }, [books]);

  const arrangedBooks = useMemo(() => {
    if (organizeMode === "manual") {
      const map = new Map(books.map((book) => [book.id, book]));
      const ordered = manualOrderIds
        ?.map((id) => map.get(id))
        .filter(Boolean) as Book[] | undefined;
      return ordered && ordered.length ? ordered : books;
    }
    if (organizeMode === "random") {
      return [...books].sort(() => Math.random() - 0.5);
    }
    if (organizeMode === "updated") {
      return [...books].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }
    return books;
  }, [books, manualOrderIds, organizeMode]);

  const { bookcase, locations } = useMemo(
    () =>
      buildBookcase(arrangedBooks, effectiveShelvesCount, effectiveCapacityPerShelf),
    [arrangedBooks, effectiveCapacityPerShelf, effectiveShelvesCount]
  );
  const previewLocation = useMemo(
    () => locations.find((location) => location.book.id === previewId) ?? null,
    [locations, previewId]
  );
  const quickEditLocation = useMemo(
    () => locations.find((location) => location.book.id === quickEditId) ?? null,
    [locations, quickEditId]
  );

  useEffect(() => {
    if (!quickEditLocation) {
      return;
    }
    const book = quickEditLocation.book;
    setFormState({
      status: book.status,
      location: book.location || "",
      tags: book.tags || "",
      collections: book.collections || "",
      projects: book.projects || "",
      notes: book.notes || "",
    });
  }, [quickEditLocation]);

  const shelves = useMemo(() => {
    const shelfMap = new Map<number, BookLocation[]>();
    locations.forEach((location) => {
      const list = shelfMap.get(location.shelf) ?? [];
      list.push(location);
      shelfMap.set(location.shelf, list);
    });
    return Array.from({ length: bookcase.shelves }, (_, index) => {
      const shelfNumber = index + 1;
      return {
        shelfNumber,
        books: shelfMap.get(shelfNumber) ?? [],
      };
    });
  }, [bookcase.shelves, locations]);

  if (books.length === 0) {
    return (
      <div className="panel case-empty" role="status">
        No books match your filters yet.
      </div>
    );
  }

  const openQuickEdit = (id: number, x: number, y: number) => {
    setQuickEditId(id);
    setQuickEditPosition({ x, y });
  };

  const handleClick = (
    event: MouseEvent<HTMLButtonElement>,
    id: number
  ) => {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    const { clientX, clientY } = event;
    clickTimerRef.current = window.setTimeout(() => {
      openQuickEdit(id, clientX, clientY);
      clickTimerRef.current = null;
    }, 200);
  };

  const handleDoubleClick = (id: number) => {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onOpenBook(id);
  };

  const handleDragReorder = (targetId: number) => {
    if (draggingId == null || draggingId === targetId) {
      return;
    }
    const currentIds = (manualOrderIds ?? arrangedBooks.map((book) => book.id)).slice();
    const fromIndex = currentIds.indexOf(draggingId);
    const toIndex = currentIds.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    currentIds.splice(fromIndex, 1);
    currentIds.splice(toIndex, 0, draggingId);
    setManualOrderIds(currentIds);
    setOrganizeMode("manual");
  };

  return (
    <section className="caseLayout">
      <header className="caseHeader">
        <div>
          <p className="caseKicker">Spines</p>
          <h2 className="caseTitle">{bookcaseName}</h2>
        </div>
        <div className="caseHeaderActions">
          {dragUnlocked ? (
            <span className="caseUnlockBadge" aria-live="polite">
              Reorder unlocked
            </span>
          ) : null}
          <button
            type="button"
            className="text-link caseEditLink"
            onClick={() => setShowDetails((current) => !current)}
          >
            {showDetails ? "Done" : "Edit"}
          </button>
          {dragUnlocked ? (
            <button
              type="button"
              className="text-link caseEditLink"
              onClick={() => setDragUnlocked(false)}
            >
              Lock
            </button>
          ) : null}
        </div>
      </header>
      {showDetails ? (
        <section className="caseDetails">
          <div className="caseMeta">
            {bookcase.shelves} shelves · {bookcase.capacityPerShelf} positions per
            shelf
          </div>
          <div className="caseDetailsGrid">
            <div className="caseControls">
              <p className="caseKicker">Bookcase setup</p>
              <div className="caseControlGrid">
                <label>
                  Name
                  <input
                    type="text"
                    value={bookcaseName}
                    onChange={(event) => setBookcaseName(event.target.value)}
                  />
                </label>
                <label>
                  Shelves
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={shelvesCount}
                    onChange={(event) =>
                      setShelvesCount(
                        Number.parseInt(event.target.value, 10) || 1
                      )
                    }
                  />
                </label>
                <label>
                  Capacity per shelf
                  <input
                    type="number"
                    min={6}
                    max={48}
                    value={capacityPerShelf}
                    onChange={(event) =>
                      setCapacityPerShelf(
                        Number.parseInt(event.target.value, 10) || 6
                      )
                    }
                  />
                </label>
                <label>
                  Organize shelves
                  <select
                    value={organizeMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as typeof organizeMode;
                      if (nextMode === "manual" && !manualOrderIds) {
                        setManualOrderIds(books.map((book) => book.id));
                      }
                      setOrganizeMode(nextMode);
                    }}
                  >
                    <option value="category">By category</option>
                    <option value="updated">Recently updated</option>
                    <option value="random">Random shuffle</option>
                    <option value="manual">Manual (drag)</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="casePreview" aria-live="polite">
              <p className="caseKicker">Spine info</p>
              {previewLocation ? (
                <div>
                  <p className="casePreviewTitle">
                    {previewLocation.book.title || "Untitled"}
                  </p>
                  <p className="casePreviewMeta">
                    {previewLocation.book.authors || "Unknown author"} · A · S
                    {previewLocation.shelf} · P{previewLocation.position}
                  </p>
                  <div className="casePreviewActions">
                    <button
                      type="button"
                      onClick={() =>
                        openQuickEdit(
                          previewLocation.book.id,
                          hoverPosition.x,
                          hoverPosition.y
                        )
                      }
                    >
                      Quick edit
                    </button>
                    <button type="button">Move</button>
                    <button type="button">Categorize</button>
                  </div>
                </div>
              ) : (
                <p className="casePreviewEmpty">
                  Hover or tap a spine to preview.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}
      <div className="caseShelves">
        {shelves.map((shelf) => (
          <section key={shelf.shelfNumber} className="caseShelf">
            <header className="caseShelfHeader">
              <span>Shelf {shelf.shelfNumber}</span>
            </header>
            <div className="caseShelfRow" role="list">
              {shelf.books.map((location) => (
                <button
                  key={location.book.id}
                  type="button"
                  className="caseSpine"
                  role="listitem"
                  aria-label={`${location.book.title || "Untitled"} · Bookcase A · Shelf ${
                    location.shelf
                  } · Position ${location.position}`}
                  draggable={dragUnlocked}
                  onClick={(event) => handleClick(event, location.book.id)}
                  onDoubleClick={() => handleDoubleClick(location.book.id)}
                  onMouseEnter={(event) => {
                    setPreviewId(location.book.id);
                    setHoverPosition({ x: event.clientX, y: event.clientY });
                  }}
                  onMouseMove={(event) =>
                    setHoverPosition({ x: event.clientX, y: event.clientY })
                  }
                  onMouseLeave={() => setPreviewId(null)}
                  onFocus={() => setPreviewId(location.book.id)}
                  onBlur={() => setPreviewId(null)}
                  onTouchStart={() => setPreviewId(location.book.id)}
                  onPointerDown={() => {
                    if (longPressRef.current) {
                      window.clearTimeout(longPressRef.current);
                    }
                    longPressRef.current = window.setTimeout(() => {
                      setDragUnlocked(true);
                    }, 550);
                  }}
                  onPointerUp={() => {
                    if (longPressRef.current) {
                      window.clearTimeout(longPressRef.current);
                      longPressRef.current = null;
                    }
                  }}
                  onPointerLeave={() => {
                    if (longPressRef.current) {
                      window.clearTimeout(longPressRef.current);
                      longPressRef.current = null;
                    }
                  }}
                  onDragStart={() => setDraggingId(location.book.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(event) => {
                    if (dragUnlocked) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={() => handleDragReorder(location.book.id)}
                >
                  <span className="caseSpineTitle">
                    {location.book.title || "Untitled"}
                  </span>
                  <span className="caseSpineAuthor">
                    {location.book.authors || "Unknown author"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {previewLocation && !quickEditLocation ? (
        <div
          className="caseHoverCard"
          style={{
            left: hoverPosition.x + 12,
            top: hoverPosition.y + 12,
          }}
        >
          <p className="casePreviewTitle">
            {previewLocation.book.title || "Untitled"}
          </p>
          <p className="casePreviewMeta">
            {previewLocation.book.authors || "Unknown author"} · A · S
            {previewLocation.shelf} · P{previewLocation.position}
          </p>
        </div>
      ) : null}
      {quickEditLocation ? (
        <div
          className="caseQuickEdit"
          style={{
            left: quickEditPosition.x + 12,
            top: quickEditPosition.y + 12,
          }}
        >
          <header className="caseQuickEditHeader">
            <div>
              <p className="casePreviewTitle">
                {quickEditLocation.book.title || "Untitled"}
              </p>
              <p className="casePreviewMeta">
                {quickEditLocation.book.authors || "Unknown author"} · A · S
                {quickEditLocation.shelf} · P{quickEditLocation.position}
              </p>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => setQuickEditId(null)}
            >
              Close
            </button>
          </header>
          <form
            className="caseQuickEditForm"
            onSubmit={async (event) => {
              event.preventDefault();
              const updated = {
                ...quickEditLocation.book,
                status: formState.status as Book["status"],
                location: formState.location,
                tags: formState.tags,
                collections: formState.collections,
                projects: formState.projects,
                notes: formState.notes,
                updated_at: new Date().toISOString(),
              };
              await upsertBook(updated);
              setQuickEditId(null);
            }}
          >
            <label>
              Status
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }))
                }
              >
                <option value="to_read">To read</option>
                <option value="reading">Reading</option>
                <option value="referenced">Referenced</option>
                <option value="finished">Finished</option>
              </select>
            </label>
            <label>
              Location
              <input
                value={formState.location}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Tags
              <input
                value={formState.tags}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, tags: event.target.value }))
                }
              />
            </label>
            <label>
              Collections
              <input
                value={formState.collections}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    collections: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Projects
              <input
                value={formState.projects}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    projects: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                rows={3}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="caseQuickEditActions">
              <button type="submit" className="button primary">
                Save
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={() => setQuickEditId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
};
