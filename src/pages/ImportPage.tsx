import { useMemo, useState, type ChangeEvent } from "react";
import { db } from "../db/db";
import { useLibraryStore } from "../app/store";
import { exportCsvText } from "../utils/csv";
import { getReviewIssues, needsReview } from "../services/reviewQueue";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractMeaningfulSyncError = (response: Response, rawDetails: string) => {
  const details = rawDetails.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!details) {
    return "";
  }

  if (!/[a-zA-Z]/.test(details)) {
    return "";
  }

  const statusText = response.statusText.trim();
  const statusSummary = `${response.status} ${statusText}`.trim();

  if (details === statusText || details === statusSummary || details === `${statusSummary} ${statusSummary}`.trim()) {
    return "";
  }

  if (statusText) {
    const statusNoise = new RegExp(`^(?:${response.status}\\s+${escapeRegExp(statusText)}\\s*)+`, "i");
    const strippedStatusNoise = details.replace(statusNoise, "").trim();
    if (!strippedStatusNoise) {
      return "";
    }
    if (/^sync failed\b/i.test(strippedStatusNoise)) {
      return "";
    }
    return strippedStatusNoise;
  }

  if (/^sync failed\b/i.test(details)) {
    return "";
  }

  return details;
};

export const ImportPage = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showReview, setShowReview] = useState(false);
  const importCsv = useLibraryStore((state) => state.importCsv);
  const books = useLibraryStore((state) => state.books);
  const reviewedBookIds = useLibraryStore((state) => state.reviewedBookIds);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const markReviewed = useLibraryStore((state) => state.markReviewed);
  const removeBook = useLibraryStore((state) => state.removeBook);

  const reviewBooks = useMemo(
    () => books.filter((book) => needsReview(book) && !reviewedBookIds.has(book.id)),
    [books, reviewedBookIds]
  );

  const handleMarkAllReviewed = () => {
    reviewBooks.forEach((book) => markReviewed(book.id));
  };

  const handleExport = async () => {
    const books = await db.books.toArray();
    const text = exportCsvText(books);
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "library.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSync = async () => {
    const fallbackMessage =
      "Sync failed. This deployment likely does not expose /api/library. Use Export and replace library.csv in deployment.";

    try {
      setError("");
      const books = await db.books.toArray();
      const text = exportCsvText(books);
      const endpoint = `${import.meta.env.BASE_URL}api/library`;
      const requestInit = {
        headers: {
          "Content-Type": "text/csv",
        },
        body: text,
      };

      let response = await fetch(endpoint, {
        ...requestInit,
        method: "PUT",
      });

      if (response.status === 405) {
        response = await fetch(endpoint, {
          ...requestInit,
          method: "POST",
        });
      }

      if (!response.ok) {
        if (response.status === 404 || response.status === 405) {
          throw new Error("");
        }

        const rawDetails = await response.text();
        const details = rawDetails.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const statusSummary = `${response.status} ${response.statusText}`.trim();
        const repeatedStatusSummary = `${statusSummary} ${statusSummary}`.trim();

        if (!details || details === response.statusText || details === statusSummary || details === repeatedStatusSummary) {
          throw new Error("");
        }

        throw new Error(details);
      }

      setMessage("Library synced to website library.csv. Future visitors will load this update.");
    } catch (error) {
      if (error instanceof TypeError) {
        setError(fallbackMessage);
        return;
      }

      if (error instanceof Error) {
        const detail = error.message.trim();
        setError(detail ? `${detail} ${fallbackMessage}` : fallbackMessage);
        return;
      }

      setError(fallbackMessage);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      setError("");
      const text = await file.text();
      await importCsv(text);
      setMessage("Library updated from CSV.");
      setShowReview(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Reset local database? This will remove all locally stored books."
    );
    if (!confirmed) {
      return;
    }
    await db.books.clear();
    setMessage("Local database cleared.");
  };

  return (
    <section className="import-layout">
      <div className="panel">
        <h2>Import</h2>
        <p>
          Import a CSV file that matches the canonical schema. The header must match the exact
          order of columns in <code>library.csv</code>.
        </p>
        <div className="actions">
          <label className="button ghost">
            Import CSV
            <input type="file" accept=".csv" onChange={handleImport} hidden />
          </label>
          <button className="button ghost" type="button" onClick={() => setShowReview((prev) => !prev)}>
            {showReview ? "Hide" : "Show"} Review Queue ({reviewBooks.length})
          </button>
        </div>
        {error ? <p className="summary error-text">{error}</p> : null}
        {message ? <p className="summary">{message}</p> : null}
      </div>
      <div className="panel">
        <h2>Export</h2>
        <p>Export the current IndexedDB library using the canonical CSV header order.</p>
        <div className="actions">
          <button className="button" type="button" onClick={handleExport}>
            Export library.csv
          </button>
          <button className="button danger" type="button" onClick={handleReset}>
            Reset local database
          </button>
        </div>
      </div>
      <div className="panel">
        <h2>Sync Library</h2>
        <p>
          Sync publishes your current session library to the website&rsquo;s canonical
          <code> library.csv</code> so later visitors load the same updated data.
        </p>
        <p className="summary">
          Server-side saving requires a deployment endpoint at <code>/api/library</code>. Without
          it, use Export and replace <code>library.csv</code> in your host/deployment.
        </p>
        <div className="actions">
          <button className="button" type="button" onClick={handleSync}>
            Sync library.csv
          </button>
        </div>
      </div>

      {showReview ? (
        <div className="panel">
          <div className="actions">
            <h2>Import Review Queue</h2>
            <button
              className="button ghost"
              type="button"
              onClick={handleMarkAllReviewed}
              disabled={!reviewBooks.length}
            >
              Mark all reviewed
            </button>
          </div>
          {reviewBooks.length ? (
            <div className="review-list">
              {reviewBooks.map((book) => (
                <div key={book.id} className="review-row">
                  <div>
                    <p><strong>#{book.id}</strong> {book.title || "Untitled"}</p>
                    <p className="summary">Needs: {getReviewIssues(book).join(", ")}</p>
                  </div>
                  <div className="review-edit-grid">
                    <input className="input" value={book.title} placeholder="Title" onChange={(event) => void upsertBook({ ...book, title: event.target.value, updated_at: new Date().toISOString() })} />
                    <input className="input" value={book.authors} placeholder="Authors" onChange={(event) => void upsertBook({ ...book, authors: event.target.value, updated_at: new Date().toISOString() })} />
                    <input className="input" value={book.publish_year} placeholder="Publish year" onChange={(event) => void upsertBook({ ...book, publish_year: event.target.value, updated_at: new Date().toISOString() })} />
                    <input className="input" value={book.location} placeholder="Location" onChange={(event) => void upsertBook({ ...book, location: event.target.value, updated_at: new Date().toISOString() })} />
                    <input className="input" value={book.cover_image} placeholder="Cover URL" onChange={(event) => void upsertBook({ ...book, cover_image: event.target.value, updated_at: new Date().toISOString() })} />
                    <div className="review-actions">
                      <button className="button ghost" type="button" onClick={() => markReviewed(book.id)}>
                        Accept
                      </button>
                      <button
                        className="button danger"
                        type="button"
                        onClick={() => {
                          if (window.confirm("Reject this review item and remove the book from your library?")) {
                            void removeBook(book.id);
                          }
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="summary">No books currently require review.</p>
          )}
        </div>
      ) : null}
    </section>
  );
};
