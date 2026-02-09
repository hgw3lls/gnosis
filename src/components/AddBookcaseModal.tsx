import { FormEvent, useMemo, useState } from "react";
import { useLibraryStore } from "../app/store";
import { normalizeBookcase } from "../db/schema";

type AddBookcaseModalProps = {
  open: boolean;
  onClose: () => void;
};

export const AddBookcaseModal = ({ open, onClose }: AddBookcaseModalProps) => {
  const bookcases = useLibraryStore((state) => state.bookcases);
  const upsertBookcase = useLibraryStore((state) => state.upsertBookcase);
  const [name, setName] = useState("");
  const [shelves, setShelves] = useState(4);
  const [capacityPerShelf, setCapacityPerShelf] = useState(20);
  const [notes, setNotes] = useState("");

  const nextId = useMemo(() => {
    return bookcases.reduce((max, bookcase) => Math.max(max, bookcase.id), 0) + 1;
  }, [bookcases]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const record = normalizeBookcase({
      id: nextId,
      name: name.trim(),
      shelves,
      capacity_per_shelf: capacityPerShelf,
      notes: notes.trim(),
      added_at: now,
      updated_at: now,
    });
    await upsertBookcase(record);
    setName("");
    setShelves(4);
    setCapacityPerShelf(20);
    setNotes("");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>Add Bookcase</h2>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            Name
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <div className="modal-grid">
            <label className="modal-label">
              Shelves
              <input
                className="input"
                type="number"
                min={1}
                value={shelves}
                onChange={(event) => setShelves(Number(event.target.value))}
                required
              />
            </label>
            <label className="modal-label">
              Capacity per shelf
              <input
                className="input"
                type="number"
                min={1}
                value={capacityPerShelf}
                onChange={(event) => setCapacityPerShelf(Number(event.target.value))}
                required
              />
            </label>
          </div>
          <label className="modal-label">
            Notes
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="button ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" type="submit" disabled={!name.trim()}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
