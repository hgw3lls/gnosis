import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";

export type ViewMode = "grid" | "list" | "case-spines";

type AppLayoutProps = {
  query: string;
  onQueryChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
  onAddBook: () => void;
  onAddBookcase: () => void;
  onScanBarcode: () => void;
  children: ReactNode;
};

export const AppLayout = ({
  query,
  onQueryChange,
  view,
  onViewChange,
  onAddBook,
  onAddBookcase,
  onScanBarcode,
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
      <header className="topbar">
        <div className="topbar-left">Gnosis Library</div>
        <div className="topbar-center">
          <input
            className="input input-dominant"
            type="search"
            placeholder="Search titles, authors, tags"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className="topbar-right">
          <div className="view-toggle">
            {(
              [
                ["grid", "Grid"],
                ["list", "List"],
                ["case-spines", "Spines"],
              ] as const
            ).map(([option, label]) => (
              <button
                key={option}
                className={clsx("toggle", view === option && "active")}
                type="button"
                onClick={() => onViewChange(option)}
              >
                {label}
              </button>
            ))}
          </div>
          <NavLink to="/import" className="text-link">
            Import/Export
          </NavLink>
          <button className="button ghost" type="button" onClick={onScanBarcode}>
            Scan Barcode
          </button>
          <div className="add-menu" ref={addMenuRef}>
            <button
              className="button primary add-trigger"
              type="button"
              onClick={() => setAddMenuOpen((prev) => !prev)}
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
                  Book
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
                  Bookcase
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
};
