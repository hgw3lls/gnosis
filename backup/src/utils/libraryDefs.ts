import type { LibraryDefinition } from '../types/library';

export const defaultLibraries: LibraryDefinition[] = [
  { id: 'library-primary', name: 'By Primary_Shelf', categorize: 'Primary_Shelf' },
  { id: 'library-format', name: 'By Format', categorize: 'Format' },
  { id: 'library-language', name: 'By Language', categorize: 'Language' },
  { id: 'library-source', name: 'By Source', categorize: 'Source' },
  { id: 'library-status', name: 'By Status', categorize: 'Use_Status' },
  {
    id: 'library-tags',
    name: 'By Tags',
    categorize: 'Tags',
    multiCategoryMode: 'duplicate',
  },
];
