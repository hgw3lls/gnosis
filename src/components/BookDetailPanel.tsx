import type { Book } from '../types/library';
import { cn } from '../utils/cn';
import { focusRing, inputBase } from '../styles/ui';
import InkButton from './ui/InkButton';
import InkPanel from './ui/InkPanel';
import InkChip from './ui/InkChip';
import Type from './ui/Type';
import { getPlateColor } from '../styles/palette';

type BookDetailPanelProps = {
  book: Book;
  onClose: () => void;
  onUpdate: (updates: Partial<Book>) => void;
};

const renderField = (label: string, value?: string | string[]) => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  const display = Array.isArray(value) ? value.join(', ') : value;
  return (
    <div className="space-y-1 border-b-rule border-ink pb-3 text-sm">
      <Type as="p" variant="label">
        {label}
      </Type>
      <p>{display}</p>
    </div>
  );
};

const BookDetailPanel = ({ book, onClose, onUpdate }: BookDetailPanelProps) => {
  const cover = book.coverL || book.coverM || book.coverS;
  const tags = [book.primaryShelf, ...(book.tags ?? [])].filter(
    (tag): tag is string => Boolean(tag),
  );

  return (
    <InkPanel padding="lg" className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Type as="p" variant="label">
            Selected
          </Type>
          <Type as="h3" variant="h2">
            {book.title}
          </Type>
          <Type as="p" variant="meta">
            {book.author || 'Unknown author'}
          </Type>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <InkChip key={tag} plate={getPlateColor(tag)}>
                  {tag}
                </InkChip>
              ))}
            </div>
          ) : null}
        </div>
        <InkButton onClick={onClose}>Close</InkButton>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <div className="space-y-4">
          {renderField('Publisher', book.publisher)}
          {renderField('Year', book.publishYear)}
          {renderField('ISBN', book.isbn13)}
          {renderField('Primary Shelf', book.primaryShelf)}
          <div className="space-y-3 border-b-rule border-ink pb-3 text-sm">
            <Type as="p" variant="label">
              Location
            </Type>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <Type as="span" variant="meta">
                  Bookcase
                </Type>
                <input
                  value={book.locationBookcase}
                  onChange={(event) => onUpdate({ locationBookcase: event.target.value })}
                  className={cn(inputBase, focusRing, 'px-2 py-1 text-[11px]')}
                />
              </label>
              <label className="flex flex-col gap-1">
                <Type as="span" variant="meta">
                  Shelf (1-12)
                </Type>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={book.locationShelf}
                  onChange={(event) =>
                    onUpdate({
                      locationShelf: Math.min(12, Math.max(1, Number(event.target.value) || 1)),
                    })
                  }
                  className={cn(inputBase, focusRing, 'px-2 py-1 text-[11px]')}
                />
              </label>
              <label className="flex flex-col gap-1">
                <Type as="span" variant="meta">
                  Position
                </Type>
                <input
                  type="number"
                  min={1}
                  value={book.locationPosition}
                  onChange={(event) =>
                    onUpdate({ locationPosition: Math.max(1, Number(event.target.value) || 1) })
                  }
                  className={cn(inputBase, focusRing, 'px-2 py-1 text-[11px]')}
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <Type as="span" variant="meta">
                  Note
                </Type>
                <input
                  value={book.locationNote ?? ''}
                  onChange={(event) => onUpdate({ locationNote: event.target.value })}
                  className={cn(inputBase, focusRing, 'px-2 py-1 text-[11px]')}
                />
              </label>
            </div>
          </div>
          {renderField('Tags', book.tags)}
          {renderField('Subjects', book.subjects)}
          {renderField('Format', book.format)}
          {renderField('Language', book.language)}
          {renderField('Status', book.useStatus)}
          {renderField('Source', book.source)}
          {renderField('Notes', book.notes)}
        </div>
        {cover ? (
          <div className="flex items-start justify-start">
            <img
              src={cover}
              alt={`Cover for ${book.title}`}
              className="w-full border-rule border-ink"
            />
          </div>
        ) : null}
      </div>
    </InkPanel>
  );
};

export default BookDetailPanel;
