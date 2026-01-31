import { Navigate, Route, Routes } from 'react-router-dom';
import GridMode from './modes/GridMode';
import IndexMode from './modes/IndexMode';
import ShelfMode from './modes/ShelfMode';
import type { Book } from './types/library';

export const MODE_STORAGE_KEY = 'gnosis-browse-mode';

export const MODE_PATHS = {
  shelf: '/shelf',
  grid: '/grid',
  index: '/index',
} as const;

export type BrowseMode = keyof typeof MODE_PATHS;

const resolveMode = (value: string | null): BrowseMode => {
  if (value === 'grid' || value === 'index' || value === 'shelf') {
    return value;
  }
  return 'shelf';
};

export const getModeFromPath = (pathname: string): BrowseMode | null => {
  if (pathname.startsWith('/grid')) {
    return 'grid';
  }
  if (pathname.startsWith('/index')) {
    return 'index';
  }
  if (pathname.startsWith('/shelf')) {
    return 'shelf';
  }
  return null;
};

const RootRedirect = () => {
  const stored = resolveMode(localStorage.getItem(MODE_STORAGE_KEY));
  return <Navigate to={MODE_PATHS[stored]} replace />;
};

type AppRoutesProps = {
  selectedBookId: string | null;
  selectedBookcaseId: string | null;
  onSelectBook: (bookId: string) => void;
  onSelectBookInBookcase: (bookId: string, bookcaseId: string) => void;
  onCloseDetail: () => void;
  onUpdateBook: (bookId: string, updates: Partial<Book>) => void;
};

export const AppRoutes = ({
  selectedBookId,
  selectedBookcaseId,
  onSelectBook,
  onSelectBookInBookcase,
  onCloseDetail,
  onUpdateBook,
}: AppRoutesProps) => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route
      path="/shelf"
      element={
        <ShelfMode
          selectedBookId={selectedBookId}
          selectedBookcaseId={selectedBookcaseId}
          onSelectBook={onSelectBookInBookcase}
          onCloseDetail={onCloseDetail}
          onUpdateBook={onUpdateBook}
        />
      }
    />
    <Route
      path="/grid"
      element={
        <GridMode
          selectedBookId={selectedBookId}
          onSelectBook={onSelectBook}
          onCloseDetail={onCloseDetail}
          onUpdateBook={onUpdateBook}
        />
      }
    />
    <Route
      path="/index"
      element={
        <IndexMode
          selectedBookId={selectedBookId}
          onSelectBook={onSelectBook}
          onCloseDetail={onCloseDetail}
          onUpdateBook={onUpdateBook}
        />
      }
    />
    <Route path="*" element={<Navigate to={MODE_PATHS.shelf} replace />} />
  </Routes>
);
