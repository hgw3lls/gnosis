import type { LibraryLayout, Shelf } from '../types/library';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const arraysEqual = (first: string[], second: string[]) =>
  first.length === second.length && first.every((value, index) => value === second[index]);

type MoveBookOptions = {
  bookId: string;
  fromShelfId: string;
  toShelfId: string;
  toIndex: number;
};

export const moveBook = (layout: LibraryLayout, options: MoveBookOptions): LibraryLayout => {
  const { bookId, fromShelfId, toShelfId, toIndex } = options;
  const sourceShelf = layout.shelvesById[fromShelfId];
  const targetShelf = layout.shelvesById[toShelfId];

  if (!sourceShelf || !targetShelf) {
    return layout;
  }

  const nextShelvesById: Record<string, Shelf> = {};

  Object.entries(layout.shelvesById).forEach(([shelfId, shelf]) => {
    if (shelf.bookIds.includes(bookId)) {
      nextShelvesById[shelfId] = {
        ...shelf,
        bookIds: shelf.bookIds.filter((id) => id !== bookId),
      };
    } else {
      nextShelvesById[shelfId] = shelf;
    }
  });

  if (fromShelfId === toShelfId) {
    const currentIndex = sourceShelf.bookIds.indexOf(bookId);
    if (currentIndex === -1) {
      return layout;
    }

    const cleanedTarget = nextShelvesById[toShelfId].bookIds;
    let insertIndex = clamp(toIndex, 0, cleanedTarget.length);

    if (currentIndex < insertIndex) {
      insertIndex -= 1;
    }

    const nextBookIds = [...cleanedTarget];
    nextBookIds.splice(insertIndex, 0, bookId);

    if (arraysEqual(nextBookIds, sourceShelf.bookIds)) {
      return layout;
    }

    nextShelvesById[toShelfId] = { ...targetShelf, bookIds: nextBookIds };
  } else {
    const cleanedTarget = nextShelvesById[toShelfId].bookIds;
    const insertIndex = clamp(toIndex, 0, cleanedTarget.length);
    const nextTarget = [...cleanedTarget];
    nextTarget.splice(insertIndex, 0, bookId);

    nextShelvesById[fromShelfId] = {
      ...sourceShelf,
      bookIds: nextShelvesById[fromShelfId].bookIds,
    };
    nextShelvesById[toShelfId] = { ...targetShelf, bookIds: nextTarget };
  }

  return {
    ...layout,
    shelvesById: nextShelvesById,
  };
};
