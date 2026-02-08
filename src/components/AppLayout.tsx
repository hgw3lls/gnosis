import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";

export type ViewMode = "grid" | "list" | "case-spines";

type AppLayoutProps = {
  query: string;
  onQueryChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
  onAddBook: () => void;
  onScanBarcode: () => void;
  children: ReactNode;
};

export const AppLayout = ({
  query,
  onQueryChange,
  view,
  onViewChange,
  onAddBook,
  onScanBarcode,
  children,
}: AppLayoutProps) => {
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
                ["case-spines", "Case Spines"],
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
          <button className="button primary" type="button" onClick={onAddBook}>
            Add
          </button>
        </div>
      </header>
      {children}
    </div>
  );
};
