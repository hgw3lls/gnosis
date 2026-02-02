import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";

export type ViewMode = "grid" | "list" | "stack";

type AppLayoutProps = {
  query: string;
  onQueryChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
  children: ReactNode;
};

export const AppLayout = ({ query, onQueryChange, view, onViewChange, children }: AppLayoutProps) => {
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
            {(["list", "grid", "stack"] as ViewMode[]).map((option) => (
              <button
                key={option}
                className={clsx("toggle", view === option && "active")}
                type="button"
                onClick={() => onViewChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <NavLink to="/import" className="text-link">
            Import/Export
          </NavLink>
          <NavLink to="/book/new" className="button primary">
            Add
          </NavLink>
        </div>
      </header>
      {children}
    </div>
  );
};
