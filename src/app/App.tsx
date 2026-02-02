import { useEffect, useMemo, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { CommandPalette } from "../components/CommandPalette";
import { Header } from "../components/Header";
import { BookDetailPage } from "../pages/BookDetailPage";
import { ImportPage } from "../pages/ImportPage";
import { LibraryPage } from "../pages/LibraryPage";
import { useLibraryStore } from "./store";

export const App = () => {
  const [commandOpen, setCommandOpen] = useState(false);
  const loadFromDb = useLibraryStore((state) => state.loadFromDb);
  const seedFromCsv = useLibraryStore((state) => state.seedFromCsv);
  const loading = useLibraryStore((state) => state.loading);
  const navigate = useNavigate();

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
      goToBook: (id: number) => navigate(`/book/${id}`),
    }),
    [navigate]
  );

  if (loading) {
    return (
      <div className="app">
        <Header onCommand={actions.openCommand} />
        <div className="panel">Loading library...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header onCommand={actions.openCommand} />
      <Routes>
        <Route path="/" element={<LibraryPage onSelectBook={actions.goToBook} />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Routes>
      <CommandPalette open={commandOpen} onClose={actions.closeCommand} />
    </div>
  );
};
