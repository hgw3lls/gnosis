import clsx from "clsx";
import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

export type ViewMode = "grid" | "list" | "case-spines";

type AppLayoutProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onAddBook: () => void;
  onAddBookcase: () => void;
  onScanBarcode: () => void;
  isUnlocked: boolean;
  onRequestUnlock: () => void;
  onLock: () => void;
  reviewCount?: number;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
  children: ReactNode;
};

export const AppLayout = ({
  query,
  onQueryChange,
  onAddBook,
  onAddBookcase,
  onScanBarcode,
  isUnlocked,
  onRequestUnlock,
  onLock,
  reviewCount = 0,
  view,
  onViewChange,
  children,
}: AppLayoutProps) => {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!addMenuRef.current) {
        return;
      }
      if (event.target instanceof Node && !addMenuRef.current.contains(event.target)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="app">
      <header className="topbar brutal-surface">
        <div className="topbar-brand">
          <p className="topbar-kicker">Private archive system</p>
          <div className="topbar-brand-row">
            <NavLink to="/" className="topbar-logo-link" aria-label="Open library home">
              <img src="exlibris.png" alt="Ex Libris" className="topbar-logo" />
            </NavLink>
            <div className="topbar-status-pill" aria-live="polite">
              {isUnlocked ? "Editable" : "Read only"}
            </div>
          </div>
        </div>

        <div className="topbar-search-block">
          <label htmlFor="global-library-search" className="topbar-label">
            Search catalogue
          </label>
          <div className="topbar-search-row">
            <input
              id="global-library-search"
              className="input input-dominant"
              type="search"
              placeholder="Title, author, tags, location"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
            <button className="button ghost hotkey-badge" type="button" onClick={() => onQueryChange("")}>
              Clear
            </button>
          </div>
          <p className="topbar-hint">Shortcuts: / focus search · A add book · ⌘/Ctrl K command palette</p>
        </div>

        <div className="topbar-controls">
          <div className="topbar-meta-row">
            <NavLink to="/import" className="text-link topbar-meta-link">
              Manage Library
            </NavLink>
            <span className="topbar-review-pill">
              {reviewCount ? `${reviewCount} pending review` : "No pending review"}
            </span>
          </div>

          <div className="view-toggle" role="tablist" aria-label="Library view selector">
            {(
              [
                ["case-spines", "Spines"],
                ["grid", "Grid"],
                ["list", "List"],
              ] as const
            ).map(([option, label]) => (
              <button
                key={option}
                className={clsx("toggle", view === option && "active")}
                type="button"
                role="tab"
                aria-selected={view === option}
                onClick={() => onViewChange(option)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="topbar-actions">
            <button className="button ghost" type="button" onClick={onScanBarcode} disabled={!isUnlocked}>
              Scan
            </button>
            {isUnlocked ? (
              <button className="button ghost" type="button" onClick={onLock}>
                Lock
              </button>
            ) : (
              <button className="button ghost" type="button" onClick={onRequestUnlock}>
                Unlock
              </button>
            )}

            <div className="add-menu" ref={addMenuRef}>
              <button
                className="button primary add-trigger"
                type="button"
                onClick={() => {
                  if (!isUnlocked) {
                    onRequestUnlock();
                    return;
                  }
                  setAddMenuOpen((prev) => !prev);
                }}
                aria-expanded={addMenuOpen}
                aria-haspopup="true"
              >
                Add
                <span className="add-trigger-caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              {addMenuOpen ? (
                <div className="add-menu-panel" role="menu">
                  <button
                    className="add-menu-item"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAddMenuOpen(false);
                      onAddBook();
                    }}
                  >
                    Add Book
                  </button>
                  <button
                    className="add-menu-item"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAddMenuOpen(false);
                      onAddBookcase();
                    }}
                  >
                    Add Bookcase
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
};
