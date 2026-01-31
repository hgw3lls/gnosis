import { useMemo, useState } from 'react';
import type { Book } from '../types/library';

interface TableViewProps {
  books: Book[];
  onRowClick: (bookId: string) => void;
}

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'primaryShelf', label: 'Shelf' },
  { key: 'useStatus', label: 'Status' },
  { key: 'year', label: 'Year' },
];

const TableView = ({ books, onRowClick }: TableViewProps) => {
  const [sortKey, setSortKey] = useState('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    return [...books].sort((a, b) => {
      const aValue = (a as Record<string, string>)[sortKey] ?? '';
      const bValue = (b as Record<string, string>)[sortKey] ?? '';
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [books, sortDirection, sortKey]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  return (
    <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-900/40">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-900">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                onClick={() => handleSort(column.key)}
              >
                {column.label}
                {sortKey === column.key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((book) => (
            <tr
              key={book.id}
              onClick={() => onRowClick(book.id)}
              className="cursor-pointer border-t border-slate-800 hover:bg-slate-800/40"
            >
              <td className="px-4 py-3 font-semibold text-slate-100">{book.title}</td>
              <td className="px-4 py-3 text-slate-300">{book.author}</td>
              <td className="px-4 py-3 text-slate-300">{book.primaryShelf}</td>
              <td className="px-4 py-3 text-slate-300">{book.useStatus}</td>
              <td className="px-4 py-3 text-slate-300">{book.year}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;
