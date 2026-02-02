# Gnosis Library

A personal library management webapp. The canonical schema lives in `./library.csv` and must not be altered without explicit instruction.

## Getting started

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Schema contract

The app treats `./library.csv` as the canonical schema. The header must match the exact order below:

`id,title,authors,publisher,publish_year,language,format,isbn13,tags,collections,projects,location,status,notes,cover_image,added_at,updated_at`

## CSV import/export

- Import validates the header against the schema contract before writing to IndexedDB.
- Export writes the current IndexedDB library to a CSV using the same schema order so it can replace `library.csv`.

## Data storage

All data is stored locally in IndexedDB (Dexie database `libraryDB`).

## Reset local data

Use the **Reset local database** button on the Import/Export page to clear IndexedDB.
