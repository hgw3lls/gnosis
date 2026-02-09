import { FormEvent, useMemo, useState } from "react";
import { useLibraryStore } from "../app/store";
import { normalizeBook } from "../db/schema";

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

  const nextId = useMemo(() => {
    return books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
  }, [books]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const record = normalizeBook({
      id: nextId,
      title: title.trim(),
      status: "to_read",
      language: "en",
      added_at: now,
      updated_at: now,
    });
    await upsertBook(record);
    setTitle("");
    onClose();
    onCreated(record.id);
  };

  const handleScan = () => {
    onClose();
    onScan();
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
        <form onSubmit={handleSubmit}>
          <label className="modal-label">
            Title
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <div className="form-actions">
            <button className="button ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button ghost" type="button" onClick={handleScan}>
              Scan Barcode
            </button>
            <button className="button primary" type="submit" disabled={!title.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
