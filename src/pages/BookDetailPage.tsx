import { FormEvent, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useLibraryStore } from "../app/store";
import { Book, STATUS_OPTIONS, normalizeBook } from "../db/schema";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { lookupByIsbn13 } from "../lib/isbnLookup";

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
  status: "to_read",
  notes: "",
  cover_image: "",
  added_at: "",
  updated_at: "",
};

export const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const books = useLibraryStore((state) => state.books);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const removeBook = useLibraryStore((state) => state.removeBook);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [foundIsbn, setFoundIsbn] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "lookup" | "not_found" | "error" | "success">(
    "idle",
  );
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const existing = useMemo(() => {
    if (!id || id === "new") {
      return null;
    }
    return books.find((book) => book.id === Number(id)) ?? null;
  }, [books, id]);

  const [formState, setFormState] = useState<Book>(emptyBook);
  const [isEditing, setIsEditing] = useState(!id || id === "new");

  useEffect(() => {
    if (existing) {
      setFormState(existing);
      setIsEditing(false);
      return;
    }
    const nextId = books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
    const now = new Date().toISOString();
    setFormState({ ...emptyBook, id: nextId, added_at: now, updated_at: now });
    setIsEditing(true);
  }, [existing, books]);

  const handleChange = (key: keyof Book, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const normalized = normalizeBook({
      ...formState,
      id: existing?.id ?? Number(formState.id),
      updated_at: now,
      added_at: existing?.added_at ?? now,
    });
    await upsertBook(normalized);
    setIsEditing(false);
    navigate(`/book/${normalized.id}`);
  };

  const handleDelete = async () => {
    if (!existing) {
      navigate("/");
      return;
    }
    if (!window.confirm("Remove this book from your library?")) {
      return;
    }
    await removeBook(existing.id);
    navigate("/");
  };

  const canEditId = !existing;
  const formId = "book-detail-form";

  const handleOpenScanner = () => {
    setScannerOpen(true);
    setFoundIsbn(null);
    setLookupState("idle");
    setLookupMessage(null);
  };

  const handleIsbnLookup = async (isbn: string) => {
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
        cover_image: meta.coverImage || prev.cover_image,
      }));
      setIsEditing(true);
      setLookupState("success");
      setLookupMessage("Book details loaded.");
    } catch (error) {
      setLookupState("error");
      setLookupMessage("Lookup failed. Check your connection.");
    }
  };

  return (
    <>
      <section className="detail">
        <header className="detail-header">
          <div>
            <NavLink to="/" className="text-link">
              Back to library
            </NavLink>
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
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
            <button className="button primary" type="submit" form={formId} disabled={!isEditing}>
              Save
            </button>
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
      <BarcodeScannerModal
        open={scannerOpen}
        foundIsbn={foundIsbn}
        lookupState={lookupState}
        lookupMessage={lookupMessage}
        onClose={() => setScannerOpen(false)}
        onIsbn={handleIsbnLookup}
      />
    </>
  );
};
