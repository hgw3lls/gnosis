import { FormEvent, useMemo, useState } from "react";
import { useLibraryStore } from "../app/store";
import { normalizeBook } from "../db/schema";
import { findIsbn13ByTitleAuthor } from "../services/isbnLookup";

type AddBookModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
  onScan: () => void;
};

export const AddBookModal = ({ open, onClose, onCreated, onScan }: AddBookModalProps) => {
  const books = useLibraryStore((state) => state.books);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishYear, setPublishYear] = useState("");
  const [language, setLanguage] = useState("en");
  const [format, setFormat] = useState("");
  const [isbn13, setIsbn13] = useState("");
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

  const nextId = useMemo(() => {
    return books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
  }, [books]);

  if (!open) {
    return null;
  }

  const resetForm = () => {
    setTitle("");
    setAuthors("");
    setPublisher("");
    setPublishYear("");
    setLanguage("en");
    setFormat("");
    setIsbn13("");
    setTags("");
    setCollections("");
    setProjects("");
    setLocation("");
    setStatus("to_read");
    setNotes("");
    setCoverImage("");
    setLookupError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !authors.trim()) {
      return;
    }
    const now = new Date().toISOString();
    const record = normalizeBook({
      id: nextId,
      title: title.trim(),
      authors: authors.trim(),
      publisher: publisher.trim(),
      publish_year: publishYear.trim(),
      language: language.trim() || "en",
      format: format.trim(),
      isbn13: isbn13.trim(),
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
    resetForm();
    onClose();
    onCreated(record.id);
  };

  const handleScan = () => {
    onClose();
    onScan();
  };

  const handleAutoFill = async () => {
    if (!title.trim() || !authors.trim()) {
      setLookupError("Enter title and author before auto-fill.");
      return;
    }
    setLookupError("");
    setLookupLoading(true);
    try {
      const result = await findIsbn13ByTitleAuthor({
        title,
        author: authors,
        googleApiKey: import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined,
      });
      const candidate = result.candidate;
      if (!candidate) {
        setLookupError("No lookup match found.");
        return;
      }
      setTitle((prev) => candidate.title || prev);
      setAuthors((prev) => candidate.authors || prev);
      setPublisher((prev) => candidate.publisher || prev);
      setPublishYear((prev) => candidate.publish_year || prev);
      setLanguage((prev) => candidate.language || prev);
      setFormat((prev) => candidate.format || prev);
      setIsbn13((prev) => candidate.isbn13 || prev);
      setCoverImage((prev) => candidate.cover_image || prev);
    } catch (error) {
      setLookupError("Lookup failed. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>Add Book</h2>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-grid">
            <label className="modal-label">
              Title
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>
            <label className="modal-label">
              Author
              <input
                className="input"
                value={authors}
                onChange={(event) => setAuthors(event.target.value)}
                required
              />
            </label>
            <label className="modal-label">
              Publisher
              <input
                className="input"
                value={publisher}
                onChange={(event) => setPublisher(event.target.value)}
              />
            </label>
            <label className="modal-label">
              Publish year
              <input
                className="input"
                value={publishYear}
                onChange={(event) => setPublishYear(event.target.value)}
              />
            </label>
            <label className="modal-label">
              Language
              <input
                className="input"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              />
            </label>
            <label className="modal-label">
              Format
              <input
                className="input"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              />
            </label>
            <label className="modal-label">
              ISBN13
              <input
                className="input"
                value={isbn13}
                onChange={(event) => setIsbn13(event.target.value)}
              />
            </label>
            <label className="modal-label">
              Cover image URL
              <input
                className="input"
                value={coverImage}
                onChange={(event) => setCoverImage(event.target.value)}
              />
            </label>
            <label className="modal-label">
              Tags
              <input
                className="input"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="tag1 | tag2"
              />
            </label>
            <label className="modal-label">
              Collections
              <input
                className="input"
                value={collections}
                onChange={(event) => setCollections(event.target.value)}
                placeholder="collection1 | collection2"
              />
            </label>
            <label className="modal-label">
              Projects
              <input
                className="input"
                value={projects}
                onChange={(event) => setProjects(event.target.value)}
                placeholder="project1 | project2"
              />
            </label>
            <label className="modal-label">
              Location
              <input
                className="input"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <label className="modal-label">
              Status
              <select
                className="input"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
              >
                <option value="to_read">To read</option>
                <option value="reading">Reading</option>
                <option value="referenced">Referenced</option>
                <option value="finished">Finished</option>
              </select>
            </label>
            <label className="modal-label full">
              Notes
              <textarea
                className="input"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
              />
            </label>
          </div>
          {lookupError ? <p className="summary error-text">{lookupError}</p> : null}
          <div className="form-actions">
            <button className="button ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button ghost" type="button" onClick={handleScan}>
              Scan Barcode
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={handleAutoFill}
              disabled={lookupLoading}
            >
              {lookupLoading ? "Looking up..." : "Auto-fill"}
            </button>
            <button
              className="button primary"
              type="submit"
              disabled={!title.trim() || !authors.trim()}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
