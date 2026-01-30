import { useCallback, useState } from 'react';

export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useHistory = <T,>(initial: T) => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const setPresent = useCallback((value: T, pushHistory = true) => {
    setState((current) => {
      if (!pushHistory) {
        return { ...current, present: value };
      }
      return {
        past: [...current.past, current.present],
        present: value,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      if (current.past.length === 0) {
        return current;
      }
      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      if (current.future.length === 0) {
        return current;
      }
      const next = current.future[0];
      const newFuture = current.future.slice(1);
      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  return {
    state,
    setPresent,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
};
