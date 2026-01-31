import type { Book } from '../types/library';

type BookDetailPanelProps = {
  book: Book;
  onClose: () => void;
};

const renderField = (label: string, value?: string | string[]) => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  const display = Array.isArray(value) ? value.join(', ') : value;
  return (
    <div className="space-y-1 border-b-2 border-black pb-3 text-sm">
      <p className="text-xs uppercase tracking-[0.3em]">{label}</p>
      <p>{display}</p>
    </div>
  );
};

const BookDetailPanel = ({ book, onClose }: BookDetailPanelProps) => {
  const cover = book.coverL || book.coverM || book.coverS;

  return (
    <div className="mt-6 border-2 border-black p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em]">Selected</p>
          <h3 className="mt-2 text-2xl uppercase tracking-[0.2em]">{book.title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.2em]">{book.author || 'Unknown author'}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border-2 border-black px-4 py-2 text-xs uppercase tracking-[0.3em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
        >
          Close
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <div className="space-y-4">
          {renderField('Publisher', book.publisher)}
          {renderField('Year', book.publishYear)}
          {renderField('ISBN', book.isbn13)}
          {renderField('Primary Shelf', book.primaryShelf)}
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
            <img src={cover} alt={`Cover for ${book.title}`} className="w-full border-2 border-black" />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BookDetailPanel;
