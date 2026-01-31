import type { ReactNode } from 'react';
import FiltersBar from '../components/FiltersBar';
import ModeSwitch from '../components/ModeSwitch';
import InkPanel from '../components/ui/InkPanel';
import Type from '../components/ui/Type';
import { cn } from '../utils/cn';

type AppShellProps = {
  title: string;
  subtitle?: string;
  librarySwitcher?: ReactNode;
  tools?: ReactNode;
  createLibraryForm?: ReactNode;
  drawer?: ReactNode;
  children: ReactNode;
};

const AppShell = ({
  title,
  subtitle,
  librarySwitcher,
  tools,
  createLibraryForm,
  drawer,
  children,
}: AppShellProps) => (
  <div className={cn('min-h-screen bg-paper text-ink')}>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <Type as="h1" variant="h1">
              {title}
            </Type>
            {subtitle ? (
              <Type as="p" variant="label">
                {subtitle}
              </Type>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ModeSwitch />
            {librarySwitcher}
          </div>
        </div>
        <FiltersBar />
        {tools ? <InkPanel padding="md">{tools}</InkPanel> : null}
        {createLibraryForm}
      </header>
      <div className="flex flex-col gap-6 lg:flex-row">
        <main className="flex-1">{children}</main>
        {drawer ? <aside className="w-full max-w-sm">{drawer}</aside> : null}
      </div>
    </div>
  </div>
);

export default AppShell;
