import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { Book } from "../db/schema";
import { useLibraryStore } from "../app/store";

type BookLocation = {
  book: Book;
  shelf: number | null;
  position: number | null;
  zone: "shelf" | "unorganized";
};

type ShelfLayout = {
  shelfNumber: number;
  slots: Array<Book | null>;
};

type CaseLayout = {
  shelves: ShelfLayout[];
  unorganized: Book[];
  locationMap: Map<number, BookLocation>;
};

type CaseViewProps = {
  books: Book[];
  onOpenBook: (id: number) => void;
};

const arrangeBooks = (
  books: Book[],
  organizeMode: "category" | "random" | "updated" | "manual",
  manualOrderIds: number[] | null
): Book[] => {
  if (organizeMode === "manual") {
    if (!manualOrderIds) {
      return books;
    }
    const map = new Map(books.map((book) => [book.id, book]));
    const ordered = manualOrderIds
      .map((id) => map.get(id))
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
};

const buildLayout = (
  books: Book[],
  bookcaseId: number | null,
  shelvesCount: number,
  capacityPerShelf: number,
  organizeMode: "category" | "random" | "updated" | "manual",
  manualOrderIds: number[] | null
): CaseLayout => {
  const shelves: ShelfLayout[] = Array.from(
    { length: Math.max(0, shelvesCount) },
    (_, index) => ({
      shelfNumber: index + 1,
      slots: Array.from({ length: Math.max(0, capacityPerShelf) }, () => null),
    })
  );
  const locationMap = new Map<number, BookLocation>();
  const unorganized: Book[] = [];

  if (!bookcaseId || shelvesCount <= 0 || capacityPerShelf <= 0) {
    const arranged = arrangeBooks(
      books.filter((book) => !book.bookcase_id),
      organizeMode,
      manualOrderIds
    );
    arranged.forEach((book) => {
      locationMap.set(book.id, {
        book,
        shelf: null,
        position: null,
        zone: "unorganized",
      });
    });
    return { shelves: [], unorganized: arranged, locationMap };
  }

  const assigned: Book[] = [];
  books.forEach((book) => {
    if (book.bookcase_id === bookcaseId) {
      const shelf = book.shelf ?? null;
      const position = book.position ?? null;
      if (
        shelf &&
        position &&
        shelf >= 1 &&
        shelf <= shelvesCount &&
        position >= 1 &&
        position <= capacityPerShelf
      ) {
        assigned.push(book);
      } else {
        unorganized.push(book);
      }
      return;
    }
    if (!book.bookcase_id) {
      unorganized.push(book);
    }
  });

  const orderedAssigned = [...assigned].sort((a, b) => {
    const shelfDiff = (a.shelf ?? 0) - (b.shelf ?? 0);
    if (shelfDiff !== 0) {
      return shelfDiff;
    }
    return (a.position ?? 0) - (b.position ?? 0);
  });

  const overflow: Book[] = [];
  orderedAssigned.forEach((book) => {
    const shelfIndex = (book.shelf ?? 1) - 1;
    const positionIndex = (book.position ?? 1) - 1;
    const shelf = shelves[shelfIndex];
    if (!shelf) {
      overflow.push(book);
      return;
    }
    if (shelf.slots[positionIndex]) {
      overflow.push(book);
      return;
    }
    shelf.slots[positionIndex] = book;
  });

  const arrangedUnorganized = arrangeBooks(
    [...unorganized, ...overflow],
    organizeMode,
    manualOrderIds
  );

  shelves.forEach((shelf) => {
    shelf.slots.forEach((book, index) => {
      if (!book) {
        return;
      }
      locationMap.set(book.id, {
        book,
        shelf: shelf.shelfNumber,
        position: index + 1,
        zone: "shelf",
      });
    });
  });
  arrangedUnorganized.forEach((book) => {
    locationMap.set(book.id, {
      book,
      shelf: null,
      position: null,
      zone: "unorganized",
    });
  });

  return { shelves, unorganized: arrangedUnorganized, locationMap };
};

export const CaseView = ({ books, onOpenBook }: CaseViewProps) => {
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const bookcases = useLibraryStore((state) => state.bookcases);
  const upsertBookcase = useLibraryStore((state) => state.upsertBookcase);
  const [selectedBookcaseId, setSelectedBookcaseId] = useState<number | null>(
    bookcases[0]?.id ?? null
  );
  const [bookcaseName, setBookcaseName] = useState("Bookcase");
  const [shelvesCount, setShelvesCount] = useState(3);
  const [capacityPerShelf, setCapacityPerShelf] = useState(12);
  const [organizeMode, setOrganizeMode] = useState<
    "category" | "random" | "updated" | "manual"
  >("category");
  const [showDetails, setShowDetails] = useState(false);
  const [shelvesCollapsed, setShelvesCollapsed] = useState(false);
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

  useEffect(() => {
    if (!bookcases.length) {
      setSelectedBookcaseId(null);
      return;
    }
    if (selectedBookcaseId == null || !bookcases.some((item) => item.id === selectedBookcaseId)) {
      setSelectedBookcaseId(bookcases[0].id);
    }
  }, [bookcases, selectedBookcaseId]);

  useEffect(() => {
    if (selectedBookcaseId == null) {
      return;
    }
    const selected = bookcases.find((item) => item.id === selectedBookcaseId);
    if (!selected) {
      return;
    }
    setBookcaseName(selected.name);
    setShelvesCount(selected.shelves);
    setCapacityPerShelf(selected.capacity_per_shelf);
  }, [bookcases, selectedBookcaseId]);

  useEffect(() => {
    if (shelvesCollapsed) {
      setPreviewId(null);
      setQuickEditId(null);
    }
  }, [shelvesCollapsed]);

  const effectiveShelvesCount = Math.max(1, shelvesCount);
  const effectiveCapacityPerShelf = Math.max(6, capacityPerShelf);

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

  const layout = useMemo(
    () =>
      buildLayout(
        books,
        selectedBookcaseId,
        effectiveShelvesCount,
        effectiveCapacityPerShelf,
        organizeMode,
        manualOrderIds
      ),
    [
      books,
      effectiveCapacityPerShelf,
      effectiveShelvesCount,
      manualOrderIds,
      organizeMode,
      selectedBookcaseId,
    ]
  );

  const previewLocation = useMemo(
    () => (previewId != null ? layout.locationMap.get(previewId) ?? null : null),
    [layout.locationMap, previewId]
  );
  const quickEditLocation = useMemo(
    () => (quickEditId != null ? layout.locationMap.get(quickEditId) ?? null : null),
    [layout.locationMap, quickEditId]
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

  const handleClick = (event: MouseEvent<HTMLButtonElement>, id: number) => {
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

  const cloneShelves = () =>
    layout.shelves.map((shelf) => ({
      shelfNumber: shelf.shelfNumber,
      slots: shelf.slots.slice(),
    }));

  const removeFromShelf = (slots: Array<Book | null>, id: number) => {
    const index = slots.findIndex((book) => book?.id === id);
    if (index < 0) {
      return null;
    }
    const removed = slots[index];
    for (let i = index; i < slots.length - 1; i += 1) {
      slots[i] = slots[i + 1];
    }
    slots[slots.length - 1] = null;
    return removed ?? null;
  };

  const insertIntoShelf = (
    slots: Array<Book | null>,
    startIndex: number,
    book: Book
  ) => {
    let carry: Book | null = book;
    for (let i = startIndex; i < slots.length; i += 1) {
      if (!carry) {
        break;
      }
      const next = slots[i];
      slots[i] = carry;
      carry = next ?? null;
    }
    return carry;
  };

  const persistUpdates = async (updates: Book[]) => {
    if (!updates.length) {
      return;
    }
    await Promise.all(updates.map((book) => upsertBook(book)));
  };

  const handlePlaceBook = async (
    bookId: number,
    targetShelf: number | null,
    targetPosition?: number
  ) => {
    if (!dragUnlocked) {
      return;
    }
    if (targetShelf != null && selectedBookcaseId == null) {
      return;
    }
    const movingBook = books.find((book) => book.id === bookId);
    if (!movingBook) {
      return;
    }
    const now = new Date().toISOString();
    const shelves = cloneShelves();
    const targetShelfIndex = targetShelf ? targetShelf - 1 : null;

    let removedBook: Book | null = null;
    shelves.forEach((shelf) => {
      const removed = removeFromShelf(shelf.slots, bookId);
      if (removed) {
        removedBook = removed;
      }
    });

    const unorganizedIndex = layout.unorganized.findIndex((book) => book.id === bookId);
    const unorganizedBook = unorganizedIndex >= 0 ? layout.unorganized[unorganizedIndex] : null;
    const bookToMove = removedBook ?? unorganizedBook ?? movingBook;

    let overflow: Book | null = null;
    if (targetShelfIndex != null && shelves[targetShelfIndex]) {
      const slots = shelves[targetShelfIndex].slots;
      let insertIndex = 0;
      if (typeof targetPosition === "number") {
        insertIndex = Math.min(Math.max(0, targetPosition - 1), slots.length - 1);
      } else {
        const firstEmpty = slots.findIndex((slot) => slot == null);
        insertIndex = firstEmpty >= 0 ? firstEmpty : slots.length - 1;
      }
      overflow = insertIntoShelf(slots, insertIndex, bookToMove);
    }

    const updates: Book[] = [];
    const touched = new Set<number>();
    shelves.forEach((shelf) => {
      shelf.slots.forEach((book, index) => {
        if (!book) {
          return;
        }
        const desiredShelf = shelf.shelfNumber;
        const desiredPosition = index + 1;
        if (
          book.bookcase_id !== selectedBookcaseId ||
          book.shelf !== desiredShelf ||
          book.position !== desiredPosition
        ) {
          updates.push({
            ...book,
            bookcase_id: selectedBookcaseId,
            shelf: desiredShelf,
            position: desiredPosition,
            updated_at: now,
          });
        }
        touched.add(book.id);
      });
    });

    const unassignBook = (book: Book | null) => {
      if (!book) {
        return;
      }
      if (touched.has(book.id)) {
        return;
      }
      if (book.bookcase_id == null && book.shelf == null && book.position == null) {
        return;
      }
      updates.push({
        ...book,
        bookcase_id: null,
        shelf: null,
        position: null,
        updated_at: now,
      });
    };

    if (targetShelfIndex == null) {
      unassignBook(bookToMove);
    }
    if (overflow) {
      unassignBook(overflow);
    }

    await persistUpdates(updates);
    setDraggingId(null);
  };

  const handleDropOnShelf = (shelfNumber: number) => {
    if (draggingId == null) {
      return;
    }
    void handlePlaceBook(draggingId, shelfNumber);
  };

  const handleDropOnPosition = (shelfNumber: number, position: number) => {
    if (draggingId == null) {
      return;
    }
    void handlePlaceBook(draggingId, shelfNumber, position);
  };

  const handleDropUnorganized = () => {
    if (draggingId == null) {
      return;
    }
    void handlePlaceBook(draggingId, null);
  };

  const handleToggleDetails = async () => {
    if (showDetails) {
      if (selectedBookcaseId != null) {
        const now = new Date().toISOString();
        await upsertBookcase({
          id: selectedBookcaseId,
          name: bookcaseName.trim() || "Bookcase",
          shelves: shelvesCount,
          capacity_per_shelf: capacityPerShelf,
          updated_at: now,
        });
      }
    }
    setShowDetails((current) => !current);
  };

  return (
    <section className="caseLayout">
      <header className="caseHeader">
        <div>
          <p className="caseKicker">Spines</p>
          <h2 className="caseTitle">{bookcaseName}</h2>
          <div className="caseBookcases">
            <span className="caseBookcasesLabel">Bookcases</span>
            {bookcases.length ? (
              <div className="caseBookcasesList">
                {bookcases.map((bookcase) => (
                  <button
                    key={bookcase.id}
                    type="button"
                    className={`caseBookcasePill${
                      bookcase.id === selectedBookcaseId ? " caseBookcasePillActive" : ""
                    }`}
                    onClick={() => setSelectedBookcaseId(bookcase.id)}
                  >
                    {bookcase.name}
                  </button>
                ))}
              </div>
            ) : (
              <span className="caseBookcasesEmpty">No bookcases yet.</span>
            )}
          </div>
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
            onClick={handleToggleDetails}
          >
            {showDetails ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            className="text-link caseEditLink"
            onClick={() => setShelvesCollapsed((current) => !current)}
          >
            {shelvesCollapsed ? "Show shelves" : "Hide shelves"}
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
            {effectiveShelvesCount} shelves · {effectiveCapacityPerShelf} positions per
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
                  Organize unassigned
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
                    {previewLocation.book.authors || "Unknown author"} · {bookcaseName} ·{" "}
                    {previewLocation.shelf && previewLocation.position
                      ? `S${previewLocation.shelf} · P${previewLocation.position}`
                      : "Unorganized"}
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
                <p className="casePreviewEmpty">Hover or tap a spine to preview.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
      {!shelvesCollapsed ? (
        <>
          <div className="caseShelves">
            {layout.shelves.map((shelf) => (
              <section key={shelf.shelfNumber} className="caseShelf">
                <header className="caseShelfHeader">
                  <span>Shelf {shelf.shelfNumber}</span>
                </header>
                <div
                  className="caseShelfRow"
                  role="list"
                  onDragOver={(event) => {
                    if (dragUnlocked) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={() => handleDropOnShelf(shelf.shelfNumber)}
                >
                  {shelf.slots
                    .map((book, index) => {
                      if (!book) {
                        return null;
                      }
                      const position = index + 1;
                      return (
                        <button
                          key={book.id}
                          type="button"
                          className="caseSpine"
                          role="listitem"
                          aria-label={`${book.title || "Untitled"} · ${bookcaseName} · Shelf ${
                            shelf.shelfNumber
                          } · Position ${position}`}
                          draggable={dragUnlocked}
                          onClick={(event) => handleClick(event, book.id)}
                          onDoubleClick={() => handleDoubleClick(book.id)}
                          onMouseEnter={(event) => {
                            setPreviewId(book.id);
                            setHoverPosition({ x: event.clientX, y: event.clientY });
                          }}
                          onMouseMove={(event) =>
                            setHoverPosition({ x: event.clientX, y: event.clientY })
                          }
                          onMouseLeave={() => setPreviewId(null)}
                          onFocus={() => setPreviewId(book.id)}
                          onBlur={() => setPreviewId(null)}
                          onTouchStart={() => setPreviewId(book.id)}
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
                          onDragStart={() => setDraggingId(book.id)}
                          onDragEnd={() => setDraggingId(null)}
                          onDragOver={(event) => {
                            if (dragUnlocked) {
                              event.preventDefault();
                            }
                          }}
                          onDrop={() => handleDropOnPosition(shelf.shelfNumber, position)}
                        >
                          <span className="caseSpineTitle">{book.title || "Untitled"}</span>
                          <span className="caseSpineAuthor">
                            {book.authors || "Unknown author"}
                          </span>
                        </button>
                      );
                    })
                    .filter(Boolean)}
                </div>
              </section>
            ))}
            <section className="caseShelf caseUnorganized">
              <header className="caseShelfHeader">
                <span>Unorganized</span>
                <span>{layout.unorganized.length} books</span>
              </header>
              <div
                className="caseUnorganizedList"
                role="list"
                onDragOver={(event) => {
                  if (dragUnlocked) {
                    event.preventDefault();
                  }
                }}
                onDrop={handleDropUnorganized}
              >
                {layout.unorganized.length ? (
                  layout.unorganized.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      className="caseSpine caseSpineUnorganized"
                      role="listitem"
                      aria-label={`${book.title || "Untitled"} · Unorganized`}
                      draggable={dragUnlocked}
                      onClick={(event) => handleClick(event, book.id)}
                      onDoubleClick={() => handleDoubleClick(book.id)}
                      onMouseEnter={(event) => {
                        setPreviewId(book.id);
                        setHoverPosition({ x: event.clientX, y: event.clientY });
                      }}
                      onMouseMove={(event) =>
                        setHoverPosition({ x: event.clientX, y: event.clientY })
                      }
                      onMouseLeave={() => setPreviewId(null)}
                      onFocus={() => setPreviewId(book.id)}
                      onBlur={() => setPreviewId(null)}
                      onTouchStart={() => setPreviewId(book.id)}
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
                      onDragStart={() => setDraggingId(book.id)}
                      onDragEnd={() => setDraggingId(null)}
                    >
                      <span className="caseSpineTitle">{book.title || "Untitled"}</span>
                      <span className="caseSpineAuthor">
                        {book.authors || "Unknown author"}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="caseUnorganizedEmpty">All books are shelved.</div>
                )}
              </div>
            </section>
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
                {previewLocation.book.authors || "Unknown author"} · {bookcaseName} ·{" "}
                {previewLocation.shelf && previewLocation.position
                  ? `S${previewLocation.shelf} · P${previewLocation.position}`
                  : "Unorganized"}
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
                    {quickEditLocation.book.authors || "Unknown author"} ·{" "}
                    {bookcaseName} ·{" "}
                    {quickEditLocation.shelf && quickEditLocation.position
                      ? `S${quickEditLocation.shelf} · P${quickEditLocation.position}`
                      : "Unorganized"}
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
        </>
      ) : null}
    </section>
  );
};
