import { CircleHelp, LogOut } from 'lucide-react';
import { NavLink } from 'react-router';
import { useLogout, useMe } from '../../features/auth/useAuth.js';
import { ThemeToggle } from '../../features/theme/ThemeToggle.jsx';
import { Logo } from '../ui/Logo.jsx';
import { NAV_ITEMS } from './navItems.js';

// Desktop / large-tablet navigation (hidden below the lg breakpoint).
export function Sidebar() {
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex dark:border-slate-800 dark:bg-slate-900">
      <Logo className="px-2" />

      <nav aria-label="Main" className="mt-8 flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <NavLink
        to="/guide"
        className={({ isActive }) =>
          `mb-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
            isActive
              ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          }`
        }
      >
        <CircleHelp className="size-5" aria-hidden="true" />
        Quick guide
      </NavLink>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <LogOut className="size-5" aria-hidden="true" />
          Log out
        </button>
      </div>
    </aside>
  );
}
