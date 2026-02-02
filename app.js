const SCHEMA = [
  "id",
  "title",
  "authors",
  "publisher",
  "publish_year",
  "language",
  "format",
  "isbn13",
  "tags",
  "collections",
  "projects",
  "location",
  "status",
  "notes",
  "cover_image",
  "added_at",
  "updated_at",
];

const STATUS_VALUES = ["to_read", "reading", "referenced", "finished"];

const state = {
  books: [],
  view: "grid",
  filtered: [],
  editingId: null,
};

const elements = {
  grid: document.getElementById("libraryGrid"),
  summary: document.getElementById("summary"),
  search: document.getElementById("searchInput"),
  status: document.getElementById("statusFilter"),
  gridView: document.getElementById("gridView"),
  listView: document.getElementById("listView"),
  importCsv: document.getElementById("importCsv"),
  exportCsv: document.getElementById("exportCsv"),
  addBook: document.getElementById("addBook"),
  drawer: document.getElementById("drawer"),
  closeDrawer: document.getElementById("closeDrawer"),
  form: document.getElementById("bookForm"),
  deleteBook: document.getElementById("deleteBook"),
};

function parseCSV(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  const fields = [];
  const pushField = () => {
    fields.push(current);
    current = "";
  };
  const pushRow = () => {
    rows.push(fields.splice(0, fields.length));
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      pushField();
    } else if (char === "\n" && !inQuotes) {
      pushField();
      pushRow();
    } else if (char === "\r") {
      continue;
    } else {
      current += char;
    }
  }

  pushField();
  if (fields.length > 0) {
    pushRow();
  }

  return rows;
}

function toCSV(rows) {
  const escapeValue = (value) => {
    const str = value ?? "";
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  };

  const lines = [SCHEMA.join(",")];
  rows.forEach((row) => {
    const line = SCHEMA.map((key) => escapeValue(row[key])).join(",");
    lines.push(line);
  });
  return lines.join("\n");
}

function normalizeBook(raw) {
  const book = { ...raw };
  SCHEMA.forEach((key) => {
    if (!(key in book)) {
      book[key] = "";
    }
  });
  book.id = Number.parseInt(book.id, 10);
  if (!Number.isFinite(book.id)) {
    book.id = 0;
  }
  if (!book.language) {
    book.language = "en";
  }
  if (!STATUS_VALUES.includes(book.status)) {
    book.status = "to_read";
  }
  book.isbn13 = book.isbn13 ?? "";
  return book;
}

function parseCSVToBooks(text) {
  const [header, ...dataRows] = parseCSV(text.trim());
  if (!header || header.join(",") !== SCHEMA.join(",")) {
    throw new Error("CSV schema mismatch.");
  }
  return dataRows
    .filter((row) => row.length > 1 || row[0])
    .map((row) => {
      const entry = {};
      SCHEMA.forEach((key, index) => {
        entry[key] = row[index] ?? "";
      });
      return normalizeBook(entry);
    });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gnosis-library", 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("books")) {
        db.createObjectStore("books", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function readAllBooks(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readonly");
    const store = tx.objectStore("books");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function saveBooks(db, books) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    store.clear();
    books.forEach((book) => store.put(book));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function upsertBook(db, book) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    store.put(book);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeBook(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("books", "readwrite");
    const store = tx.objectStore("books");
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function applyFilters() {
  const query = elements.search.value.trim().toLowerCase();
  const status = elements.status.value;
  state.filtered = state.books.filter((book) => {
    const matchQuery =
      !query ||
      [book.title, book.authors, book.tags]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchStatus = !status || book.status === status;
    return matchQuery && matchStatus;
  });
  renderSummary();
  renderGrid();
}

function renderSummary() {
  elements.summary.textContent = `${state.filtered.length} of ${state.books.length} books`;
}

function createCover(book) {
  if (book.cover_image) {
    const img = document.createElement("img");
    img.src = book.cover_image;
    img.alt = `Cover of ${book.title || "Untitled"}`;
    img.loading = "lazy";
    return img;
  }
  const placeholder = document.createElement("div");
  placeholder.textContent = "No cover";
  return placeholder;
}

function renderGrid() {
  elements.grid.innerHTML = "";
  elements.grid.className = state.view === "grid" ? "grid" : "grid list";

  state.filtered.forEach((book) => {
    const card = document.createElement("article");
    card.className = state.view === "grid" ? "card" : "card list-item";
    card.addEventListener("click", () => openDrawer(book));

    const cover = document.createElement("div");
    cover.className = "cover";
    cover.appendChild(createCover(book));

    const info = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = book.title || "Untitled";
    const authors = document.createElement("p");
    authors.textContent = book.authors || "Unknown author";
    const meta = document.createElement("p");
    meta.textContent = [book.publisher, book.publish_year].filter(Boolean).join(" · ");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = book.status.replace("_", " ");

    info.appendChild(title);
    info.appendChild(authors);
    if (meta.textContent) {
      info.appendChild(meta);
    }
    info.appendChild(badge);

    if (state.view === "grid") {
      card.appendChild(cover);
      card.appendChild(info);
    } else {
      cover.style.maxWidth = "80px";
      cover.style.minWidth = "80px";
      cover.style.aspectRatio = "2 / 3";
      card.appendChild(cover);
      card.appendChild(info);
    }

    elements.grid.appendChild(card);
  });
}

function openDrawer(book) {
  state.editingId = book?.id ?? null;
  elements.drawer.classList.add("open");
  elements.drawer.setAttribute("aria-hidden", "false");
  elements.form.reset();

  const data =
    book ??
    normalizeBook({
      id: nextId(),
      status: "to_read",
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  SCHEMA.forEach((key) => {
    const input = elements.form.elements[key];
    if (input) {
      input.value = data[key] ?? "";
    }
  });

  elements.deleteBook.style.visibility = book ? "visible" : "hidden";
}

function closeDrawer() {
  elements.drawer.classList.remove("open");
  elements.drawer.setAttribute("aria-hidden", "true");
  state.editingId = null;
}

function nextId() {
  const maxId = state.books.reduce((max, book) => Math.max(max, book.id || 0), 0);
  return maxId + 1;
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.form);
  const entry = {};
  SCHEMA.forEach((key) => {
    entry[key] = formData.get(key) ?? "";
  });
  const normalized = normalizeBook(entry);
  if (!normalized.publish_year) {
    normalized.publish_year = "";
  }
  if (!normalized.language) {
    normalized.language = "en";
  }
  const now = new Date().toISOString();
  if (state.editingId) {
    const existing = state.books.find((book) => book.id === state.editingId);
    normalized.added_at = existing?.added_at || now;
  } else {
    normalized.added_at = now;
  }
  normalized.updated_at = now;

  const db = await openDB();
  await upsertBook(db, normalized);
  state.books = state.books
    .filter((book) => book.id !== normalized.id)
    .concat(normalized)
    .sort((a, b) => a.id - b.id);
  applyFilters();
  closeDrawer();
}

async function handleDelete() {
  if (!state.editingId) {
    return;
  }
  if (!window.confirm("Remove this book from your library?")) {
    return;
  }
  const db = await openDB();
  await removeBook(db, state.editingId);
  state.books = state.books.filter((book) => book.id !== state.editingId);
  applyFilters();
  closeDrawer();
}

async function handleExport() {
  const blob = new Blob([toCSV(state.books)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "library.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const text = await file.text();
  const books = parseCSVToBooks(text);
  const db = await openDB();
  await saveBooks(db, books);
  state.books = books.sort((a, b) => a.id - b.id);
  applyFilters();
  event.target.value = "";
}

function setView(view) {
  state.view = view;
  elements.gridView.classList.toggle("active", view === "grid");
  elements.listView.classList.toggle("active", view === "list");
  renderGrid();
}

async function bootstrap() {
  const db = await openDB();
  const saved = await readAllBooks(db);
  if (saved.length === 0) {
    const response = await fetch("library.csv");
    const text = await response.text();
    const books = parseCSVToBooks(text);
    await saveBooks(db, books);
    state.books = books;
  } else {
    state.books = saved.map(normalizeBook).sort((a, b) => a.id - b.id);
  }
  state.filtered = [...state.books];
  renderSummary();
  renderGrid();
}

bootstrap();

elements.search.addEventListener("input", applyFilters);

elements.status.addEventListener("change", applyFilters);

elements.gridView.addEventListener("click", () => setView("grid"));

elements.listView.addEventListener("click", () => setView("list"));

elements.importCsv.addEventListener("change", handleImport);

elements.exportCsv.addEventListener("click", handleExport);

elements.addBook.addEventListener("click", () => openDrawer());

elements.closeDrawer.addEventListener("click", closeDrawer);

elements.drawer.addEventListener("click", (event) => {
  if (event.target === elements.drawer) {
    closeDrawer();
  }
});

elements.form.addEventListener("submit", handleFormSubmit);

elements.deleteBook.addEventListener("click", handleDelete);
