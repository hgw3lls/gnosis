import { Command } from "cmdk";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const COMMANDS = [
  { label: "Library", action: "/" },
  { label: "Add Book", action: "/book/new" },
  { label: "Import / Export", action: "/import" },
];

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export const CommandPalette = ({ open, onClose }: CommandPaletteProps) => {
  const navigate = useNavigate();

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
        <Command.Input placeholder="Type a command" />
        <Command.List>
          {COMMANDS.map((command) => (
            <Command.Item
              key={command.label}
              className="command-item"
              onSelect={() => {
                navigate(command.action);
                onClose();
              }}
            >
              {command.label}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
};
