export type CategorizeField =
  | 'Primary_Shelf'
  | 'Format'
  | 'Language'
  | 'Source'
  | 'Use_Status'
  | 'Tags';

export type MultiCategoryMode = 'duplicate' | 'first' | 'split';

export type Book = {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  language?: string;
  format?: string;
  confidence?: string;
  notes?: string;
  publishYear?: string;
  pageCount?: string;
  subjects?: string[];
  tags?: string[];
  useStatus?: string;
  source?: string;
  isbn13?: string;
  olid?: string;
  coverS?: string;
  coverM?: string;
  coverL?: string;
  primaryShelf?: string;
  locationBookcase: string;
  locationShelf: number;
  locationPosition: number;
  locationNote?: string;
  raw: Record<string, string>;
};

export type Shelf = {
  id: string;
  bookIds: string[];
};

export type BookcaseSettings = {
  shelfCount: number;
  shelfLabels?: string[];
};

export type Bookcase = {
  id: string;
  name: string;
  shelfIds: string[];
  settings: BookcaseSettings;
};

export type LibraryDefinition = {
  id: string;
  name: string;
  categorize: CategorizeField;
  multiCategoryMode?: MultiCategoryMode;
};

export type LibraryLayout = {
  libraryId: string;
  bookcases: Bookcase[];
  shelvesById: Record<string, Shelf>;
  placementOverrides: Record<string, string>;
};

export type AppState = {
  booksById: Record<string, Book>;
  rowOrder: string[];
  libraries: LibraryDefinition[];
  layoutsByLibraryId: Record<string, LibraryLayout>;
  activeLibraryId: string;
  csvColumns: string[];
};

export type DragPayload = {
  bookId: string;
  fromShelfId: string;
  fromIndex: number;
};
