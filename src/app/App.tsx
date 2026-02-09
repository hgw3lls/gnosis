import { useEffect, useMemo, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { AddBookcaseModal } from "../components/AddBookcaseModal";
import { AddBookModal } from "../components/AddBookModal";
import { CommandPalette } from "../components/CommandPalette";
import { AppLayout, ViewMode } from "../components/AppLayout";
import { BookDetailPage } from "../pages/BookDetailPage";
import { ImportPage } from "../pages/ImportPage";
import { LibraryPage } from "../pages/LibraryPage";
import { useLibraryStore } from "./store";
import { UnlockModal } from "../components/UnlockModal";

export const App = () => {
  const [commandOpen, setCommandOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addBookcaseOpen, setAddBookcaseOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [activeBookId, setActiveBookId] = useState<number | "new" | null>(null);
  const [scanOnOpen, setScanOnOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const loadFromDb = useLibraryStore((state) => state.loadFromDb);
  const seedFromCsv = useLibraryStore((state) => state.seedFromCsv);
  const loading = useLibraryStore((state) => state.loading);
  const isUnlocked = useLibraryStore((state) => state.isUnlocked);
  const unlockWithCode = useLibraryStore((state) => state.unlockWithCode);
  const lock = useLibraryStore((state) => state.lock);

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
      openAdd: () => {
        if (!isUnlocked) {
          setUnlockOpen(true);
          return;
        }
        setAddOpen(true);
      },
      closeAdd: () => setAddOpen(false),
      openAddBookcase: () => {
        if (!isUnlocked) {
          setUnlockOpen(true);
          return;
        }
        setAddBookcaseOpen(true);
      },
      closeAddBookcase: () => setAddBookcaseOpen(false),
      openScan: () => {
        if (!isUnlocked) {
          setUnlockOpen(true);
          return;
        }
        setActiveBookId("new");
        setScanOnOpen(true);
      },
      goToBook: (id: number) => {
        if (!isUnlocked) {
          setUnlockOpen(true);
          return;
        }
        setActiveBookId(id);
        setScanOnOpen(false);
      },
      closeBookDetail: () => {
        setActiveBookId(null);
        setScanOnOpen(false);
      },
      setView,
    }),
    [isUnlocked]
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
        isUnlocked={isUnlocked}
        onRequestUnlock={() => setUnlockOpen(true)}
        onLock={lock}
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
      isUnlocked={isUnlocked}
      onRequestUnlock={() => setUnlockOpen(true)}
      onLock={lock}
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
        onOpenBook={actions.goToBook}
        onViewChange={actions.setView}
      />
      <AddBookModal
        open={addOpen}
        onClose={actions.closeAdd}
        onCreated={(id) => {
          actions.closeAdd();
          actions.goToBook(id);
        }}
        onScan={() => {
          actions.closeAdd();
          actions.openScan();
        }}
      />
      <AddBookcaseModal
        open={addBookcaseOpen}
        onClose={actions.closeAddBookcase}
      />
      <UnlockModal
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        onUnlock={unlockWithCode}
      />
      {activeBookId != null ? (
        <BookDetailPage
          bookId={activeBookId}
          onClose={actions.closeBookDetail}
          onCreated={(id) => {
            setActiveBookId(id);
            setScanOnOpen(false);
          }}
          isModal
          initialScan={scanOnOpen}
        />
      ) : null}
    </AppLayout>
  );
};
