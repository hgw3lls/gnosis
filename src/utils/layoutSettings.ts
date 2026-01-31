import type { Bookcase, LibraryLayout, Shelf } from '../types/library';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
};

const ensureShelf = (shelvesById: Record<string, Shelf>, shelfId: string) => {
  if (!shelvesById[shelfId]) {
    shelvesById[shelfId] = { id: shelfId, bookIds: [] };
  }
};

export const reflowBookcaseShelves = (layout: LibraryLayout, bookcaseId: string): LibraryLayout => {
  const bookcase = layout.bookcases.find((item) => item.id === bookcaseId);
  if (!bookcase) {
    return layout;
  }

  const shelfCount = clamp(bookcase.settings.shelfCount, 1, 12);
  let nextShelfIds = [...bookcase.shelfIds];
  const nextShelvesById: Record<string, Shelf> = { ...layout.shelvesById };

  if (shelfCount > nextShelfIds.length) {
    const newIds = Array.from({ length: shelfCount - nextShelfIds.length }, () => createId('shelf'));
    newIds.forEach((id) => {
      nextShelvesById[id] = { id, bookIds: [] };
    });
    nextShelfIds = [...nextShelfIds, ...newIds];
  } else if (shelfCount < nextShelfIds.length) {
    const removedIds = nextShelfIds.slice(shelfCount);
    const overflow = removedIds.flatMap((id) => nextShelvesById[id]?.bookIds ?? []);
    removedIds.forEach((id) => {
      delete nextShelvesById[id];
    });
    nextShelfIds = nextShelfIds.slice(0, shelfCount);
    const lastShelfId = nextShelfIds[nextShelfIds.length - 1];
    if (lastShelfId) {
      ensureShelf(nextShelvesById, lastShelfId);
      nextShelvesById[lastShelfId] = {
        ...nextShelvesById[lastShelfId],
        bookIds: [...nextShelvesById[lastShelfId].bookIds, ...overflow],
      };
    }
  }

  nextShelfIds.forEach((id) => ensureShelf(nextShelvesById, id));

  const nextBookcase: Bookcase = {
    ...bookcase,
    shelfIds: nextShelfIds,
    settings: { ...bookcase.settings, shelfCount },
  };

  return {
    ...layout,
    bookcases: layout.bookcases.map((item) => (item.id === bookcaseId ? nextBookcase : item)),
    shelvesById: nextShelvesById,
  };
};

export const setBookcaseShelfCount = (
  layout: LibraryLayout,
  bookcaseId: string,
  shelfCount: number,
): LibraryLayout => {
  const bookcase = layout.bookcases.find((item) => item.id === bookcaseId);
  if (!bookcase) {
    return layout;
  }

  const nextLayout: LibraryLayout = {
    ...layout,
    bookcases: layout.bookcases.map((item) =>
      item.id === bookcaseId
        ? { ...item, settings: { ...item.settings, shelfCount: clamp(shelfCount, 1, 12) } }
        : item,
    ),
  };

  return reflowBookcaseShelves(nextLayout, bookcaseId);
};
