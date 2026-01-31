import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import LibrarySwitcher from './components/LibrarySwitcher';
import InkButton from './components/ui/InkButton';
import InkPanel from './components/ui/InkPanel';
import Type from './components/ui/Type';
import AppShell from './layout/AppShell';
import { AppRoutes } from './routes';
import type { LibraryDefinition, MultiCategoryMode } from './types/library';
import { useLibrary } from './state/libraryStore';
import { cn } from './utils/cn';
import { focusRing, inputBase, selectBase } from './styles/ui';

const App = () => {
  const {
    appState,
    activeLayout,
    setActiveLibraryId,
    resetFromCsv,
    exportCsv,
    exportJson,
    importCsv,
    importJson,
    createLibrary,
    updateBook,
  } = useLibrary();
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem('gnosis_auth_token'),
  );
  const [authUser, setAuthUser] = useState<string | null>(() =>
    localStorage.getItem('gnosis_auth_user'),
  );
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBookcaseId, setSelectedBookcaseId] = useState<string | null>(null);
  const [showCreateLibrary, setShowCreateLibrary] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [newLibraryField, setNewLibraryField] = useState<LibraryDefinition['categorize']>(
    'Primary_Shelf',
  );
  const [newLibraryMode, setNewLibraryMode] = useState<MultiCategoryMode>('duplicate');
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const data = (await response.json()) as { token?: string; user?: { email?: string } };
      if (!data.token) {
        throw new Error('Missing token');
      }
      setAuthToken(data.token);
      const nextUser = data.user?.email ?? authEmail;
      setAuthUser(nextUser);
      localStorage.setItem('gnosis_auth_token', data.token);
      localStorage.setItem('gnosis_auth_user', nextUser);
      setAuthEmail('');
      setAuthPassword('');
    } catch {
      setAuthError('Unable to sign in. Check your credentials or backend status.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Ignore network errors on logout.
      }
    }
    setAuthToken(null);
    setAuthUser(null);
    localStorage.removeItem('gnosis_auth_token');
    localStorage.removeItem('gnosis_auth_user');
  };

  if (!authToken) {
    return (
      <main className="min-h-screen bg-paper px-6 py-16 text-ink">
        <div className="mx-auto flex max-w-md flex-col gap-6">
          <div className="text-center">
            <Type as="h1" variant="display">
              GNOSIS
            </Type>
            <Type as="p" variant="meta" className="mt-2 text-ink/70">
              Sign in to your library backend
            </Type>
          </div>
          <InkPanel padding="lg" className="space-y-5">
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Type as="label" htmlFor="auth-email" variant="label">
                  Email
                </Type>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  className={cn(inputBase, focusRing, 'w-full')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Type as="label" htmlFor="auth-password" variant="label">
                  Password
                </Type>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete="current-password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  className={cn(inputBase, focusRing, 'w-full')}
                  required
                />
              </div>
              {authError ? (
                <Type as="p" variant="meta" className="text-red-600">
                  {authError}
                </Type>
              ) : null}
              <InkButton type="submit" variant="primary" disabled={authLoading}>
                {authLoading ? 'Signing in…' : 'Sign in'}
              </InkButton>
            </form>
            <Type as="p" variant="meta" className="text-ink/60">
              Demo login: admin@example.com / gnosis
            </Type>
          </InkPanel>
        </div>
      </main>
    );
  }

  if (!appState || !activeLayout) {
    return (
      <main className="min-h-screen bg-paper px-6 py-12 text-ink">
        <Type as="p" variant="label">
          Loading library...
        </Type>
      </main>
    );
  }

  const handleCloseDetail = () => {
    setSelectedBookId(null);
    setSelectedBookcaseId(null);
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setSelectedBookcaseId(null);
  };

  const handleSelectBookInBookcase = (bookId: string, bookcaseId: string) => {
    setSelectedBookId(bookId);
    setSelectedBookcaseId(bookcaseId);
  };

  const handleCreateLibrary = () => {
    const didCreate = createLibrary({
      name: newLibraryName,
      categorize: newLibraryField,
      mode: newLibraryMode,
    });
    if (!didCreate) {
      return;
    }
    setNewLibraryName('');
    setNewLibraryField('Primary_Shelf');
    setNewLibraryMode('duplicate');
    setShowCreateLibrary(false);
  };

  const tools = (
    <div className="flex flex-wrap items-center gap-3">
      {authUser ? (
        <Type as="span" variant="meta" className="text-ink/70">
          Signed in as {authUser}
        </Type>
      ) : null}
      <InkButton variant="ghost" onClick={handleLogout}>
        Log out
      </InkButton>
      <InkButton onClick={() => csvInputRef.current?.click()}>Import CSV</InkButton>
      <InkButton onClick={() => jsonInputRef.current?.click()}>Import JSON</InkButton>
      <InkButton onClick={exportCsv}>Export CSV</InkButton>
      <InkButton onClick={exportJson}>Export JSON</InkButton>
      <InkButton onClick={resetFromCsv}>Reset to CSV</InkButton>
      <InkButton
        onClick={() => setShowCreateLibrary((prev) => !prev)}
        variant={showCreateLibrary ? 'primary' : 'ghost'}
      >
        Create Library
      </InkButton>
    </div>
  );

  const createLibraryForm = showCreateLibrary ? (
    <InkPanel padding="md" className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Type as="label" htmlFor="new-library-name" variant="label">
            Name
          </Type>
          <input
            id="new-library-name"
            value={newLibraryName}
            onChange={(event) => setNewLibraryName(event.target.value)}
            className={cn(inputBase, focusRing, 'min-w-[220px]')}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Type as="label" htmlFor="new-library-field" variant="label">
            Categorize
          </Type>
          <select
            id="new-library-field"
            value={newLibraryField}
            onChange={(event) =>
              setNewLibraryField(event.target.value as LibraryDefinition['categorize'])
            }
            className={cn(selectBase, focusRing, 'min-w-[200px]')}
          >
            <option value="Primary_Shelf">Primary Shelf</option>
            <option value="Format">Format</option>
            <option value="Language">Language</option>
            <option value="Source">Source</option>
            <option value="Use_Status">Status</option>
            <option value="Tags">Tags</option>
          </select>
        </div>
        {newLibraryField === 'Tags' ? (
          <div className="flex flex-col gap-2">
            <Type as="label" htmlFor="new-library-mode" variant="label">
              Tag Mode
            </Type>
            <select
              id="new-library-mode"
              value={newLibraryMode}
              onChange={(event) => setNewLibraryMode(event.target.value as MultiCategoryMode)}
              className={cn(selectBase, focusRing, 'min-w-[160px]')}
            >
              <option value="duplicate">Duplicate</option>
              <option value="first">First</option>
              <option value="split">Split</option>
            </select>
          </div>
        ) : null}
        <InkButton variant="primary" onClick={handleCreateLibrary}>
          Add Library
        </InkButton>
      </div>
    </InkPanel>
  ) : null;

  return (
    <AppShell
      title="GNOSIS"
      subtitle="Library"
      librarySwitcher={
        <LibrarySwitcher
          libraries={appState.libraries}
          activeLibraryId={appState.activeLibraryId}
          onChange={(libraryId) => {
            setActiveLibraryId(libraryId);
            handleCloseDetail();
          }}
        />
      }
      tools={tools}
      createLibraryForm={createLibraryForm}
    >
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            importCsv(file);
          }
          event.target.value = '';
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            importJson(file);
          }
          event.target.value = '';
        }}
      />

      <AppRoutes
        selectedBookId={selectedBookId}
        selectedBookcaseId={selectedBookcaseId}
        onSelectBook={handleSelectBook}
        onSelectBookInBookcase={handleSelectBookInBookcase}
        onCloseDetail={handleCloseDetail}
        onUpdateBook={updateBook}
      />
    </AppShell>
  );
};

export default App;
