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
    <div className="app app-shell">
      <aside className="workspace-sidebar brutal-surface">
        <div className="workspace-brand">
          <p className="topbar-kicker">Private archive system</p>
          <NavLink to="/" className="topbar-logo-link" aria-label="Open library home">
            <img src="exlibris.png" alt="Ex Libris" className="topbar-logo" />
          </NavLink>
          <div className="workspace-status-row">
            <div className="topbar-status-pill" aria-live="polite">
              {isUnlocked ? "Editable" : "Read only"}
            </div>
            <span className="topbar-review-pill">
              {reviewCount ? `${reviewCount} pending review` : "No pending review"}
            </span>
          </div>
        </div>

        <nav className="workspace-nav" aria-label="Primary navigation">
          <NavLink to="/" className="workspace-nav-link">
            Library Workspace
          </NavLink>
          <NavLink to="/import" className="workspace-nav-link">
            Data & Import
          </NavLink>
        </nav>

        <section className="workspace-actions" aria-label="Quick actions">
          <h2 className="workspace-section-title">Quick actions</h2>
          <button className="button primary" type="button" onClick={onAddBook}>
            Add Book
          </button>
          <button className="button ghost" type="button" onClick={onAddBookcase}>
            Add Bookcase
          </button>
          <button className="button ghost" type="button" onClick={onScanBarcode} disabled={!isUnlocked}>
            Scan Barcode
          </button>
          {isUnlocked ? (
            <button className="button ghost" type="button" onClick={onLock}>
              Lock Editing
            </button>
          ) : (
            <button className="button ghost" type="button" onClick={onRequestUnlock}>
              Unlock Editing
            </button>
          )}

          <div className="add-menu" ref={addMenuRef}>
            <button
              className="button ghost add-trigger"
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
              More add options
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
        </section>

        <p className="topbar-hint">Shortcuts: / search · A add book · ⌘/Ctrl K command palette</p>
      </aside>

      <div className="workspace-main">
        <header className="workspace-header brutal-surface">
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
          </div>

          <div className="workspace-header-controls">
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
            <NavLink to="/import" className="text-link topbar-meta-link">
              Manage Library Data
            </NavLink>
          </div>
        </header>

        <main className="workspace-content">{children}</main>
        </div>
    </div>
  );
};
