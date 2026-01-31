import type { LibraryDefinition } from '../types/library';
import { cn } from '../utils/cn';
import { focusRing, selectBase } from '../styles/ui';
import Type from './ui/Type';

type LibrarySwitcherProps = {
  libraries: LibraryDefinition[];
  activeLibraryId: string;
  onChange: (libraryId: string) => void;
};

const LibrarySwitcher = ({ libraries, activeLibraryId, onChange }: LibrarySwitcherProps) => (
  <div className="flex flex-wrap items-center gap-3">
    <Type as="label" htmlFor="library-select" variant="label">
      Library
    </Type>
    <select
      id="library-select"
      value={activeLibraryId}
      onChange={(event) => onChange(event.target.value)}
      className={cn(selectBase, focusRing, 'min-w-[220px]')}
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
