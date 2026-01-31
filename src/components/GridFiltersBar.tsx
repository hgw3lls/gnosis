import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Book } from '../types/library';
import { cn } from '../utils/cn';
import InkButton from './ui/InkButton';
import InkPanel from './ui/InkPanel';
import Type from './ui/Type';
import { focusRing, inputBase, selectBase } from '../styles/ui';

export type GridFilterState = {
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

export const applyGridFilters = (books: Book[], filterState: GridFilterState) => {
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

export const getGridFilterStateFromParams = (params: URLSearchParams): GridFilterState => ({
  query: params.get('q') ?? '',
  tags: parseList(params.get('tags')),
  yearMin: params.get('ymin') ?? '',
  yearMax: params.get('ymax') ?? '',
  statuses: parseList(params.get('status')),
  sort: params.get('sort') ?? 'title',
});

export const GridFiltersBar = ({
  tagOptions,
  statusOptions,
}: {
  tagOptions: string[];
  statusOptions: string[];
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => getGridFilterStateFromParams(searchParams), [searchParams]);

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
    <InkPanel padding="md" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2">
            <Type as="span" variant="label">
              Search
            </Type>
            <input
              value={filters.query}
              onChange={(event) => updateParam('q', event.target.value)}
              className={cn(inputBase, focusRing, 'min-w-[200px]')}
              placeholder="Title, author, shelf"
            />
          </label>
          <label className="flex flex-col gap-2">
            <Type as="span" variant="label">
              Tags
            </Type>
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
              className={cn(selectBase, focusRing, 'min-w-[200px]')}
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
              <Type as="span" variant="label">
                Year min
              </Type>
              <input
                value={filters.yearMin}
                onChange={(event) => updateParam('ymin', event.target.value)}
                className={cn(inputBase, focusRing, 'w-24 px-2')}
              />
            </label>
            <label className="flex flex-col gap-2">
              <Type as="span" variant="label">
                Year max
              </Type>
              <input
                value={filters.yearMax}
                onChange={(event) => updateParam('ymax', event.target.value)}
                className={cn(inputBase, focusRing, 'w-24 px-2')}
              />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <Type as="span" variant="label">
              Sort
            </Type>
            <select
              value={filters.sort}
              onChange={(event) => updateParam('sort', event.target.value)}
              className={cn(selectBase, focusRing, 'min-w-[160px]')}
            >
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="year">Year</option>
              <option value="edited">Recently edited</option>
              <option value="shelf">Shelf position</option>
            </select>
          </label>
        </div>
        <InkButton onClick={clearAll}>Clear</InkButton>
      </div>

      {statusOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-4 border-t-rule border-ink pt-4">
          <Type as="span" variant="label">
            Status
          </Type>
          {statusOptions.map((status) => (
            <label key={status} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status)}
                onChange={() => toggleValue('status', status)}
                className={cn('h-4 w-4 border-rule2 border-ink bg-paper', focusRing)}
              />
              <Type as="span" variant="meta">
                {status}
              </Type>
            </label>
          ))}
        </div>
      ) : null}
    </InkPanel>
  );
};

export const useGridFiltersState = () => {
  const [searchParams] = useSearchParams();
  return useMemo(() => getGridFilterStateFromParams(searchParams), [searchParams]);
};
