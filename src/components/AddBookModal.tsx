import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLibraryStore } from "../app/store";
import { normalizeBook } from "../db/schema";
import { lookupBookByIsbn } from "../services/openLibraryLookup";
import { parseIsbn } from "../utils/isbn";
import { buildQuickAddSuggestions } from "../utils/valueSuggestions";
import { BarcodeScannerModal } from "./BarcodeScannerModal";

type AddBookModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
};

const appendPipeValue = (existing: string, value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return existing;
  }
  const values = existing
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (values.includes(normalized)) {
    return existing;
  }
  return [...values, normalized].join(" | ");
};

export const AddBookModal = ({ open, onClose, onCreated }: AddBookModalProps) => {
  const books = useLibraryStore((state) => state.books);
  const upsertBook = useLibraryStore((state) => state.upsertBook);

  const [isbn, setIsbn] = useState("");
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishYear, setPublishYear] = useState("");
  const [language, setLanguage] = useState("en");
  const [format, setFormat] = useState("");
  const [tags, setTags] = useState("");
  const [collections, setCollections] = useState("");
  const [projects, setProjects] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] =
    useState<"to_read" | "reading" | "referenced" | "finished">("to_read");
  const [notes, setNotes] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [stickyFields, setStickyFields] = useState(false);
  const [lookupTick, setLookupTick] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [foundIsbn, setFoundIsbn] = useState<string | null>(null);
  const [scannerLookupState, setScannerLookupState] =
    useState<"idle" | "lookup" | "not_found" | "error" | "success">("idle");
  const [scannerLookupMessage, setScannerLookupMessage] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = useMemo(() => buildQuickAddSuggestions(books), [books]);

  const nextId = useMemo(() => books.reduce((max, book) => Math.max(max, book.id), 0) + 1, [books]);

  useEffect(() => {
    if (!open) {
      return;
    }
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      const parsed = parseIsbn(isbn);
      if (parsed.isbn13 || parsed.isbn10) {
        void handleLookup();
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isbn, lookupTick, open]);

  if (!open) {
    return null;
  }

  const resetForm = (mode: "full" | "quick") => {
    setIsbn("");
    setTitle("");
    setAuthors("");
    setPublisher(mode === "quick" && stickyFields ? publisher : "");
    setPublishYear("");
    setLanguage(mode === "quick" && stickyFields ? language : "en");
    setFormat(mode === "quick" ? format : "");
    setTags(mode === "quick" && stickyFields ? tags : "");
    setCollections(mode === "quick" && stickyFields ? collections : "");
    setProjects(mode === "quick" && stickyFields ? projects : "");
    setLocation(mode === "quick" ? location : "");
    setStatus(mode === "quick" ? status : "to_read");
    setNotes(mode === "quick" && stickyFields ? notes : "");
    setCoverImage("");
    setLookupError("");
  };

  const saveBook = async (mode: "save" | "save_and_add") => {
    if (!title.trim() || !authors.trim()) {
      return;
    }
    const parsed = parseIsbn(isbn);
    const normalizedIsbn13 = parsed.isbn13 ?? "";

    const now = new Date().toISOString();
    const record = normalizeBook({
      id: nextId,
      title: title.trim(),
      authors: authors.trim(),
      publisher: publisher.trim(),
      publish_year: publishYear.trim(),
      language: language.trim() || "en",
      format: format.trim(),
      isbn13: normalizedIsbn13,
      tags: tags.trim(),
      collections: collections.trim(),
      projects: projects.trim(),
      location: location.trim(),
      status,
      notes: notes.trim(),
      cover_image: coverImage.trim(),
      added_at: now,
      updated_at: now,
    });

    await upsertBook(record);
    onCreated(record.id);

    if (mode === "save") {
      resetForm("full");
      onClose();
      return;
    }

    resetForm("quick");
    window.requestAnimationFrame(() => titleInputRef.current?.focus());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveBook("save");
  };

  const handleLookup = async () => {
    const parsed = parseIsbn(isbn);
    if (!parsed.isbn13 && !parsed.isbn10) {
      if (isbn.trim().length) {
        setLookupError("ISBN should be 10 or 13 characters (numbers, optional X for ISBN-10).");
      }
      return;
    }

    setLookupError("");
    setLookupLoading(true);
    try {
      const mapped = await lookupBookByIsbn(isbn);
      if (!mapped) {
        setLookupError("Lookup didn’t find a match. Continue with manual entry.");
        return;
      }
      setTitle((prev) => mapped.title || prev);
      setAuthors((prev) => mapped.authors || prev);
      setPublisher((prev) => mapped.publisher || prev);
      setPublishYear((prev) => mapped.publish_year || prev);
      setCoverImage((prev) => mapped.cover_image || prev);
      setIsbn(mapped.isbn13 || parsed.normalized);
    } catch {
      setLookupError("Lookup failed. You can continue entering details manually.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal quick-add-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>Quick Add</h2>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-grid">
            <label className="modal-label">
              ISBN10 / ISBN13
              <div className="inline-stack">
                <input
                  className="input"
                  value={isbn}
                  onChange={(event) => {
                    setIsbn(event.target.value);
                    setLookupError("");
                  }}
                  placeholder="978... or 0..."
                />
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => {
                    setLookupTick((tick) => tick + 1);
                    void handleLookup();
                  }}
                  disabled={lookupLoading}
                >
                  {lookupLoading ? "Looking up..." : "Lookup"}
                </button>
                <button className="button ghost" type="button" onClick={() => setScannerOpen(true)}>
                  Scan ISBN
                </button>
              </div>
            </label>
            <label className="modal-label">
              Title
              <input
                ref={titleInputRef}
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>
            <label className="modal-label">
              Authors
              <input
                className="input"
                value={authors}
                onChange={(event) => setAuthors(event.target.value)}
                required
              />
            </label>
            <label className="modal-label">
              Publisher
              <input className="input" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
            </label>
            <label className="modal-label">
              Publish year
              <input className="input" value={publishYear} onChange={(event) => setPublishYear(event.target.value)} />
            </label>
            <label className="modal-label">
              Language
              <input className="input" value={language} onChange={(event) => setLanguage(event.target.value)} />
            </label>
            <label className="modal-label">
              Format
              <input className="input" value={format} onChange={(event) => setFormat(event.target.value)} />
            </label>
            <label className="modal-label">
              Cover image URL
              <input className="input" value={coverImage} onChange={(event) => setCoverImage(event.target.value)} />
            </label>
            <label className="modal-label">
              Tags
              <input
                className="input"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="tag1 | tag2"
              />
              <div className="quick-chips">
                {suggestions.tags.slice(0, 8).map((value) => (
                  <button key={value} className="chip" type="button" onClick={() => setTags((prev) => appendPipeValue(prev, value))}>
                    {value}
                  </button>
                ))}
              </div>
            </label>
            <label className="modal-label">
              Collections
              <input
                className="input"
                value={collections}
                onChange={(event) => setCollections(event.target.value)}
                placeholder="collection1 | collection2"
              />
              <div className="quick-chips">
                {suggestions.collections.slice(0, 8).map((value) => (
                  <button key={value} className="chip" type="button" onClick={() => setCollections((prev) => appendPipeValue(prev, value))}>
                    {value}
                  </button>
                ))}
              </div>
            </label>
            <label className="modal-label">
              Projects
              <input
                className="input"
                value={projects}
                onChange={(event) => setProjects(event.target.value)}
                placeholder="project1 | project2"
              />
              <div className="quick-chips">
                {suggestions.projects.slice(0, 8).map((value) => (
                  <button key={value} className="chip" type="button" onClick={() => setProjects((prev) => appendPipeValue(prev, value))}>
                    {value}
                  </button>
                ))}
              </div>
            </label>
            <label className="modal-label">
              Location
              <input
                className="input"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                list="location-suggestions"
              />
              <datalist id="location-suggestions">
                {suggestions.locations.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
            <label className="modal-label">
              Status
              <select className="input" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                <option value="to_read">To read</option>
                <option value="reading">Reading</option>
                <option value="referenced">Referenced</option>
                <option value="finished">Finished</option>
              </select>
            </label>
            <label className="modal-label full">
              Notes
              <textarea className="input" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </label>
          </div>
          {lookupError ? <p className="summary error-text">{lookupError}</p> : null}
          <label className="modal-label scanner-toggle">
            <input type="checkbox" checked={stickyFields} onChange={(event) => setStickyFields(event.target.checked)} />
            Sticky extra fields for “Save + Add Another”
          </label>
          <div className="form-actions">
            <button className="button ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button ghost" type="button" onClick={() => void saveBook("save_and_add")} disabled={!title.trim() || !authors.trim()}>
              Save + Add Another
            </button>
            <button className="button primary" type="submit" disabled={!title.trim() || !authors.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
      
      <BarcodeScannerModal
        open={scannerOpen}
        foundIsbn={foundIsbn}
        lookupState={scannerLookupState}
        lookupMessage={scannerLookupMessage}
        onClose={() => setScannerOpen(false)}
        onIsbn={async (value) => {
          setFoundIsbn(value);
          setIsbn(value);
          setScannerLookupState("lookup");
          try {
            const mapped = await lookupBookByIsbn(value);
            if (!mapped) {
              setScannerLookupState("not_found");
              setScannerLookupMessage("No book details found for scanned ISBN.");
              return;
            }
            setTitle((prev) => mapped.title || prev);
            setAuthors((prev) => mapped.authors || prev);
            setPublisher((prev) => mapped.publisher || prev);
            setPublishYear((prev) => mapped.publish_year || prev);
            setCoverImage((prev) => mapped.cover_image || prev);
            setIsbn(mapped.isbn13 || value);
            setScannerLookupState("success");
            setScannerLookupMessage("Book details loaded into Quick Add.");
          } catch {
            setScannerLookupState("error");
            setScannerLookupMessage("Lookup failed while scanning.");
          }
        }}
      />
    </div>
  );
};
