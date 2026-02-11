import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { Book } from "../db/schema";
import { useLibraryStore } from "../app/store";

type BookLocation = {
  book: Book;
  shelf: number | null;
  position: number | null;
  zone: "shelf" | "bookcase_unorganized" | "global_unorganized";
};

type ShelfLayout = {
  shelfNumber: number;
  slots: Array<Book | null>;
};

type CaseLayout = {
  shelves: ShelfLayout[];
  unorganizedBookcase: Book[];
  unorganizedGlobal: Book[];
  locationMap: Map<number, BookLocation>;
};

type CaseViewProps = {
  books: Book[];
  onOpenBook: (id: number) => void;
};

type CaseCollectionView = "spines" | "grid" | "list";

type BookcasePreset = {
  id: string;
  label: string;
  shelves: number;
  capacityPerShelf: number;
};

const BOOKCASE_PRESETS: BookcasePreset[] = [
  { id: "small", label: "Small (3 shelves × 12)", shelves: 3, capacityPerShelf: 12 },
  { id: "standard", label: "Standard (5 shelves × 24)", shelves: 5, capacityPerShelf: 24 },
  { id: "tall", label: "Tall wall (7 shelves × 30)", shelves: 7, capacityPerShelf: 30 },
  { id: "dense", label: "Dense archive (8 shelves × 36)", shelves: 8, capacityPerShelf: 36 },
];

type AutoPopulateOrder =
  | "current"
  | "title_asc"
  | "author_asc"
  | "year_asc"
  | "year_desc"
  | "status"
  | "updated_desc"
  | "random";

type AutoPopulatePlacement = "sequential" | "snake" | "balanced";

type EmptySlot = { shelf: number; position: number };

const readPublishYear = (book: Book) => {
  const year = Number.parseInt(book.publish_year || "", 10);
  return Number.isFinite(year) ? year : null;
};

const sortBooksForAutoPopulate = (books: Book[], order: AutoPopulateOrder) => {
  const source = [...books];
  switch (order) {
    case "title_asc":
      return source.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    case "author_asc":
      return source.sort((a, b) => (a.authors || "").localeCompare(b.authors || ""));
    case "year_asc":
      return source.sort((a, b) => (readPublishYear(a) ?? 9999) - (readPublishYear(b) ?? 9999));
    case "year_desc":
      return source.sort((a, b) => (readPublishYear(b) ?? 0) - (readPublishYear(a) ?? 0));
    case "status":
      return source.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    case "updated_desc":
      return source.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    case "random":
      return source.sort(() => Math.random() - 0.5);
    case "current":
    default:
      return source;
  }
};

const buildEmptySlotPlan = (
  shelves: ShelfLayout[],
  placement: AutoPopulatePlacement
): EmptySlot[] => {
  const sequential: EmptySlot[] = [];
  shelves.forEach((shelf) => {
    shelf.slots.forEach((slot, index) => {
      if (!slot) {
        sequential.push({ shelf: shelf.shelfNumber, position: index + 1 });
      }
    });
  });

  if (placement === "sequential") {
    return sequential;
  }

  if (placement === "snake") {
    const byShelf = new Map<number, EmptySlot[]>();
    sequential.forEach((slot) => {
      const current = byShelf.get(slot.shelf) ?? [];
      current.push(slot);
      byShelf.set(slot.shelf, current);
    });
    return Array.from(byShelf.entries())
      .sort((a, b) => a[0] - b[0])
      .flatMap(([shelf, slots]) =>
        shelf % 2 === 0 ? [...slots].sort((a, b) => b.position - a.position) : slots
      );
  }

  const queueByShelf = shelves.map((shelf) =>
    shelf.slots
      .map((slot, index) => (!slot ? { shelf: shelf.shelfNumber, position: index + 1 } : null))
      .filter(Boolean) as EmptySlot[]
  );
  const balanced: EmptySlot[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    queueByShelf.forEach((queue) => {
      const next = queue.shift();
      if (next) {
        balanced.push(next);
        remaining = true;
      }
    });
  }
  return balanced;
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
  const unorganizedBookcase: Book[] = [];
  const unorganizedGlobal: Book[] = [];

  if (!bookcaseId || shelvesCount <= 0 || capacityPerShelf <= 0) {
    const arrangedGlobal = arrangeBooks(
      books.filter((book) => !book.bookcase_id),
      organizeMode,
      manualOrderIds
    );
    arrangedGlobal.forEach((book) => {
      locationMap.set(book.id, {
        book,
        shelf: null,
        position: null,
        zone: "global_unorganized",
      });
    });
    return { shelves: [], unorganizedBookcase: [], unorganizedGlobal: arrangedGlobal, locationMap };
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
        unorganizedBookcase.push(book);
      }
      return;
    }
    if (!book.bookcase_id) {
      unorganizedGlobal.push(book);
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

  const arrangedBookcaseUnorganized = arrangeBooks(unorganizedBookcase, organizeMode, manualOrderIds);
  const arrangedGlobalUnorganized = arrangeBooks(
    [...unorganizedGlobal, ...overflow],
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

  arrangedBookcaseUnorganized.forEach((book) => {
    locationMap.set(book.id, {
      book,
      shelf: null,
      position: null,
      zone: "bookcase_unorganized",
    });
  });

  arrangedGlobalUnorganized.forEach((book) => {
    locationMap.set(book.id, {
      book,
      shelf: null,
      position: null,
      zone: "global_unorganized",
    });
  });

  return {
    shelves,
    unorganizedBookcase: arrangedBookcaseUnorganized,
    unorganizedGlobal: arrangedGlobalUnorganized,
    locationMap,
  };
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
  const [bookcaseNotes, setBookcaseNotes] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState(BOOKCASE_PRESETS[1].id);
  const [autoPopulateOrder, setAutoPopulateOrder] = useState<AutoPopulateOrder>("current");
  const [autoPopulatePlacement, setAutoPopulatePlacement] = useState<AutoPopulatePlacement>("sequential");
  const [organizeMode, setOrganizeMode] = useState<
    "category" | "random" | "updated" | "manual"
  >("category");
  const [showDetails, setShowDetails] = useState(false);
  const [pendingAutoPopulate, setPendingAutoPopulate] = useState(false);
  const [shelvesCollapsed, setShelvesCollapsed] = useState(false);
  const [collectionView, setCollectionView] = useState<CaseCollectionView>("spines");
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
    setBookcaseNotes(selected.notes || "");
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

  const selectedBookcase = useMemo(
    () =>
      selectedBookcaseId == null
        ? null
        : bookcases.find((bookcase) => bookcase.id === selectedBookcaseId) ?? null,
    [bookcases, selectedBookcaseId]
  );

  const occupancy = useMemo(() => {
    const totalSlots = effectiveShelvesCount * effectiveCapacityPerShelf;
    const shelved = layout.shelves.reduce(
      (count, shelf) => count + shelf.slots.filter(Boolean).length,
      0
    );
    const free = Math.max(0, totalSlots - shelved);
    const percent = totalSlots ? Math.round((shelved / totalSlots) * 100) : 0;
    return { totalSlots, shelved, free, percent };
  }, [effectiveCapacityPerShelf, effectiveShelvesCount, layout.shelves]);
  const quickEditLocation = useMemo(
    () => (quickEditId != null ? layout.locationMap.get(quickEditId) ?? null : null),
    [layout.locationMap, quickEditId]
  );

  const hasSidebar = collectionView !== "spines" || globalUnorganizedOpen;

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
    targetPosition?: number,
    keepInBookcaseWhenUnshelved = false
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
    const sourceLocation = layout.locationMap.get(bookId);

    const removeBookFromShelves = (id: number) => {
      let removed: Book | null = null;
      shelves.forEach((shelf) => {
        const candidate = removeFromShelf(shelf.slots, id);
        if (candidate) {
          removed = candidate;
        }
      });
      return removed;
    };

    const removedBook = removeBookFromShelves(bookId);
    const bookToMove = removedBook ?? movingBook;
    const unshelved: Book[] = [];

    if (targetShelf == null) {
      unshelved.push(bookToMove);
    } else {
      const target = shelves.find((entry) => entry.shelfNumber === targetShelf);
      if (!target) {
        return;
      }

      const slots = target.slots;
      let insertIndex = 0;
      if (typeof targetPosition === "number") {
        insertIndex = Math.min(Math.max(0, targetPosition - 1), slots.length - 1);
      } else {
        const firstEmpty = slots.findIndex((slot) => slot == null);
        insertIndex = firstEmpty >= 0 ? firstEmpty : slots.length - 1;
      }

      if (
        sourceLocation?.zone === "shelf" &&
        sourceLocation.shelf === targetShelf &&
        sourceLocation.position != null &&
        typeof targetPosition === "number" &&
        sourceLocation.position < targetPosition
      ) {
        insertIndex = Math.max(0, insertIndex - 1);
      }

      const overflow = insertIntoShelf(slots, insertIndex, bookToMove);
      if (overflow) {
        unshelved.push(overflow);
      }
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

    unshelved.forEach((book) => {
      if (touched.has(book.id)) {
        return;
      }
      if (book.bookcase_id == null && book.shelf == null && book.position == null) {
        return;
      }
      updates.push({
        ...book,
        bookcase_id: keepInBookcaseWhenUnshelved ? selectedBookcaseId : null,
        shelf: null,
        position: null,
        updated_at: now,
      });
    });

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

  const handleDropUnorganizedBookcase = () => {
    if (draggingId == null) {
      return;
    }
    void handlePlaceBook(draggingId, null, undefined, true);
  };

  const handleDropUnorganizedGlobal = () => {
    if (draggingId == null) {
      return;
    }
    void handlePlaceBook(draggingId, null, undefined, false);
  };

  const clearShelf = async (shelfNumber: number, destination: "bookcase" | "global") => {
    if (!selectedBookcaseId) {
      return;
    }
    const shelf = layout.shelves.find((entry) => entry.shelfNumber === shelfNumber);
    if (!shelf || !shelf.slots.some(Boolean)) {
      return;
    }
    const now = new Date().toISOString();
    const updates = shelf.slots
      .filter((book): book is Book => Boolean(book))
      .map((book) => ({
        ...book,
        bookcase_id: destination === "bookcase" ? selectedBookcaseId : null,
        shelf: null,
        position: null,
        updated_at: now,
      }));
    await persistUpdates(updates);
  };

  const handleClearShelf = async (shelfNumber: number) => {
    await clearShelf(shelfNumber, "bookcase");
  };

  const handleClearBookcase = async (destination: "bookcase" | "global") => {
    if (!selectedBookcaseId) {
      return;
    }
    const now = new Date().toISOString();
    const updates = layout.shelves
      .flatMap((shelf) => shelf.slots)
      .filter((book): book is Book => Boolean(book))
      .map((book) => ({
        ...book,
        bookcase_id: destination === "bookcase" ? selectedBookcaseId : null,
        shelf: null,
        position: null,
        updated_at: now,
      }));
    await persistUpdates(updates);
  };

  const runAutoPopulate = async () => {
    if (!selectedBookcaseId) {
      return;
    }

    const emptySlots = buildEmptySlotPlan(layout.shelves, autoPopulatePlacement);
    const unorganizedCandidates = [...layout.unorganizedBookcase, ...layout.unorganizedGlobal];
    if (!emptySlots.length || !unorganizedCandidates.length) {
      return;
    }

    const candidates = sortBooksForAutoPopulate(unorganizedCandidates, autoPopulateOrder);

    const now = new Date().toISOString();
    const updates: Book[] = [];
    candidates.slice(0, emptySlots.length).forEach((book, index) => {
      const slot = emptySlots[index];
      updates.push({
        ...book,
        bookcase_id: selectedBookcaseId,
        shelf: slot.shelf,
        position: slot.position,
        updated_at: now,
      });
    });

    await persistUpdates(updates);
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
          notes: bookcaseNotes.trim(),
          added_at: selectedBookcase?.added_at || now,
          updated_at: now,
        });
      }
      if (pendingAutoPopulate) {
        await runAutoPopulate();
      }
    }
    setPendingAutoPopulate(false);
    setShowDetails((current) => !current);
  };

  const handleApplyPreset = () => {
    const preset = BOOKCASE_PRESETS.find((entry) => entry.id === selectedPresetId);
    if (!preset) {
      return;
    }
    setShelvesCount(preset.shelves);
    setCapacityPerShelf(preset.capacityPerShelf);
  };

  const handleAutoPlaceUnorganized = async () => {
    if (!selectedBookcaseId) {
      return;
    }

    const emptySlots = buildEmptySlotPlan(layout.shelves, autoPopulatePlacement);
    const unorganizedCandidates = [...layout.unorganizedBookcase, ...layout.unorganizedGlobal];
    if (!emptySlots.length || !unorganizedCandidates.length) {
      return;
    }

    const candidates = sortBooksForAutoPopulate(unorganizedCandidates, autoPopulateOrder);
    const now = new Date().toISOString();
    const updates: Book[] = [];
    candidates.slice(0, emptySlots.length).forEach((book, index) => {
      const slot = emptySlots[index];
      updates.push({
        ...book,
        bookcase_id: selectedBookcaseId,
        shelf: slot.shelf,
        position: slot.position,
        updated_at: now,
      });
    });

    await persistUpdates(updates);
  };

  return (
    <section className="caseLayout">
      <header className="caseHeader">
        <div>
          <p className="caseKicker">Spines</p>
          <h2 className="caseTitle">{bookcaseName}</h2>
          <div className="caseStats" aria-live="polite">
            <span className="caseStatPill">Shelved {occupancy.shelved}/{occupancy.totalSlots}</span>
            <span className="caseStatPill">Free slots {occupancy.free}</span>
            <span className="caseStatPill">Utilization {occupancy.percent}%</span>
            <span className="caseStatPill">Bookcase unorganized {layout.unorganizedBookcase.length}</span>
            <span className="caseStatPill">Global unorganized {layout.unorganizedGlobal.length}</span>
          </div>
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
          <div className="caseBookcaseTools">
            <span className="caseBookcasesLabel">View</span>
            <div className="caseCollectionNav" role="tablist" aria-label="Bookcase collection views">
              {([
                ["spines", "Spines"],
                ["grid", "Grid"],
                ["list", "List"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={collectionView === mode}
                  className={`caseCollectionNavButton${collectionView === mode ? " caseCollectionNavButtonActive" : ""}`}
                  onClick={() => setCollectionView(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="caseHeaderActions">
          <div className="caseCollectionNav" role="tablist" aria-label="Bookcase collection views">
            {([
              ["spines", "Spines"],
              ["grid", "Grid"],
              ["list", "List"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={collectionView === mode}
                className={`caseCollectionNavButton${collectionView === mode ? " caseCollectionNavButtonActive" : ""}`}
                onClick={() => setCollectionView(mode)}
              >
                {label}
              </button>
            ))}
          </div>
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
            onClick={() => void handleAutoPlaceUnorganized()}
          >
            Auto-place
          </button>
          <button
            type="button"
            className="text-link caseEditLink"
            onClick={() => void handleClearBookcase("bookcase")}
          >
            Clear bookcase → local
          </button>
          <button
            type="button"
            className="text-link caseEditLink"
            onClick={() => void handleClearBookcase("global")}
          >
            Clear bookcase → global
          </button>
          <button
            type="button"
            className="text-link caseEditLink"
            onClick={() => setShelvesCollapsed((current) => !current)}
          >
            {shelvesCollapsed ? `Show ${collectionView}` : `Hide ${collectionView}`}
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
                {pendingAutoPopulate ? (
                  <p className="caseAutoPopulateHint" role="status">
                    Review or update these settings, then click <strong>Done</strong> to save and
                    auto-populate this bookcase.
                  </p>
                ) : null}
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
                <label>
                  Preset layout
                  <div className="casePresetRow">
                    <select
                      value={selectedPresetId}
                      onChange={(event) => setSelectedPresetId(event.target.value)}
                    >
                      {BOOKCASE_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button ghost"
                      onClick={handleApplyPreset}
                    >
                      Apply
                    </button>
                  </div>
                </label>
                <label>
                  Auto-populate order
                  <select
                    value={autoPopulateOrder}
                    onChange={(event) =>
                      setAutoPopulateOrder(event.target.value as AutoPopulateOrder)
                    }
                  >
                    <option value="current">Current unorganized order</option>
                    <option value="title_asc">Title (A → Z)</option>
                    <option value="author_asc">Author (A → Z)</option>
                    <option value="year_asc">Publish year (oldest first)</option>
                    <option value="year_desc">Publish year (newest first)</option>
                    <option value="status">Status group</option>
                    <option value="updated_desc">Recently updated</option>
                    <option value="random">Random</option>
                  </select>
                </label>
                <label>
                  Auto-populate placement
                  <select
                    value={autoPopulatePlacement}
                    onChange={(event) =>
                      setAutoPopulatePlacement(event.target.value as AutoPopulatePlacement)
                    }
                  >
                    <option value="sequential">Sequential (top-left to bottom-right)</option>
                    <option value="snake">Snake (alternate shelf direction)</option>
                    <option value="balanced">Balanced (spread evenly by shelf)</option>
                  </select>
                </label>
                <label className="caseControlFull">
                  Notes / room
                  <textarea
                    rows={2}
                    value={bookcaseNotes}
                    onChange={(event) => setBookcaseNotes(event.target.value)}
                    placeholder="e.g. Study wall, north side. Top shelf for oversized books."
                  />
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
                      : previewLocation.zone === "bookcase_unorganized"
                      ? `${bookcaseName} unorganized`
                      : "Global unorganized"}
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
          {collectionView === "spines" ? (
            <div className="caseShelves">
            {layout.shelves.map((shelf) => (
              <section key={shelf.shelfNumber} className="caseShelf">
                <header className="caseShelfHeader">
                  <span>Shelf {shelf.shelfNumber}</span>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => void handleClearShelf(shelf.shelfNumber)}
                    disabled={!shelf.slots.some(Boolean)}
                  >
                    Clear shelf
                  </button>
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
                <span>Bookcase unorganized</span>
                <span>{layout.unorganizedBookcase.length} books</span>
              </header>
              <div
                className="caseUnorganizedList"
                role="list"
                onDragOver={(event) => {
                  if (dragUnlocked) {
                    event.preventDefault();
                  }
                }}
                onDrop={handleDropUnorganizedBookcase}
              >
                {layout.unorganizedBookcase.length ? (
                  layout.unorganizedBookcase.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      className="caseSpine caseSpineUnorganized"
                      role="listitem"
                      aria-label={`${book.title || "Untitled"} · ${bookcaseName} unorganized`}
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
                  <div className="caseUnorganizedEmpty">No books are unshelved in this bookcase.</div>
                )}
              </div>
            </section>
          </div>
          ) : (
            <section className="caseDetachedCollection" aria-live="polite">
              <header className="caseDetachedCollectionHeader">
                <div>
                  <p className="caseKicker">{collectionView === "grid" ? "Grid" : "List"} collection view</p>
                  <h3 className="caseDetachedCollectionTitle">{bookcaseName}</h3>
                </div>
                <p className="caseDetachedCollectionMeta">
                  {layout.shelves.reduce((count, shelf) => count + shelf.slots.filter(Boolean).length, 0)} shelved · {layout.unorganizedBookcase.length} bookcase unorganized
                </p>
              </header>
              <div className={`caseDetachedCollectionItems caseDetachedCollectionItems--${collectionView}`}>
                {layout.shelves.flatMap((shelf) =>
                  shelf.slots
                    .map((book, index) => ({ book, shelf: shelf.shelfNumber, position: index + 1 }))
                    .filter((entry) => entry.book)
                    .map((entry) => {
                      const book = entry.book as Book;
                      return (
                        <button
                          key={book.id}
                          type="button"
                          className={`caseDetachedBook caseDetachedBook--${collectionView}`}
                          onClick={(event) => handleClick(event, book.id)}
                          onDoubleClick={() => handleDoubleClick(book.id)}
                          onMouseEnter={(event) => {
                            setPreviewId(book.id);
                            setHoverPosition({ x: event.clientX, y: event.clientY });
                          }}
                          onMouseMove={(event) => setHoverPosition({ x: event.clientX, y: event.clientY })}
                          onMouseLeave={() => setPreviewId(null)}
                        >
                          <span className="caseDetachedBookTitle">{book.title || "Untitled"}</span>
                          <span className="caseDetachedBookMeta">
                            {book.authors || "Unknown author"} · S{entry.shelf} · P{entry.position}
                          </span>
                        </button>
                      );
                    })
                )}
              </div>
            </section>
          )}
          <section className="caseShelf caseUnorganized caseUnorganizedDetached">
            <header className="caseShelfHeader">
              <span>Global unorganized</span>
              <span>{layout.unorganizedGlobal.length} books</span>
            </header>
            <div
              className="caseUnorganizedList"
              role="list"
              onDragOver={(event) => {
                if (dragUnlocked) {
                  event.preventDefault();
                }
              }}
              onDrop={handleDropUnorganizedGlobal}
            >
              {layout.unorganizedGlobal.length ? (
                layout.unorganizedGlobal.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    className="caseSpine caseSpineUnorganized"
                    role="listitem"
                    aria-label={`${book.title || "Untitled"} · Global unorganized`}
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
                <div className="caseUnorganizedEmpty">Global unorganized is empty.</div>
              )}
            </div>
          </section>
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
                  : previewLocation.zone === "bookcase_unorganized"
                      ? `${bookcaseName} unorganized`
                      : "Global unorganized"}
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
                      : quickEditLocation.zone === "bookcase_unorganized"
                      ? `${bookcaseName} unorganized`
                      : "Global unorganized"}
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
        </div>
      ) : null}
    </section>
  );
};
