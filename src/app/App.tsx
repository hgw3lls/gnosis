import { useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AddBookcaseModal } from "../components/AddBookcaseModal";
import { AddBookModal } from "../components/AddBookModal";
import { CommandPalette } from "../components/CommandPalette";
import { AppLayout, ViewMode } from "../components/AppLayout";
import { BookDetailPage } from "../pages/BookDetailPage";
import { ImportPage } from "../pages/ImportPage";
import { LibraryPage } from "../pages/LibraryPage";
import { useLibraryStore } from "./store";

export const App = () => {
  const [commandOpen, setCommandOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addBookcaseOpen, setAddBookcaseOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const loadFromDb = useLibraryStore((state) => state.loadFromDb);
  const seedFromCsv = useLibraryStore((state) => state.seedFromCsv);
  const loading = useLibraryStore((state) => state.loading);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      await loadFromDb();
      const hasBooks = useLibraryStore.getState().books.length > 0;
      if (!hasBooks) {
        await seedFromCsv();
      }
    };
    void init();
  }, [loadFromDb, seedFromCsv]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const actions = useMemo(
    () => ({
      openCommand: () => setCommandOpen(true),
      closeCommand: () => setCommandOpen(false),
      openAdd: () => setAddOpen(true),
      closeAdd: () => setAddOpen(false),
      openAddBookcase: () => setAddBookcaseOpen(true),
      closeAddBookcase: () => setAddBookcaseOpen(false),
      openScan: () => navigate("/book/new?scan=1"),
      goToBook: (id: number) =>
        navigate(`/book/${id}`, {
          state: { from: `${location.pathname}${location.search}` },
        }),
      setView,
    }),
    [location.pathname, location.search, navigate]
  );

  if (loading) {
    return (
      <AppLayout
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={setView}
        onAddBook={actions.openAdd}
        onAddBookcase={actions.openAddBookcase}
        onScanBarcode={actions.openScan}
      >
        <div className="panel">Loading library...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      query={query}
      onQueryChange={setQuery}
      view={view}
      onViewChange={setView}
      onAddBook={actions.openAdd}
      onAddBookcase={actions.openAddBookcase}
      onScanBarcode={actions.openScan}
    >
      <Routes>
        <Route
          path="/"
          element={
            <LibraryPage
              onSelectBook={actions.goToBook}
              query={query}
              view={view}
            />
          }
        />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Routes>
      <CommandPalette
        open={commandOpen}
        onClose={actions.closeCommand}
        onAddBook={actions.openAdd}
        onScanBarcode={actions.openScan}
        onViewChange={actions.setView}
      />
      <AddBookModal open={addOpen} onClose={actions.closeAdd} />
      <AddBookcaseModal
        open={addBookcaseOpen}
        onClose={actions.closeAddBookcase}
      />
    </AppLayout>
  );
};
