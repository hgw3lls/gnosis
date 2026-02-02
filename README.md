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

## CSV import/export

- The app treats `./library.csv` as the source of truth for the schema and column order.
- Import requires a CSV that matches the exact schema header and order.
- Export writes the current IndexedDB library to a CSV using the same schema order so it can replace `library.csv` if desired.

## Canonical schema

`id,title,authors,publisher,publish_year,language,format,isbn13,tags,collections,projects,location,status,notes,cover_image,added_at,updated_at`
