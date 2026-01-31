import type { ShelfCode } from '../types/library';
import { SHELVES } from '../types/library';

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterShelf: string;
  onFilterShelfChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  view: 'bookcase' | 'table';
  onViewChange: (value: 'bookcase' | 'table') => void;
  onAddBook: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportCsv: (file: File) => void;
  onImportJson: (file: File) => void;
  onReset: () => void;
  useStatuses: string[];
  onToggleAuthor: () => void;
  showAuthor: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar = ({
  search,
  onSearchChange,
  filterShelf,
  onFilterShelfChange,
  filterStatus,
  onFilterStatusChange,
  view,
  onViewChange,
  onAddBook,
  onExportCsv,
  onExportJson,
  onImportCsv,
  onImportJson,
  onReset,
  useStatuses,
  onToggleAuthor,
  showAuthor,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) => {
  return (
    <div className="sticky top-0 z-30 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search title, author, tags"
            className="w-full min-w-[220px] flex-1 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
          />
          <select
            value={filterShelf}
            onChange={(event) => onFilterShelfChange(event.target.value)}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">All shelves</option>
            {SHELVES.map((shelf) => (
              <option key={shelf.code} value={shelf.code}>
                {shelf.code}. {shelf.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(event) => onFilterStatusChange(event.target.value)}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {useStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onViewChange(view === 'bookcase' ? 'table' : 'bookcase')}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm"
          >
            {view === 'bookcase' ? 'Table view' : 'Bookcase view'}
          </button>
          <button
            type="button"
            onClick={onToggleAuthor}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm"
          >
            {showAuthor ? 'Hide author' : 'Show author'}
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={onAddBook}
            className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            Add book
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm"
          >
            Export JSON
          </button>
          <label className="rounded-md border border-slate-700 px-3 py-2 text-sm cursor-pointer">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onImportCsv(file);
                  event.currentTarget.value = '';
                }
              }}
            />
          </label>
          <label className="rounded-md border border-slate-700 px-3 py-2 text-sm cursor-pointer">
            Import JSON
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onImportJson(file);
                  event.currentTarget.value = '';
                }
              }}
            />
          </label>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-rose-500 px-3 py-2 text-sm text-rose-200"
          >
            Reset from CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
