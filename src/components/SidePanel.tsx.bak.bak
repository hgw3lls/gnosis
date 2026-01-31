import type { Book, ShelfCode } from '../types/library';
import { shelfOptions } from '../utils/shelves';

interface SidePanelProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookId: string, updates: Partial<Book>) => void;
  onDelete: (bookId: string) => void;
  useStatuses: string[];
}

const SidePanel = ({
  book,
  isOpen,
  onClose,
  onSave,
  onDelete,
  useStatuses,
}: SidePanelProps) => {
  if (!book) {
    return null;
  }

  const handleChange = (field: keyof Book, value: string) => {
    onSave(book.id, {
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    onSave(book.id, {
      tags,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <aside
      className={`fixed right-0 top-0 z-40 h-full w-full max-w-md transform border-l border-slate-800 bg-slate-950 p-6 shadow-2xl transition ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit book</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-slate-500"
        >
          Close
        </button>
      </div>
      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          Title
          <input
            value={book.title}
            onChange={(event) => handleChange('title', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Author
          <input
            value={book.author}
            onChange={(event) => handleChange('author', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Primary Shelf
          <select
            value={book.shelfCode}
            onChange={(event) =>
              onSave(book.id, {
                shelfCode: event.target.value as ShelfCode,
                primaryShelf: shelfOptions.find(
                  (option) => option.value === event.target.value,
                )?.label ?? book.primaryShelf,
                updatedAt: new Date().toISOString(),
              })
            }
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
          >
            {shelfOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Tags
          <input
            value={book.tags.join(', ')}
            onChange={(event) => handleTagsChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Use Status
          <select
            value={book.useStatus}
            onChange={(event) => handleChange('useStatus', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
          >
            <option value="">Select status</option>
            {useStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Notes
          <textarea
            value={book.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
            rows={4}
          />
        </label>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onDelete(book.id)}
          className="rounded-md border border-rose-500 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
        >
          Delete book
        </button>
        <span className="text-xs text-slate-500">Autosaving enabled</span>
      </div>
    </aside>
  );
};

export default SidePanel;
