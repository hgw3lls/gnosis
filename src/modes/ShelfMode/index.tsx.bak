import { useState } from 'react';
import type { DragEvent } from 'react';
import Bookcase from '../../components/Bookcase';
import type { Book, DragPayload } from '../../types/library';
import { useLibrary } from '../../state/libraryStore';

type DropIndicator = { shelfId: string; index: number } | null;

type ShelfModeProps = {
  selectedBookId: string | null;
  selectedBookcaseId: string | null;
  onSelectBook: (bookId: string, bookcaseId: string) => void;
  onCloseDetail: () => void;
  onUpdateBook: (bookId: string, updates: Partial<Book>) => void;
};

const ShelfMode = ({
  selectedBookId,
  selectedBookcaseId,
  onSelectBook,
  onCloseDetail,
  onUpdateBook,
}: ShelfModeProps) => {
  const {
    appState,
    activeLayout,
    isFilterActive,
    filteredBookIds,
    moveBook,
    setBookcaseShelfCount,
  } = useLibrary();
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [draggingPlacementId, setDraggingPlacementId] = useState<string | null>(null);

  if (!appState || !activeLayout) {
    return null;
  }

  const highlightedBookIds = isFilterActive ? filteredBookIds : null;

  const handleDragStart = (payload: DragPayload) => {
    setDraggingPlacementId(payload.bookId);
  };

  const handleDragEnd = () => {
    setDraggingPlacementId(null);
    setDropIndicator(null);
  };

  const handleDragOverShelf = (shelfId: string, index: number) => {
    setDropIndicator({ shelfId, index });
  };

  const handleDragLeaveShelf = (_event: DragEvent<HTMLDivElement>, shelfId: string) => {
    if (dropIndicator?.shelfId === shelfId) {
      setDropIndicator(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetShelfId: string) => {
    event.preventDefault();
    const payloadRaw = event.dataTransfer.getData('application/json');
    if (!payloadRaw) {
      return;
    }
    let payload: DragPayload;
    try {
      payload = JSON.parse(payloadRaw) as DragPayload;
    } catch {
      return;
    }
    const targetShelf = activeLayout.shelvesById[targetShelfId];
    const targetIndex =
      dropIndicator && dropIndicator.shelfId === targetShelfId
        ? dropIndicator.index
        : targetShelf?.bookIds.length ?? 0;
    moveBook(payload, targetShelfId, targetIndex);

    setDropIndicator(null);
    setDraggingPlacementId(null);
  };

  return (
    <div className="mt-8 flex flex-col gap-10" id="mode-panel-shelf">
      {activeLayout.bookcases.map((bookcase) => (
        <Bookcase
          key={bookcase.id}
          bookcase={bookcase}
          shelvesById={activeLayout.shelvesById}
          booksById={appState.booksById}
          draggingPlacementId={draggingPlacementId}
          dropIndicator={dropIndicator}
          highlightedBookIds={highlightedBookIds}
          selectedBookId={selectedBookcaseId === bookcase.id ? selectedBookId : null}
          onSelectBook={onSelectBook}
          onCloseDetail={onCloseDetail}
          onUpdateBook={onUpdateBook}
          onShelfCountChange={setBookcaseShelfCount}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOverShelf={handleDragOverShelf}
          onDragLeaveShelf={handleDragLeaveShelf}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
};

export default ShelfMode;
