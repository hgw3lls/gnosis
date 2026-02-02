import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLibraryStore } from "../app/store";
import { Book } from "../db/schema";
import { normalizeMultiValue } from "../utils/libraryFilters";

type SpinePreviewRailProps = {
  book: Book | null;
  previewing: boolean;
};

const normalizeExcerpt = (value: string) =>
  value.replace(/\s+/g, " ").trim();

export const SpinePreviewRail = ({ book, previewing }: SpinePreviewRailProps) => {
  const navigate = useNavigate();
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const [editing, setEditing] = useState(false);
  const [formState, setFormState] = useState({
    status: "",
    location: "",
    tags: "",
    collections: "",
    projects: "",
    notes: "",
  });

  useEffect(() => {
    if (!book) {
      return;
    }
    setEditing(false);
    setFormState({
      status: book.status,
      location: book.location || "",
      tags: book.tags || "",
      collections: book.collections || "",
      projects: book.projects || "",
      notes: book.notes || "",
    });
  }, [book]);

  const notesExcerpt = useMemo(() => {
    if (!book?.notes) {
      return "";
    }
    const normalized = normalizeExcerpt(book.notes);
    return normalized.length > 240 ? `${normalized.slice(0, 240)}…` : normalized;
  }, [book]);

  if (!book) {
    return (
      <aside className="previewRail">
        <div className="previewEmpty">Select a spine to preview.</div>
      </aside>
    );
  }

  const collections = normalizeMultiValue(book.collections);
  const tags = normalizeMultiValue(book.tags);
  const projects = normalizeMultiValue(book.projects);

  return (
    <aside className="previewRail">
      <div className="previewHeader">
        <span className="previewKicker">
          {previewing ? "Preview" : "Selected"}
        </span>
        <div className="previewActions">
          <button
            type="button"
            className="button ghost previewOpen"
            onClick={() => navigate(`/book/${book.id}`)}
          >
            Open
          </button>
          <button
            type="button"
            className="button ghost"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Close" : "Quick Edit"}
          </button>
        </div>
      </div>
      <h2 className="previewTitle">{book.title || "Untitled"}</h2>
      <p className="previewAuthors">{book.authors || "Unknown author"}</p>
      <div className="previewMeta">
        <div className="metaRow">
          <span>Year</span>
          <span>{book.publish_year || "—"}</span>
        </div>
        <div className="metaRow">
          <span>Publisher</span>
          <span>{book.publisher || "—"}</span>
        </div>
        <div className="metaRow">
          <span>Format</span>
          <span>{book.format || "—"}</span>
        </div>
        <div className="metaRow">
          <span>Status</span>
          <span className="pillStatus">{book.status.replace("_", " ")}</span>
        </div>
        {book.location ? (
          <div className="metaRow">
            <span>Location</span>
            <span>{book.location}</span>
          </div>
        ) : null}
        <div className="metaRow">
          <span>ISBN</span>
          <span className="mono">{book.isbn13 || "—"}</span>
        </div>
      </div>
      {notesExcerpt ? (
        <div className="previewNotes">
          <div className="previewKicker">Notes</div>
          <p>{notesExcerpt}</p>
        </div>
      ) : null}
      <div className="previewChips">
        {collections.length ? (
          <div>
            <div className="previewKicker">Collections</div>
            <div className="chipRow">
              {collections.map((value) => (
                <span key={`collection-${value}`} className="chip mono">
                  {value}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {tags.length ? (
          <div>
            <div className="previewKicker">Tags</div>
            <div className="chipRow">
              {tags.map((value) => (
                <span key={`tag-${value}`} className="chip mono">
                  {value}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {projects.length ? (
          <div>
            <div className="previewKicker">Projects</div>
            <div className="chipRow">
              {projects.map((value) => (
                <span key={`project-${value}`} className="chip mono">
                  {value}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {editing ? (
        <form
          className="previewForm"
          onSubmit={async (event) => {
            event.preventDefault();
            const updated = {
              ...book,
              status: formState.status as Book["status"],
              location: formState.location,
              tags: formState.tags,
              collections: formState.collections,
              projects: formState.projects,
              notes: formState.notes,
              updated_at: new Date().toISOString(),
            };
            await upsertBook(updated);
            setEditing(false);
          }}
        >
          <label className="formRow">
            <span>Status</span>
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              <option value="to_read">To read</option>
              <option value="reading">Reading</option>
              <option value="referenced">Referenced</option>
              <option value="finished">Finished</option>
            </select>
          </label>
          <label className="formRow">
            <span>Location</span>
            <input
              value={formState.location}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, location: event.target.value }))
              }
            />
          </label>
          <label className="formRow">
            <span>Tags</span>
            <input
              value={formState.tags}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, tags: event.target.value }))
              }
            />
          </label>
          <label className="formRow">
            <span>Collections</span>
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
          <label className="formRow">
            <span>Projects</span>
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
          <label className="formRow">
            <span>Notes</span>
            <textarea
              rows={4}
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </label>
          <div className="previewFormActions">
            <button type="submit" className="button primary">
              Save
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </aside>
  );
};
