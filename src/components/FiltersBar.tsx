import { useLibrary } from '../state/libraryStore';
import { cn } from '../utils/cn';
import InkButton from './ui/InkButton';
import InkPanel from './ui/InkPanel';
import Type from './ui/Type';
import { focusRing, inputBase, selectBase } from '../styles/ui';

const FiltersBar = () => {
  const {
    filters,
    setFilters,
    availableFormats,
    availableStatuses,
    filteredBooks,
    appState,
    isFilterActive,
  } = useLibrary();

  if (!appState) {
    return null;
  }

  return (
    <InkPanel padding="md" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2">
            <Type as="span" variant="label">
              Search
            </Type>
            <input
              value={filters.search}
              onChange={(event) => setFilters({ search: event.target.value })}
              className={cn(inputBase, focusRing, 'min-w-[220px]')}
              placeholder="Title, author, shelf"
            />
          </label>
          <label className="flex flex-col gap-2">
            <Type as="span" variant="label">
              Format
            </Type>
            <select
              value={filters.format}
              onChange={(event) => setFilters({ format: event.target.value })}
              className={cn(selectBase, focusRing, 'min-w-[160px]')}
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
            <Type as="span" variant="label">
              Status
            </Type>
            <select
              value={filters.status}
              onChange={(event) => setFilters({ status: event.target.value })}
              className={cn(selectBase, focusRing, 'min-w-[160px]')}
            >
              <option value="all">All Status</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <Type as="span" variant="label">
              Showing
            </Type>
            <Type as="span" variant="meta">
              {filteredBooks.length} of {appState.rowOrder.length}
            </Type>
          </div>
          {isFilterActive ? (
            <InkButton onClick={() => setFilters({ search: '', status: 'all', format: 'all' })}>
              Clear
            </InkButton>
          ) : null}
        </div>
      </div>
    </InkPanel>
  );
};

export default FiltersBar;
