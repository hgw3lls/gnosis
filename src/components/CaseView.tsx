import { useMemo, useState } from "react";
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
  shelves: number,
  capacityPerShelf: number,
  organizeMode: "category" | "random" | "updated"
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

  const arrangedBooks =
    organizeMode === "random"
      ? [...books].sort(() => Math.random() - 0.5)
      : organizeMode === "updated"
        ? [...books].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        : books;

  const locations = arrangedBooks.map((book, index) => {
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
  const [organizeMode, setOrganizeMode] = useState<
    "category" | "random" | "updated"
  >("category");
  const [previewId, setPreviewId] = useState<number | null>(null);

  const { bookcase, locations } = useMemo(
    () =>
      buildBookcase(
        books,
        Math.max(1, shelvesCount),
        Math.max(6, capacityPerShelf),
        organizeMode
      ),
    [books, capacityPerShelf, organizeMode, shelvesCount]
  );
  const previewLocation = useMemo(
    () => locations.find((location) => location.book.id === previewId) ?? null,
    [locations, previewId]
  );

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

  return (
    <section className="caseLayout">
      <header className="caseHeader">
        <div>
          <p className="caseKicker">Case Spines</p>
          <h2 className="caseTitle">{bookcaseName}</h2>
          <p className="caseMeta">
            {bookcase.shelves} shelves · {bookcase.capacityPerShelf} positions per
            shelf
          </p>
        </div>
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
            <label>
              Organize shelves
              <select
                value={organizeMode}
                onChange={(event) =>
                  setOrganizeMode(event.target.value as typeof organizeMode)
                }
              >
                <option value="category">By category</option>
                <option value="updated">Recently updated</option>
                <option value="random">Random shuffle</option>
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
        <div className="caseCategories">
          <p className="caseKicker">Categorical ranges</p>
          <ul>
            {bookcase.categories.map((category) => (
              <li key={category.label}>
                <span>{category.label}</span>
                <span>{category.range}</span>
              </li>
            ))}
          </ul>
        </div>
      </header>
      <div className="caseShelves">
        {shelves.map((shelf) => (
          <section key={shelf.shelfNumber} className="caseShelf">
            <header className="caseShelfHeader">
              <span>Shelf {shelf.shelfNumber}</span>
              <span>
                S{shelf.shelfNumber}-P1 → S{shelf.shelfNumber}-P{bookcase.capacityPerShelf}
              </span>
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
                  onClick={() => onOpenBook(location.book.id)}
                  onMouseEnter={() => setPreviewId(location.book.id)}
                  onMouseLeave={() => setPreviewId(null)}
                  onFocus={() => setPreviewId(location.book.id)}
                  onBlur={() => setPreviewId(null)}
                  onTouchStart={() => setPreviewId(location.book.id)}
                >
                  <span className="caseSpineTitle">
                    {location.book.title || "Untitled"}
                  </span>
                  <span className="caseSpineAuthor">
                    {location.book.authors || "Unknown author"}
                  </span>
                  <span className="caseSpineLocation">
                    A · S{location.shelf} · P{location.position}
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
