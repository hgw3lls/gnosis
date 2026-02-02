import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLibraryStore } from "../app/store";
import { Book, STATUS_OPTIONS } from "../utils/schema";
import { normalizeBook } from "../utils/csv";

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

  const existing = useMemo(() => {
    if (!id || id === "new") {
      return null;
    }
    return books.find((book) => book.id === Number(id)) ?? null;
  }, [books, id]);

  const [formState, setFormState] = useState<Book>(emptyBook);

  useEffect(() => {
    if (existing) {
      setFormState(existing);
      return;
    }
    const nextId = books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
    const now = new Date().toISOString();
    setFormState({ ...emptyBook, id: nextId, added_at: now, updated_at: now });
  }, [existing, books]);

  const handleChange = (key: keyof Book, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const normalized = normalizeBook({
      ...formState,
      id: Number(formState.id),
      updated_at: now,
      added_at: existing?.added_at ?? now,
    });
    await upsertBook(normalized);
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

  return (
    <section className="panel">
      <h2>{existing ? "Edit Book" : "New Book"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            ID
            <input
              className="input"
              type="number"
              value={formState.id}
              onChange={(event) => handleChange("id", event.target.value)}
              required
            />
          </label>
          <label>
            Title
            <input
              className="input"
              value={formState.title}
              onChange={(event) => handleChange("title", event.target.value)}
            />
          </label>
          <label>
            Authors
            <input
              className="input"
              value={formState.authors}
              onChange={(event) => handleChange("authors", event.target.value)}
            />
          </label>
          <label>
            Publisher
            <input
              className="input"
              value={formState.publisher}
              onChange={(event) => handleChange("publisher", event.target.value)}
            />
          </label>
          <label>
            Publish year
            <input
              className="input"
              inputMode="numeric"
              value={formState.publish_year}
              onChange={(event) => handleChange("publish_year", event.target.value)}
            />
          </label>
          <label>
            Language
            <input
              className="input"
              value={formState.language}
              onChange={(event) => handleChange("language", event.target.value)}
            />
          </label>
          <label>
            Format
            <input
              className="input"
              value={formState.format}
              onChange={(event) => handleChange("format", event.target.value)}
            />
          </label>
          <label>
            ISBN-13
            <input
              className="input"
              value={formState.isbn13}
              onChange={(event) => handleChange("isbn13", event.target.value)}
            />
          </label>
          <label>
            Tags
            <input
              className="input"
              value={formState.tags}
              onChange={(event) => handleChange("tags", event.target.value)}
            />
          </label>
          <label>
            Collections
            <input
              className="input"
              value={formState.collections}
              onChange={(event) => handleChange("collections", event.target.value)}
            />
          </label>
          <label>
            Projects
            <input
              className="input"
              value={formState.projects}
              onChange={(event) => handleChange("projects", event.target.value)}
            />
          </label>
          <label>
            Location
            <input
              className="input"
              value={formState.location}
              onChange={(event) => handleChange("location", event.target.value)}
            />
          </label>
          <label>
            Status
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
          </label>
          <label>
            Cover image
            <input
              className="input"
              value={formState.cover_image}
              onChange={(event) => handleChange("cover_image", event.target.value)}
            />
          </label>
          <label className="full">
            Notes
            <textarea
              value={formState.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              rows={4}
            />
          </label>
        </div>
        <div className="form-actions">
          <button className="button ghost" type="button" onClick={handleDelete}>
            {existing ? "Remove" : "Cancel"}
          </button>
          <button className="button" type="submit">
            Save
          </button>
        </div>
      </form>
    </section>
  );
};
