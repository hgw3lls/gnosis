import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { Book, DragPayload, Shelf } from '../../types/library';
import { useLibrary } from '../../state/libraryStore';
import Spine, { spineGapForDensity, spineWidthForDensity } from './Spine';
import { useVirtualSpines } from './useVirtualSpines';

const DENSITY_KEY = 'gnosis-shelf-density';

type DropIndicator = { shelfId: string; index: number } | null;

type ShelfViewProps = {
  onSelectBook: (bookId: string, bookcaseId: string) => void;
};

const cn = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ');

const getBookIdFromPlacement = (placementId: string) => placementId.split('::')[0];

const ShelfView = ({ onSelectBook }: ShelfViewProps) => {
  const { appState, activeLayout, isFilterActive, filteredBookIds, moveBook } = useLibrary();
  const [dropIndicator, setDropIndicator] = useState<DropIndicator>(null);
  const [draggingPlacementId, setDraggingPlacementId] = useState<string | null>(null);
  const [density, setDensity] = useState<'compact' | 'comfy'>(() => {
    const stored = localStorage.getItem(DENSITY_KEY);
    return stored === 'compact' ? 'compact' : 'comfy';
  });

  const shelfRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  if (!appState || !activeLayout) {
    return null;
  }

  const highlightedBookIds = isFilterActive ? filteredBookIds : null;
  const shelves = activeLayout.bookcases.flatMap((bookcase) =>
    bookcase.shelfIds.map((shelfId, shelfIndex) => ({
      shelfId,
      shelfIndex,
      bookcaseId: bookcase.id,
      bookcaseName: bookcase.name,
    })),
  );

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

  const handleDragLeaveShelf = (shelfId: string) => {
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
    <section className="mt-8" id="mode-panel-shelf">
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-black px-4 py-3 text-xs uppercase tracking-[0.3em]">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span>Density</span>
            <select
              value={density}
              onChange={(event) => setDensity(event.target.value as 'compact' | 'comfy')}
              className="border-2 border-black bg-white px-2 py-1 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            >
              <option value="compact">Compact</option>
              <option value="comfy">Comfy</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span>Jump to shelf</span>
            <select
              onChange={(event) => {
                const targetId = event.target.value;
                if (targetId && shelfRefs.current[targetId]) {
                  shelfRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="border-2 border-black bg-white px-2 py-1 text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            >
              <option value="">Select shelf</option>
              {shelves.map((shelf) => (
                <option key={shelf.shelfId} value={shelf.shelfId}>
                  {shelf.bookcaseName} · Shelf {shelf.shelfIndex + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em]">
          Drag & drop spines to reorder or move shelves
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-8">
        {activeLayout.bookcases.map((bookcase) => (
          <div key={bookcase.id} className="border-2 border-black p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em]">Bookcase</p>
                <h2 className="mt-2 text-2xl uppercase tracking-[0.2em]">{bookcase.name}</h2>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              {bookcase.shelfIds.map((shelfId, shelfIndex) => {
                const shelf = activeLayout.shelvesById[shelfId];
                if (!shelf) {
                  return null;
                }
                const shelfBookIds = shelf.bookIds;
                const shelfCount = shelfBookIds.length;
                return (
                  <ShelfRail
                    key={shelfId}
                    shelf={shelf}
                    shelfIndex={shelfIndex}
                    shelfLabel={`${bookcase.name} ${shelfIndex + 1}`}
                    shelfCount={shelfCount}
                    booksById={appState.booksById}
                    highlightedBookIds={highlightedBookIds}
                    density={density}
                    bookcaseId={bookcase.id}
                    bookcaseName={bookcase.name}
                    dropIndicator={dropIndicator}
                    draggingPlacementId={draggingPlacementId}
                    onSelectBook={(bookId) => onSelectBook(bookId, bookcase.id)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOverShelf={handleDragOverShelf}
                    onDragLeaveShelf={handleDragLeaveShelf}
                    onDrop={handleDrop}
                    setShelfRef={(node) => {
                      shelfRefs.current[shelfId] = node;
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

type ShelfRailProps = {
  shelf: Shelf;
  shelfIndex: number;
  shelfLabel: string;
  shelfCount: number;
  booksById: Record<string, Book>;
  highlightedBookIds: Set<string> | null;
  density: 'compact' | 'comfy';
  bookcaseId: string;
  bookcaseName: string;
  dropIndicator: DropIndicator;
  draggingPlacementId: string | null;
  onSelectBook: (bookId: string) => void;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
  onDragOverShelf: (shelfId: string, index: number) => void;
  onDragLeaveShelf: (shelfId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, shelfId: string) => void;
  setShelfRef: (node: HTMLDivElement | null) => void;
};

const ShelfRail = ({
  shelf,
  shelfIndex,
  shelfLabel,
  shelfCount,
  booksById,
  highlightedBookIds,
  density,
  bookcaseName,
  dropIndicator,
  draggingPlacementId,
  onSelectBook,
  onDragStart,
  onDragEnd,
  onDragOverShelf,
  onDragLeaveShelf,
  onDrop,
  setShelfRef,
}: ShelfRailProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }
    const handleScroll = () => {
      setScrollLeft(node.scrollLeft);
    };
    const resizeObserver = new ResizeObserver(() => {
      setContainerWidth(node.clientWidth);
    });
    resizeObserver.observe(node);
    node.addEventListener('scroll', handleScroll, { passive: true });
    setContainerWidth(node.clientWidth);
    return () => {
      resizeObserver.disconnect();
      node.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const itemWidth = spineWidthForDensity(density);
  const gap = spineGapForDensity(density);
  const virtualRange = useVirtualSpines({
    itemCount: shelf.bookIds.length,
    itemWidth,
    gap,
    scrollLeft,
    containerWidth,
  });

  const visibleIds = useMemo(
    () => shelf.bookIds.slice(virtualRange.startIndex, virtualRange.endIndex + 1),
    [shelf.bookIds, virtualRange.startIndex, virtualRange.endIndex],
  );

  const indicatorIndex =
    dropIndicator?.shelfId === shelf.id ? dropIndicator.index : null;

  return (
    <div
      ref={setShelfRef}
      className="flex flex-col gap-2 border-b-2 border-black pb-4"
      onDragOver={(event) => {
        event.preventDefault();
        const container = containerRef.current;
        if (!container) {
          onDragOverShelf(shelf.id, shelf.bookIds.length);
          return;
        }
        const rect = container.getBoundingClientRect();
        const offset = event.clientX - rect.left + container.scrollLeft;
        const totalItemWidth = spineWidthForDensity(density) + spineGapForDensity(density);
        const nextIndex = Math.max(
          0,
          Math.min(Math.floor(offset / totalItemWidth), shelf.bookIds.length),
        );
        onDragOverShelf(shelf.id, nextIndex);
      }}
      onDragLeave={() => onDragLeaveShelf(shelf.id)}
      onDrop={(event) => onDrop(event, shelf.id)}
    >
      <div className="flex items-center gap-4 text-xs uppercase tracking-[0.3em]">
        <div className="flex w-28 flex-col border-2 border-black px-2 py-2 text-left">
          <span>Shelf {shelfIndex + 1}</span>
          <span className="text-[10px]">{shelfCount} books</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-black/60">{shelfLabel}</div>
      </div>
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          data-shelf-spines
          className={cn(
            'relative flex items-end pb-2',
            density === 'compact' ? 'gap-2' : 'gap-3',
          )}
          style={{
            minHeight: density === 'compact' ? 200 : 220,
          }}
        >
          {virtualRange.spacerLeft > 0 ? (
            <div style={{ width: virtualRange.spacerLeft }} aria-hidden="true" />
          ) : null}
          {visibleIds.map((placementId, index) => {
            const bookId = getBookIdFromPlacement(placementId);
            const book = booksById[bookId];
            if (!book) {
              return null;
            }
            const isDimmed = highlightedBookIds ? !highlightedBookIds.has(bookId) : false;
            const actualIndex = virtualRange.startIndex + index;
            const showIndicator = indicatorIndex === actualIndex;
            return (
              <div key={placementId} className="flex items-end gap-2">
                {showIndicator ? (
                  <div
                    className="h-44 w-[4px] bg-black"
                    aria-hidden="true"
                  />
                ) : null}
                <Spine
                  book={book}
                  shelfName={bookcaseName}
                  placementId={placementId}
                  shelfId={shelf.id}
                  index={actualIndex}
                  isDragging={draggingPlacementId === placementId}
                  isDimmed={isDimmed}
                  density={density}
                  onSelect={() => onSelectBook(bookId)}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              </div>
            );
          })}
          {indicatorIndex === shelf.bookIds.length ? (
            <div className="h-44 w-[4px] bg-black" aria-hidden="true" />
          ) : null}
          {virtualRange.spacerRight > 0 ? (
            <div style={{ width: virtualRange.spacerRight }} aria-hidden="true" />
          ) : null}
        </div>
      </div>
      <div className="h-[6px] w-full bg-black" aria-hidden="true" />
    </div>
  );
};

export default ShelfView;
