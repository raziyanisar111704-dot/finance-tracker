import { Outlet } from 'react-router';
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
        href="#main"
        className="sr-only z-50 rounded-lg bg-teal-700 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <Sidebar />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
          <Logo />
          <ThemeToggle />
        </header>
        <OfflineBanner />

        {/* Bottom padding keeps content above the phone navigation bar. */}
        <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
