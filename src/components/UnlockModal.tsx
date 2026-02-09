import { FormEvent, useState } from "react";

type UnlockModalProps = {
  open: boolean;
  onClose: () => void;
  onUnlock: (code: string) => boolean;
};

export const UnlockModal = ({ open, onClose, onUnlock }: UnlockModalProps) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = onUnlock(code.trim());
    if (success) {
      setCode("");
      setError(null);
      onClose();
      return;
    }
    setError("Incorrect unlock code.");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>Unlock edits</h2>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-label">
            Unlock code
            <input
              className="input"
              type="password"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setError(null);
              }}
              placeholder="Enter code"
              autoFocus
            />
          </label>
          {error ? <p className="scanner-error">{error}</p> : null}
          <div className="form-actions">
            <button className="button ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" type="submit" disabled={!code.trim()}>
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
