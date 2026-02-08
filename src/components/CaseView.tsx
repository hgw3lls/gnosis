import { useEffect, useMemo, useState } from "react";
import { Book } from "../db/schema";

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
  name: string,
  shelves: number,
  capacityPerShelf: number
): { bookcase: Bookcase; locations: BookLocation[] } => {
  const bookcase: Bookcase = {
    name,
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
  const [bookcaseName, setBookcaseName] = useState("Bookcase A");
  const [shelvesCount, setShelvesCount] = useState(3);
  const [capacityPerShelf, setCapacityPerShelf] = useState(12);
  const [showDetails, setShowDetails] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const effectiveShelves = showDetails ? shelvesCount : 3;
  const effectiveCapacity = showDetails
    ? capacityPerShelf
    : Math.max(1, Math.ceil(books.length / 3));

  const { bookcase, locations } = useMemo(
    () =>
      buildBookcase(
        books,
        bookcaseName,
        Math.max(1, effectiveShelves),
        Math.max(6, effectiveCapacity)
      ),
    [bookcaseName, books, effectiveCapacity, effectiveShelves]
  );
  const [activeLocations, setActiveLocations] = useState<BookLocation[]>(locations);

  useEffect(() => {
    setActiveLocations(locations);
  }, [locations]);
  const previewLocation = useMemo(
    () =>
      activeLocations.find((location) => location.book.id === previewId) ?? null,
    [activeLocations, previewId]
  );

  const shelves = useMemo(() => {
    const shelfMap = new Map<number, BookLocation[]>();
    activeLocations.forEach((location) => {
      const list = shelfMap.get(location.shelf) ?? [];
      list.push(location);
      shelfMap.set(location.shelf, list);
    });
    return Array.from({ length: bookcase.shelves }, (_, index) => {
      const shelfNumber = index + 1;
      const shelfBooks = (shelfMap.get(shelfNumber) ?? []).sort(
        (a, b) => a.position - b.position
      );
      return {
        shelfNumber,
        books: shelfBooks,
      };
    });
  }, [activeLocations, bookcase.shelves]);

  const moveBook = (bookId: number, targetShelf: number, targetIndex?: number) => {
    setActiveLocations((current) => {
      const source = current.find((location) => location.book.id === bookId);
      if (!source) {
        return current;
      }
      const shelfMap = new Map<number, BookLocation[]>();
      current.forEach((location) => {
        const list = shelfMap.get(location.shelf) ?? [];
        list.push(location);
        shelfMap.set(location.shelf, list);
      });
      const sourceList = (shelfMap.get(source.shelf) ?? []).filter(
        (location) => location.book.id !== bookId
      );
      shelfMap.set(source.shelf, sourceList);
      const targetList = shelfMap.get(targetShelf) ?? [];
      const insertAt =
        targetIndex == null
          ? targetList.length
          : Math.max(0, Math.min(targetIndex, targetList.length));
      targetList.splice(insertAt, 0, { ...source, shelf: targetShelf });
      shelfMap.set(targetShelf, targetList);
      const rebuilt: BookLocation[] = [];
      Array.from({ length: bookcase.shelves }, (_, index) => index + 1).forEach(
        (shelfNumber) => {
          const list = shelfMap.get(shelfNumber) ?? [];
          list.forEach((location, idx) => {
            rebuilt.push({ ...location, shelf: shelfNumber, position: idx + 1 });
          });
        }
      );
      return rebuilt;
    });
  };

  if (books.length === 0) {
    return (
      <div className="panel case-empty" role="status">
        No books match your filters yet.
      </div>
    );
  }

  return (
    <section className="caseLayout">
      <header className="caseHeader">
        <div>
          <p className="caseKicker">Case Spines</p>
          <h2 className="caseTitle">{bookcaseName}</h2>
          <button
            type="button"
            className="caseEditLink"
            onClick={() => setShowDetails((current) => !current)}
          >
            {showDetails ? "Hide bookcase details" : "Edit bookcase details"}
          </button>
          <p className="caseMeta">
            {bookcase.shelves} shelves · {bookcase.capacityPerShelf} positions per
            shelf
          </p>
        </div>
        {showDetails ? (
          <div className="caseControls">
            <p className="caseKicker">Bookcase details</p>
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
                    setShelvesCount(Number.parseInt(event.target.value, 10) || 1)
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
            </div>
          </div>
        ) : null}
        <div className="casePreview" aria-live="polite">
          <p className="caseKicker">Spine info</p>
          {previewLocation ? (
            <div>
              <p className="casePreviewTitle">
                {previewLocation.book.title || "Untitled"}
              </p>
              <p className="casePreviewMeta">
                {previewLocation.book.authors || "Unknown author"} · A · S{previewLocation.shelf}
                · P{previewLocation.position}
              </p>
              <div className="casePreviewActions">
                <button type="button">Quick edit</button>
                <button type="button">Move</button>
                <button type="button">Categorize</button>
              </div>
            </div>
          ) : (
            <p className="casePreviewEmpty">Hover or tap a spine to preview.</p>
          )}
        </div>
      </header>
      <div className="caseShelves">
        {shelves.map((shelf) => (
          <section key={shelf.shelfNumber} className="caseShelf">
            <header className="caseShelfHeader">
              <span>Shelf {shelf.shelfNumber}</span>
            </header>
            <div
              className="caseShelfRow"
              role="list"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const payload = event.dataTransfer.getData("text/plain");
                const id = Number.parseInt(payload, 10);
                if (Number.isNaN(id)) {
                  return;
                }
                moveBook(id, shelf.shelfNumber);
              }}
            >
              {shelf.books.map((location, index) => (
                <button
                  key={location.book.id}
                  type="button"
                  className="caseSpine"
                  role="listitem"
                  aria-label={`${location.book.title || "Untitled"} · Bookcase A · Shelf ${
                    location.shelf
                  } · Position ${location.position}`}
                  onClick={() => onOpenBook(location.book.id)}
                  onMouseEnter={() => setPreviewId(location.book.id)}
                  onMouseLeave={() => setPreviewId(null)}
                  onFocus={() => setPreviewId(location.book.id)}
                  onBlur={() => setPreviewId(null)}
                  onTouchStart={() => setPreviewId(location.book.id)}
                  draggable
                  onDragStart={(event) => {
                    setDraggingId(location.book.id);
                    event.dataTransfer.setData(
                      "text/plain",
                      String(location.book.id)
                    );
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const payload = event.dataTransfer.getData("text/plain");
                    const id = Number.parseInt(payload, 10);
                    if (Number.isNaN(id)) {
                      return;
                    }
                    moveBook(id, shelf.shelfNumber, index);
                  }}
                  data-dragging={draggingId === location.book.id}
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
    </section>
  );
};
