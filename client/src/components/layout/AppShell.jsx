import { CircleHelp } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { ThemeToggle } from '../../features/theme/ThemeToggle.jsx';
import { Logo } from '../ui/Logo.jsx';
import { BottomNav } from './BottomNav.jsx';
import { OfflineBanner } from './OfflineBanner.jsx';
import { Sidebar } from './Sidebar.jsx';

// Layout for every logged-in page: sidebar on desktop, header + bottom bar on phones.
export function AppShell() {
  return (
    <div className="min-h-dvh">
      <a
        data-print="hide"
        href="#main"
        className="sr-only z-50 rounded-lg bg-teal-700 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <div data-print="hide">
        <Sidebar />
      </div>

      <div className="lg:pl-64" data-print="flush">
        <header data-print="hide" className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
          <Logo />
          <div className="flex items-center gap-1">
            <Link
              to="/guide"
              aria-label="Quick guide"
              className="inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <CircleHelp className="size-5" aria-hidden="true" />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div data-print="hide">
          <OfflineBanner />
        </div>

        {/* Bottom padding keeps content above the phone navigation bar. */}
        <main id="main" data-print="flush" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>

      <div data-print="hide">
        <BottomNav />
      </div>
    </div>
  );
}
