import type { LibraryDefinition } from '../types/library';

type LibrarySwitcherProps = {
  libraries: LibraryDefinition[];
  activeLibraryId: string;
  onChange: (libraryId: string) => void;
};

const LibrarySwitcher = ({ libraries, activeLibraryId, onChange }: LibrarySwitcherProps) => (
  <div className="flex flex-wrap items-center gap-3">
    <label htmlFor="library-select" className="text-xs uppercase tracking-[0.3em]">
      Library
    </label>
    <select
      id="library-select"
      value={activeLibraryId}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-[220px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
    >
      {libraries.map((library) => (
        <option key={library.id} value={library.id}>
          {library.name}
        </option>
      ))}
    </select>
  </div>
);

export default LibrarySwitcher;
