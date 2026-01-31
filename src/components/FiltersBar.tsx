import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Book } from '../types/library';

export type FilterState = {
  query: string;
  tags: string[];
  yearMin: string;
  yearMax: string;
  statuses: string[];
  sort: string;
};

const parseList = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const toListParam = (values: string[]) => values.join(',');

const normalizeYear = (value: string) => (value ? Number.parseInt(value, 10) : NaN);

const pickEditedTimestamp = (book: Book) => {
  const candidates = [
    book.raw?.Updated_At,
    book.raw?.UpdatedAt,
    book.raw?.Modified,
    book.raw?.Last_Modified,
    book.raw?.LastEdited,
    book.raw?.Edited,
    book.raw?.Edit_Date,
  ];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const buildLocationLabel = (book: Book) => {
  if (!book.locationBookcase && !book.locationShelf) {
    return '';
  }
  const shelf = book.locationShelf ? `S${book.locationShelf}` : '';
  const position = book.locationPosition ? `P${book.locationPosition}` : '';
  return [book.locationBookcase, shelf, position].filter(Boolean).join(' · ');
};

export const applyGridFilters = (books: Book[], filterState: FilterState) => {
  const query = filterState.query.toLowerCase();
  const tagsSet = new Set(filterState.tags);
  const statusSet = new Set(filterState.statuses);
  const yearMin = normalizeYear(filterState.yearMin);
  const yearMax = normalizeYear(filterState.yearMax);

  const filtered = books.filter((book) => {
    if (query) {
      const haystack = [
        book.title,
        book.author,
        book.publisher,
        book.publishYear,
        book.primaryShelf,
        ...(book.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (tagsSet.size > 0) {
      const bookTags = new Set([book.primaryShelf, ...(book.tags ?? [])].filter(Boolean));
      const hasMatch = Array.from(tagsSet).some((tag) => bookTags.has(tag));
      if (!hasMatch) {
        return false;
      }
    }

    if (statusSet.size > 0) {
      if (!book.useStatus || !statusSet.has(book.useStatus)) {
        return false;
      }
    }

    const yearValue = normalizeYear(book.publishYear ?? '');
    if (!Number.isNaN(yearMin) && (Number.isNaN(yearValue) || yearValue < yearMin)) {
      return false;
    }
    if (!Number.isNaN(yearMax) && (Number.isNaN(yearValue) || yearValue > yearMax)) {
      return false;
    }

    return true;
  });

  const sortKey = filterState.sort || 'title';
  return [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'author':
        return (a.author ?? '').localeCompare(b.author ?? '');
      case 'year':
        return (a.publishYear ?? '').localeCompare(b.publishYear ?? '');
      case 'edited':
        return pickEditedTimestamp(b) - pickEditedTimestamp(a);
      case 'shelf': {
        const keyA = `${a.locationBookcase ?? ''}-${a.locationShelf ?? 0}-${a.locationPosition ?? 0}`;
        const keyB = `${b.locationBookcase ?? ''}-${b.locationShelf ?? 0}-${b.locationPosition ?? 0}`;
        return keyA.localeCompare(keyB);
      }
      default:
        return a.title.localeCompare(b.title);
    }
  });
};

export const getFilterStateFromParams = (params: URLSearchParams): FilterState => ({
  query: params.get('q') ?? '',
  tags: parseList(params.get('tags')),
  yearMin: params.get('ymin') ?? '',
  yearMax: params.get('ymax') ?? '',
  statuses: parseList(params.get('status')),
  sort: params.get('sort') ?? 'title',
});

export const FiltersBar = ({
  tagOptions,
  statusOptions,
}: {
  tagOptions: string[];
  statusOptions: string[];
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => getFilterStateFromParams(searchParams), [searchParams]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const updateListParam = (key: string, value: string) => {
    updateParam(key, value ? toListParam(value.split(',').filter(Boolean)) : '');
  };

  const toggleValue = (key: string, value: string) => {
    const current = new Set(parseList(searchParams.get(key)));
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    updateParam(key, toListParam(Array.from(current)));
  };

  const clearAll = () => {
    const next = new URLSearchParams(searchParams);
    ['q', 'tags', 'ymin', 'ymax', 'status', 'sort'].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col gap-4 border-2 border-black px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4 text-xs uppercase tracking-[0.3em]">
        <label className="flex flex-col gap-2">
          <span>Search</span>
          <input
            value={filters.query}
            onChange={(event) => updateParam('q', event.target.value)}
            className="min-w-[200px] border-2 border-black px-3 py-2 text-xs uppercase tracking-[0.2em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>Tags</span>
          <select
            multiple
            value={filters.tags}
            onChange={(event) =>
              updateListParam(
                'tags',
                Array.from(event.target.selectedOptions)
                  .map((option) => option.value)
                  .join(','),
              )
            }
            className="min-w-[200px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
          >
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-2">
            <span>Year min</span>
            <input
              value={filters.yearMin}
              onChange={(event) => updateParam('ymin', event.target.value)}
              className="w-24 border-2 border-black px-2 py-2 text-xs uppercase tracking-[0.2em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span>Year max</span>
            <input
              value={filters.yearMax}
              onChange={(event) => updateParam('ymax', event.target.value)}
              className="w-24 border-2 border-black px-2 py-2 text-xs uppercase tracking-[0.2em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span>Sort</span>
          <select
            value={filters.sort}
            onChange={(event) => updateParam('sort', event.target.value)}
            className="min-w-[160px] border-2 border-black bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
          >
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="year">Year</option>
            <option value="edited">Recently edited</option>
            <option value="shelf">Shelf position</option>
          </select>
        </label>
        <button
          type="button"
          onClick={clearAll}
          className="border-2 border-black px-3 py-2 hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
        >
          Clear
        </button>
      </div>

      {statusOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-4 border-t-2 border-black pt-4 text-xs uppercase tracking-[0.3em]">
          <span>Status</span>
          {statusOptions.map((status) => (
            <label key={status} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status)}
                onChange={() => toggleValue('status', status)}
                className="h-4 w-4 border-2 border-black"
              />
              <span>{status}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const useFiltersBarState = () => {
  const [searchParams] = useSearchParams();
  return useMemo(() => getFilterStateFromParams(searchParams), [searchParams]);
};

export const getLocationLabel = buildLocationLabel;
