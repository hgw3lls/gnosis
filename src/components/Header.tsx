import { NavLink } from "react-router-dom";
import clsx from "clsx";

type HeaderProps = {
  onCommand: () => void;
};

export const Header = ({ onCommand }: HeaderProps) => {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">Personal Library</p>
        <NavLink to="/" className="logo-link">
          <img src="/gnosis-logo.png" alt="Gnosis" className="logo" />
        </NavLink>
        <nav className="nav">
          <NavLink to="/" className={({ isActive }) => clsx(isActive && "active")}>
            Library
          </NavLink>
          <NavLink
            to="/import"
            className={({ isActive }) => clsx(isActive && "active")}
          >
            Manage Library
          </NavLink>
        </nav>
      </div>
      <div className="actions">
        <button className="button ghost" type="button" onClick={onCommand}>
          Command
        </button>
        <NavLink to="/import" className="button ghost">
          Manage Library
        </NavLink>
        <NavLink to="/book/new" className="button">
          Add Book
        </NavLink>
      </div>
    </header>
  );
};
