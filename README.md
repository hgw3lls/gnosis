# Gnosis Library

A personal library management webapp. The canonical schema lives in `./public/library.csv` and must not be altered without explicit instruction.

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

Quality checks:

```bash
npm run typecheck
npm test
```

## Schema contract

The app treats `./public/library.csv` as the canonical schema. The header must match the exact order below:

`id,title,authors,publisher,publish_year,language,format,isbn13,tags,collections,projects,bookcase_id,shelf,position,status,notes,cover_image,added_at,updated_at`

## CSV import/export

- Import validates the header against the schema contract before writing to IndexedDB.
- Export writes the current IndexedDB library to a CSV using the same schema order so it can replace `library.csv`. The dev/build scripts copy it into `public/library.csv`.

## Data storage

All data is stored locally in IndexedDB (Dexie database `libraryDB`).

## Performance note

The library is designed to handle ~10k records; list view is virtualized for smooth scrolling.

## ISBN lookup usage

```ts
import { findIsbn13ByTitleAuthor } from "./src/services/isbnLookup";

const result = await findIsbn13ByTitleAuthor({
  title: "The Hobbit",
  author: "J.R.R. Tolkien",
});
console.log(result.isbn13, result.confidence);
```

Run the lightweight lookup script:

```bash
npm run isbn-lookup-test
```

## Reset local data

Use the **Reset local database** button on the Import/Export page to clear IndexedDB.


## INSTALL IOS
1) Prerequisites
Make sure you have:

macOS with Xcode installed

Node.js + npm

An Apple Developer account (for device testing and App Store builds)

2) Install Capacitor
From the repo root:

npm install --save-dev @capacitor/cli @capacitor/core
3) Initialize Capacitor
npx cap init "Gnosis Library" "com.yourorg.gnosis"
App name: Gnosis Library

App ID: must be a reverse‑DNS identifier (e.g., com.yourorg.gnosis)

4) Build the web app
Capacitor bundles the built assets:

npm run build
Make sure your Vite config outputs into the default dist/ folder (Capacitor expects this unless you override webDir).

5) Add iOS platform
npm install --save-dev @capacitor/ios
npx cap add ios
6) Copy web build into iOS project
npx cap copy ios
7) Open in Xcode
npx cap open ios
8) Configure Camera Permissions (Required for barcode scanning)
In Xcode, open ios/App/App/Info.plist and ensure:

<key>NSCameraUsageDescription</key>
<string>Scan book barcodes for ISBN lookup.</string>
9) Run on device
In Xcode:

Select your connected iPhone as the run target

Press Run

Note: iOS requires HTTPS or localhost for camera access. Capacitor runs your app in a native WebView, so HTTPS isn’t required when packaged.
