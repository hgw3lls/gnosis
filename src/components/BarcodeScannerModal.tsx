import { FormEvent, useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";
import { sanitizeIsbnDigits, isValidIsbn13 } from "../lib/isbnLookup";

type LookupState = "idle" | "lookup" | "not_found" | "error" | "success";

type BarcodeScannerModalProps = {
  open: boolean;
  foundIsbn: string | null;
  lookupState: LookupState;
  lookupMessage: string | null;
  onClose: () => void;
  onIsbn: (isbn: string, mode: "lookup" | "auto_add") => void;
};

type CameraState = "idle" | "requesting" | "scanning" | "permission_denied" | "found";

export const BarcodeScannerModal = ({
  open,
  foundIsbn,
  lookupState,
  lookupMessage,
  onClose,
  onIsbn,
}: BarcodeScannerModalProps) => {
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const detectionLockRef = useRef(false);
  const autoAddModeRef = useRef(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [manualIsbn, setManualIsbn] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [autoAddMode, setAutoAddMode] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    detectionLockRef.current = false;
    setCameraState("requesting");

    const startScanner = () => {
      if (!scannerRef.current) {
        return;
      }
      Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              facingMode: { ideal: "environment" },
              width: { min: 640 },
              height: { min: 480 },
            },
          },
          decoder: {
            readers: ["ean_reader", "upc_reader", "ean_8_reader"],
          },
          locate: true,
        },
        (error) => {
          if (!mounted) {
            return;
          }
          if (error) {
            setCameraState("permission_denied");
            return;
          }
          Quagga.start();
          setCameraState("scanning");
        },
      );
    };

    const handleDetected = (result: { codeResult?: { code?: string } }) => {
      const code = result.codeResult?.code;
      if (!code || detectionLockRef.current) {
        return;
      }
      const digits = sanitizeIsbnDigits(code);
      if (!digits || !isValidIsbn13(digits)) {
        return;
      }
      detectionLockRef.current = true;
      setLastDetected(digits);
      if (autoAddModeRef.current) {
        onIsbn(digits, "auto_add");
        window.setTimeout(() => {
          detectionLockRef.current = false;
          if (mounted) {
            setCameraState("scanning");
          }
        }, 1200);
        return;
      }
      setCameraState("found");
      onIsbn(digits, "lookup");
      Quagga.stop();
    };

    startScanner();
    Quagga.onDetected(handleDetected);

    return () => {
      mounted = false;
      Quagga.offDetected(handleDetected);
      Quagga.stop();
    };
  }, [open, onIsbn]);

  useEffect(() => {
    if (open) {
      setManualIsbn("");
      setManualError(null);
      setAutoAddMode(false);
      autoAddModeRef.current = false;
      setLastDetected(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = sanitizeIsbnDigits(manualIsbn);
    if (!isValidIsbn13(normalized)) {
      setManualError("Enter a valid 13-digit ISBN starting with 978 or 979.");
      return;
    }
    setManualError(null);
    onIsbn(normalized, autoAddMode ? "auto_add" : "lookup");
  };

  const cameraStatusLabel = {
    requesting: "Requesting camera access…",
    scanning: "Scanning…",
    found: "Found ISBN.",
    permission_denied: "Permission denied. Check browser settings and HTTPS.",
    idle: "",
  }[cameraState];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal scanner-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>Scan Barcode</h2>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="scanner-preview" ref={scannerRef} />
        <div className="scanner-status">
          {cameraStatusLabel && <p>{cameraStatusLabel}</p>}
          {foundIsbn && <p>Found ISBN: {foundIsbn}</p>}
          {lastDetected && autoAddMode && <p>Auto-added ISBN: {lastDetected}</p>}
          {lookupState === "lookup" && <p>Looking up book metadata…</p>}
          {lookupState === "not_found" && <p>No Open Library entry found.</p>}
          {lookupState === "error" && <p>Lookup failed. Check your connection.</p>}
          {lookupState === "success" && <p>Book details loaded.</p>}
          {lookupMessage && <p>{lookupMessage}</p>}
        </div>
        <form className="scanner-manual" onSubmit={handleManualSubmit}>
          <label className="modal-label scanner-toggle">
            <input
              type="checkbox"
              checked={autoAddMode}
              onChange={(event) => {
                setAutoAddMode(event.target.checked);
                autoAddModeRef.current = event.target.checked;
              }}
            />
            Auto-add mode (keep scanning)
          </label>
          <label className="modal-label">
            Manual ISBN-13
            <input
              className="input"
              inputMode="numeric"
              placeholder="9781234567890"
              value={manualIsbn}
              onChange={(event) => {
                setManualIsbn(event.target.value);
                setManualError(null);
              }}
            />
          </label>
          {manualError && <p className="scanner-error">{manualError}</p>}
          <div className="form-actions">
            <button className="button ghost" type="button" onClick={onClose}>
              Close
            </button>
            <button className="button primary" type="submit">
              Lookup ISBN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
