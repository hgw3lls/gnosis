# Visual Bookshelf

A React + TypeScript + Vite app that renders your library as a visual bookshelf with drag-and-drop, search, and inline editing. The app hydrates from `library.csv` on first load, then persists edits locally.

## Setup

```bash
npm install
npm run dev
```

## Features

- Six shelf sections with drag-and-drop between shelves
- Search, filter, table view, and edit drawer
- Import/export CSV and JSON
- Local persistence (localStorage)
- Reset from `library.csv`

## Data

- `public/library.csv` is served at runtime
- `library.csv` in the repo root remains the canonical source of truth

