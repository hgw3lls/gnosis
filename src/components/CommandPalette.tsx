import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ViewMode } from "./AppLayout";
import { useLibraryStore } from "../app/store";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onAddBook: () => void;
  onScanBarcode: () => void;
  onOpenBook: (id: number) => void;
  onViewChange: (view: ViewMode) => void;
};

export const CommandPalette = ({
  open,
  onClose,
  onAddBook,
  onScanBarcode,
  onOpenBook,
  onViewChange,
}: CommandPaletteProps) => {
  const navigate = useNavigate();
  const books = useLibraryStore((state) => state.books);
  const [query, setQuery] = useState("");

  const filteredBooks = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return books.slice(0, 8);
    }
    return books
      .filter((book) =>
        [book.title, book.authors, book.tags]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 8);
  }, [books, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="command-overlay" onClick={onClose}>
      <Command className="command" onClick={(event) => event.stopPropagation()}>
        <Command.Input
          placeholder="Type a command or search books"
          value={query}
          onValueChange={setQuery}
        />
        <Command.List>
          <Command.Group heading="Quick actions">
            <Command.Item
              className="command-item"
              onSelect={() => {
                onAddBook();
                onClose();
              }}
            >
              Add book
            </Command.Item>
            <Command.Item
              className="command-item"
              onSelect={() => {
                onScanBarcode();
                onClose();
              }}
            >
              Scan barcode
            </Command.Item>
            <Command.Item
              className="command-item"
              onSelect={() => {
                navigate("/import");
                onClose();
              }}
            >
              Go to Manage Library
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Views">
            {(
              [
                ["grid", "Grid"],
                ["list", "List"],
                ["case-spines", "Spines"],
              ] as const
            ).map(([view, label]) => (
              <Command.Item
                key={view}
                className="command-item"
                onSelect={() => {
                  onViewChange(view);
                  onClose();
                }}
              >
                Switch to {label}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Books">
            {filteredBooks.map((book) => (
              <Command.Item
                key={book.id}
                className="command-item"
                onSelect={() => {
                  onOpenBook(book.id);
                  onClose();
                }}
              >
                {book.title || "Untitled"} · {book.authors || "Unknown author"}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};
