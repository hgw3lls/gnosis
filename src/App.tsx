import { useRef, useState } from 'react';
import LibrarySwitcher from './components/LibrarySwitcher';
import ModeSwitch from './components/ModeSwitch';
import { AppRoutes } from './routes';
import type { LibraryDefinition, MultiCategoryMode } from './types/library';
import { useLibrary } from './state/libraryStore';

const App = () => {
  const {
    appState,
    activeLayout,
    filters,
    isFilterActive,
    filteredBooks,
    availableFormats,
    availableStatuses,
    setFilters,
    setActiveLibraryId,
    resetFromCsv,
    exportCsv,
    exportJson,
    importCsv,
    importJson,
    createLibrary,
    updateBook,
  } = useLibrary();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBookcaseId, setSelectedBookcaseId] = useState<string | null>(null);
  const [showCreateLibrary, setShowCreateLibrary] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [newLibraryField, setNewLibraryField] = useState<LibraryDefinition['categorize']>(
    'Primary_Shelf',
  );
  const [newLibraryMode, setNewLibraryMode] = useState<MultiCategoryMode>('duplicate');
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  if (!appState || !activeLayout) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-black">
        <p className="text-xs uppercase tracking-[0.3em]">Loading library...</p>
      </main>
    );
  }

  const handleCloseDetail = () => {
    setSelectedBookId(null);
    setSelectedBookcaseId(null);
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setSelectedBookcaseId(null);
  };

  const handleSelectBookInBookcase = (bookId: string, bookcaseId: string) => {
    setSelectedBookId(bookId);
    setSelectedBookcaseId(bookcaseId);
  };

  const handleCreateLibrary = () => {
    const didCreate = createLibrary({
      name: newLibraryName,
      categorize: newLibraryField,
      mode: newLibraryMode,
    });
    if (!didCreate) {
      return;
    }
    setNewLibraryName('');
    setNewLibraryField('Primary_Shelf');
    setNewLibraryMode('duplicate');
    setShowCreateLibrary(false);
  };

  return (
    <main className="min-h-screen bg-white px-6 pb-16 pt-12 text-black">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-2">
        <h1 className="text-5xl uppercase tracking-[0.4em]">GNOSIS</h1>
        <p className="text-xs uppercase tracking-[0.4em]">Library</p>
      </header>

      <section className="mx-auto mt-10 w-full max-w-6xl">
        <div className="flex flex-col gap-4 border-2 border-black px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <ModeSwitch />
            <LibrarySwitcher
              libraries={appState.libraries}
              activeLibraryId={appState.activeLibraryId}
              onChange={(libraryId) => {
                setActiveLibraryId(libraryId);
                handleCloseDetail();
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-black pt-4">
            <div className="flex flex-wrap items-end gap-4 text-xs uppercase tracking-[0.3em]">
              <label className="flex flex-col gap-2">
                <span>Search</span>
                <input
                  value={filters.search}
                  onChange={(event) => setFilters({ search: event.target.value })}
                  className="min-w-[220px] border-2 border-black px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span>Format</span>
                <select
                  value={filters.format}
                  onChange={(event) => setFilters({ format: event.target.value })}
                  className="min-w-[160px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                >
                  <option value="all">All Formats</option>
                  {availableFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span>Status</span>
                <select
                  value={filters.status}
                  onChange={(event) => setFilters({ status: event.target.value })}
                  className="min-w-[160px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                >
                  <option value="all">All Status</option>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-2">
                <span>Showing</span>
                <p className="text-[10px] uppercase tracking-[0.3em]">
                  {filteredBooks.length} of {appState.rowOrder.length}
                </p>
              </div>
              {isFilterActive ? (
                <button
                  type="button"
                  onClick={() => setFilters({ search: '', status: 'all', format: 'all' })}
                  className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em]">
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Import CSV
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Import JSON
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={resetFromCsv}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Reset to CSV
              </button>
              <button
                type="button"
                onClick={() => setShowCreateLibrary((prev) => !prev)}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Create Library
              </button>
            </div>
          </div>

          {showCreateLibrary ? (
            <div className="flex flex-wrap items-end gap-4 border-t-2 border-black pt-4 text-xs uppercase tracking-[0.3em]">
              <div className="flex flex-col gap-2">
                <label htmlFor="new-library-name">Name</label>
                <input
                  id="new-library-name"
                  value={newLibraryName}
                  onChange={(event) => setNewLibraryName(event.target.value)}
                  className="min-w-[220px] border-2 border-black px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="new-library-field">Categorize</label>
                <select
                  id="new-library-field"
                  value={newLibraryField}
                  onChange={(event) =>
                    setNewLibraryField(event.target.value as LibraryDefinition['categorize'])
                  }
                  className="min-w-[200px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                >
                  <option value="Primary_Shelf">Primary Shelf</option>
                  <option value="Format">Format</option>
                  <option value="Language">Language</option>
                  <option value="Source">Source</option>
                  <option value="Use_Status">Status</option>
                  <option value="Tags">Tags</option>
                </select>
              </div>
              {newLibraryField === 'Tags' ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="new-library-mode">Tag Mode</label>
                  <select
                    id="new-library-mode"
                    value={newLibraryMode}
                    onChange={(event) => setNewLibraryMode(event.target.value as MultiCategoryMode)}
                    className="min-w-[160px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                  >
                    <option value="duplicate">Duplicate</option>
                    <option value="first">First</option>
                    <option value="split">Split</option>
                  </select>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleCreateLibrary}
                className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Add Library
              </button>
            </div>
          ) : null}
        </div>

        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              importCsv(file);
            }
            event.target.value = '';
          }}
        />
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              importJson(file);
            }
            event.target.value = '';
          }}
        />

        <AppRoutes
          selectedBookId={selectedBookId}
          selectedBookcaseId={selectedBookcaseId}
          onSelectBook={handleSelectBook}
          onSelectBookInBookcase={handleSelectBookInBookcase}
          onCloseDetail={handleCloseDetail}
          onUpdateBook={updateBook}
        />
      </section>
    </main>
  );
};

export default App;
