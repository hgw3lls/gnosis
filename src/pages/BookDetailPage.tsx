import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLibraryStore } from "../app/store";
import { Book, STATUS_OPTIONS, normalizeBook } from "../db/schema";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { isValidIsbn13, lookupByIsbn13 } from "../lib/isbnLookup";

const emptyBook: Book = {
  id: 0,
  title: "",
  authors: "",
  publisher: "",
  publish_year: "",
  language: "en",
  format: "",
  isbn13: "",
  tags: "",
  collections: "",
  projects: "",
  location: "",
  bookcase_id: null,
  shelf: null,
  position: null,
  status: "to_read",
  notes: "",
  cover_image: "",
  added_at: "",
  updated_at: "",
};

type BookDetailPageProps = {
  bookId?: number | "new";
  onClose?: () => void;
  onCreated?: (id: number) => void;
  isModal?: boolean;
  initialScan?: boolean;
};

export const BookDetailPage = ({
  bookId,
  onClose,
  onCreated,
  isModal = false,
  initialScan = false,
}: BookDetailPageProps) => {
  const params = useParams();
  const id = bookId != null ? String(bookId) : params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const books = useLibraryStore((state) => state.books);
  const bookcases = useLibraryStore((state) => state.bookcases);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const removeBook = useLibraryStore((state) => state.removeBook);
  const isUnlocked = useLibraryStore((state) => state.isUnlocked);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [foundIsbn, setFoundIsbn] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "lookup" | "not_found" | "error" | "success">(
    "idle",
  );
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<"idle" | "updating" | "not_found" | "error" | "success">(
    "idle",
  );
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const scanTriggeredRef = useRef(false);

  const existing = useMemo(() => {
    if (!id || id === "new") {
      return null;
    }
    return books.find((book) => book.id === Number(id)) ?? null;
  }, [books, id]);

  const [formState, setFormState] = useState<Book>(emptyBook);
  const [isEditing, setIsEditing] = useState((!id || id === "new") && isUnlocked);
  const selectedBookcase = useMemo(
    () =>
      formState.bookcase_id != null
        ? bookcases.find((bookcase) => bookcase.id === formState.bookcase_id) ?? null
        : null,
    [bookcases, formState.bookcase_id]
  );
  const shelfStats = useMemo(() => {
    if (!selectedBookcase) {
      return { counts: new Map<number, number>(), positions: new Map<number, Set<number>>() };
    }
    const counts = new Map<number, number>();
    const positions = new Map<number, Set<number>>();
    books.forEach((book) => {
      if (book.id === formState.id) {
        return;
      }
      if (book.bookcase_id !== selectedBookcase.id) {
        return;
      }
      if (!book.shelf || !book.position) {
        return;
      }
      counts.set(book.shelf, (counts.get(book.shelf) ?? 0) + 1);
      const slot = positions.get(book.shelf) ?? new Set<number>();
      slot.add(book.position);
      positions.set(book.shelf, slot);
    });
    return { counts, positions };
  }, [books, formState.id, selectedBookcase]);

  useEffect(() => {
    if (existing) {
      setFormState(existing);
      setIsEditing(false);
      return;
    }
    const nextId = books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
    const now = new Date().toISOString();
    setFormState({ ...emptyBook, id: nextId, added_at: now, updated_at: now });
    setIsEditing(isUnlocked);
  }, [existing, books, isUnlocked]);

  const handleChange = (key: keyof Book, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleBookcaseChange = (value: string) => {
    const nextBookcaseId = value ? Number(value) : null;
    setFormState((prev) => ({
      ...prev,
      bookcase_id: Number.isFinite(nextBookcaseId) ? nextBookcaseId : null,
      shelf: null,
      position: null,
    }));
  };

  const handleShelfChange = (value: string) => {
    const nextShelf = value ? Number(value) : null;
    setFormState((prev) => ({
      ...prev,
      shelf: Number.isFinite(nextShelf) ? nextShelf : null,
      position: null,
    }));
  };

  const handlePositionChange = (value: string) => {
    const nextPosition = value ? Number(value) : null;
    setFormState((prev) => ({
      ...prev,
      position: Number.isFinite(nextPosition) ? nextPosition : null,
    }));
  };

  const handleCoverUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormState((prev) => ({ ...prev, cover_image: reader.result }));
        setIsEditing(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const normalized = normalizeBook({
      ...formState,
      id: existing?.id ?? Number(formState.id),
      bookcase_id: formState.bookcase_id ?? null,
      shelf: formState.bookcase_id ? formState.shelf : null,
      position: formState.bookcase_id ? formState.position : null,
      updated_at: now,
      added_at: existing?.added_at ?? now,
    });
    await upsertBook(normalized);
    setIsEditing(false);
    if (!existing && id === "new" && onCreated) {
      onCreated(normalized.id);
      return;
    }
    if (onClose) {
      return;
    }
    const returnTo =
      (location.state as { from?: string } | null | undefined)?.from ?? null;
    if (existing && returnTo) {
      navigate(returnTo);
      return;
    }
    if (existing) {
      navigate("/");
      return;
    }
    navigate(`/book/${normalized.id}`);
  };

  const handleDelete = async () => {
    if (!existing) {
      if (onClose) {
        onClose();
        return;
      }
      navigate("/");
      return;
    }
    if (!window.confirm("Remove this book from your library?")) {
      return;
    }
    await removeBook(existing.id);
    if (onClose) {
      onClose();
      return;
    }
    navigate("/");
  };

  const canEditId = !existing;
  const formId = "book-detail-form";

  const handleOpenScanner = () => {
    if (!isUnlocked) {
      setLookupState("error");
      setLookupMessage("Unlock to scan or edit.");
      return;
    }
    setScannerOpen(true);
    setFoundIsbn(null);
    setLookupState("idle");
    setLookupMessage(null);
  };

  const shouldAutoScan = initialScan || searchParams.get("scan") === "1";

  useEffect(() => {
    if (!shouldAutoScan) {
      scanTriggeredRef.current = false;
      return;
    }
    if (scanTriggeredRef.current) {
      return;
    }
    scanTriggeredRef.current = true;
    handleOpenScanner();
  }, [shouldAutoScan]);

  const handleCloseScanner = () => {
    setScannerOpen(false);
    if (searchParams.get("scan") === "1") {
      setSearchParams({}, { replace: true });
    }
  };

  const handleScannerIsbn = async (isbn: string, mode: "lookup" | "auto_add") => {
    await handleIsbnLookup(isbn);
    if (mode === "lookup") {
      setScannerOpen(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate("/");
  };

  const handleIsbnLookup = async (isbn: string) => {
    if (!isUnlocked) {
      setLookupState("error");
      setLookupMessage("Unlock to edit book details.");
      return;
    }
    setFoundIsbn(isbn);
    setLookupState("lookup");
    setLookupMessage("Looking up book metadata...");
    try {
      const meta = await lookupByIsbn13(isbn);
      if (!meta) {
        setLookupState("not_found");
        setLookupMessage("No Open Library entry found.");
        return;
      }
      setFormState((prev) => ({
        ...prev,
        title: meta.title || prev.title,
        authors: meta.authors || prev.authors,
        publisher: meta.publisher || prev.publisher,
        publish_year: meta.publishYear || prev.publish_year,
        isbn13: meta.isbn13,
        cover_image: prev.cover_image || meta.coverImage,
      }));
      setIsEditing(true);
      setLookupState("success");
      setLookupMessage("Book details loaded.");
    } catch (error) {
      setLookupState("error");
      setLookupMessage("Lookup failed. Check your connection.");
    }
  };

  const handleUpdateFromOpenLibrary = async () => {
    const isbn = formState.isbn13;
    if (!isbn || !isValidIsbn13(isbn)) {
      setUpdateState("error");
      setUpdateMessage("Enter a valid ISBN-13 to update.");
      return;
    }
    setUpdateState("updating");
    setUpdateMessage("Updating book details...");
    try {
      const meta = await lookupByIsbn13(isbn);
      if (!meta) {
        setUpdateState("not_found");
        setUpdateMessage("No Open Library entry found.");
        return;
      }
      const now = new Date().toISOString();
      const updated = normalizeBook({
        ...formState,
        title: meta.title || formState.title,
        authors: meta.authors || formState.authors,
        publisher: meta.publisher || formState.publisher,
        publish_year: meta.publishYear || formState.publish_year,
        isbn13: meta.isbn13 || formState.isbn13,
        cover_image: formState.cover_image || meta.coverImage,
        updated_at: now,
        added_at: formState.added_at || now,
      });
      await upsertBook(updated);
      setFormState(updated);
      setIsEditing(false);
      setUpdateState("success");
      setUpdateMessage("Book details updated.");
    } catch (error) {
      setUpdateState("error");
      setUpdateMessage("Update failed. Check your connection.");
    }
  };

  const shelves = selectedBookcase
    ? Array.from({ length: selectedBookcase.shelves }, (_, index) => index + 1)
    : [];
  const capacity = selectedBookcase?.capacity_per_shelf ?? 0;
  const activeShelf = formState.shelf ?? null;
  const shelfIsFull = (shelfNumber: number) =>
    (shelfStats.counts.get(shelfNumber) ?? 0) >= capacity;
  const occupiedPositions = activeShelf
    ? shelfStats.positions.get(activeShelf) ?? new Set<number>()
    : new Set<number>();

  const detailContent = (
    <section className="detail">
        <header className="detail-header">
          <div>
            {isModal ? (
              <button type="button" className="text-link" onClick={handleClose}>
                Close
              </button>
            ) : (
              <NavLink to="/" className="text-link">
                Back to library
              </NavLink>
            )}
            {isEditing ? (
              <input
                className="title-input"
                value={formState.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="Untitled"
              />
            ) : (
              <h1 className="detail-title">{formState.title || "Untitled"}</h1>
            )}
            {isEditing ? (
              <input
                className="detail-authors input"
                value={formState.authors}
                onChange={(event) => handleChange("authors", event.target.value)}
                placeholder="Authors"
              />
            ) : (
              <p className="detail-authors">{formState.authors || "Unknown author"}</p>
            )}
            <div className="detail-status">
              {isEditing ? (
                <select
                  value={formState.status}
                  onChange={(event) => handleChange("status", event.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replace("_", " ")}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="status-pill">{formState.status.replace("_", " ")}</span>
              )}
            </div>
          </div>
          <div className="detail-actions">
            <button
              className="button ghost"
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              disabled={!isUnlocked}
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={handleUpdateFromOpenLibrary}
              disabled={updateState === "updating"}
            >
              {updateState === "updating" ? "Updating..." : "Update"}
            </button>
            <button className="button primary" type="submit" form={formId} disabled={!isEditing}>
              Save
            </button>
            {updateMessage ? <span className="helper-text">{updateMessage}</span> : null}
          </div>
        </header>
        <form id={formId} onSubmit={handleSubmit} className="detail-body">
          <div className="detail-main">
            <section className="detail-block">
              <h3>Notes</h3>
              <textarea
                className="textarea-large"
                value={formState.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
                readOnly={!isEditing}
                rows={8}
              />
            </section>
            <section className="detail-block">
              <h3>Tags</h3>
              <input
                className="input"
                value={formState.tags}
                onChange={(event) => handleChange("tags", event.target.value)}
                readOnly={!isEditing}
              />
            </section>
            <section className="detail-block">
              <h3>Collections</h3>
              <input
                className="input"
                value={formState.collections}
                onChange={(event) => handleChange("collections", event.target.value)}
                readOnly={!isEditing}
              />
            </section>
            <section className="detail-block">
              <h3>Projects</h3>
              <input
                className="input"
                value={formState.projects}
                onChange={(event) => handleChange("projects", event.target.value)}
                readOnly={!isEditing}
              />
            </section>
            <section className="detail-block">
              <h3>Quotes</h3>
              <div className="placeholder">Add quotes here in a future update.</div>
            </section>
            <div className="form-actions">
              <button className="button ghost" type="button" onClick={handleDelete}>
                {existing ? "Remove" : "Cancel"}
              </button>
              <button className="button primary" type="submit" disabled={!isEditing}>
                Save
              </button>
            </div>
          </div>
          <aside className="detail-rail">
            <div className="rail-block">
              <label>
                ID
                <input
                  className="input"
                  type="number"
                  value={formState.id}
                  onChange={(event) => handleChange("id", event.target.value)}
                  readOnly={!canEditId || !isEditing}
                />
              </label>
              <label>
                Publisher
                <input
                  className="input"
                  value={formState.publisher}
                  onChange={(event) => handleChange("publisher", event.target.value)}
                  readOnly={!isEditing}
                />
              </label>
              <label>
                Publish year
                <input
                  className="input"
                  inputMode="numeric"
                  value={formState.publish_year}
                  onChange={(event) => handleChange("publish_year", event.target.value)}
                  readOnly={!isEditing}
                />
              </label>
              <label>
                Language
                <input
                  className="input"
                  value={formState.language}
                  onChange={(event) => handleChange("language", event.target.value)}
                  readOnly={!isEditing}
                />
              </label>
              <label>
                Format
                <input
                  className="input"
                  value={formState.format}
                  onChange={(event) => handleChange("format", event.target.value)}
                  readOnly={!isEditing}
                />
              </label>
              <label>
                ISBN-13
                <div className="isbn-actions">
                  <input
                    className="input"
                    value={formState.isbn13}
                    onChange={(event) => handleChange("isbn13", event.target.value)}
                    readOnly={!isEditing}
                  />
                  {isEditing ? (
                    <button className="button ghost" type="button" onClick={handleOpenScanner}>
                      Scan Barcode
                    </button>
                  ) : null}
                </div>
              </label>
              <label>
                Bookcase
                <select
                  className="input"
                  value={formState.bookcase_id ?? ""}
                  onChange={(event) => handleBookcaseChange(event.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Unassigned</option>
                  {bookcases.map((bookcase) => (
                    <option key={bookcase.id} value={bookcase.id}>
                      {bookcase.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Shelf
                <select
                  className="input"
                  value={formState.shelf ?? ""}
                  onChange={(event) => handleShelfChange(event.target.value)}
                  disabled={!isEditing || !selectedBookcase}
                >
                  <option value="">Unassigned</option>
                  {shelves.map((shelfNumber) => {
                    const full = shelfIsFull(shelfNumber);
                    const isCurrentShelf = formState.shelf === shelfNumber;
                    return (
                      <option
                        key={`shelf-${shelfNumber}`}
                        value={shelfNumber}
                        disabled={!isCurrentShelf && full}
                      >
                        Shelf {shelfNumber}
                        {full && !isCurrentShelf ? " (full)" : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                Position
                <select
                  className="input"
                  value={formState.position ?? ""}
                  onChange={(event) => handlePositionChange(event.target.value)}
                  disabled={!isEditing || !selectedBookcase || !activeShelf}
                >
                  <option value="">Unassigned</option>
                  {Array.from({ length: capacity }, (_, index) => {
                    const position = index + 1;
                    const taken = occupiedPositions.has(position);
                    const isCurrent = formState.position === position;
                    return (
                      <option
                        key={`position-${position}`}
                        value={position}
                        disabled={!isCurrent && taken}
                      >
                        Position {position}
                        {taken && !isCurrent ? " (taken)" : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                Location
                <input
                  className="input"
                  value={formState.location}
                  onChange={(event) => handleChange("location", event.target.value)}
                  readOnly={!isEditing}
                />
              </label>
              <label>
                Cover image
                <input
                  className="input"
                  value={formState.cover_image}
                  onChange={(event) => handleChange("cover_image", event.target.value)}
                  readOnly={!isEditing}
                />
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={!isEditing}
                />
              </label>
              <label>
                Added
                <input className="input" value={formState.added_at} readOnly />
              </label>
              <label>
                Updated
                <input className="input" value={formState.updated_at} readOnly />
              </label>
            </div>
          </aside>
        </form>
      </section>
  );

  return (
    <>
      {isModal ? (
        <div className="modal-overlay book-detail-overlay" onClick={handleClose}>
          <div
            className="modal book-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {detailContent}
          </div>
        </div>
      ) : (
        detailContent
      )}
      <BarcodeScannerModal
        open={scannerOpen}
        foundIsbn={foundIsbn}
        lookupState={lookupState}
        lookupMessage={lookupMessage}
        onClose={handleCloseScanner}
        onIsbn={handleScannerIsbn}
      />
    </>
  );
};
