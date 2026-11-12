import { CircleHelp, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router';
import { useLogout, useMe } from '../../features/auth/useAuth.js';
import { ThemeToggle } from '../../features/theme/ThemeToggle.jsx';
import { Logo } from '../ui/Logo.jsx';
import { NAV_ITEMS } from './navItems.js';

// Shared by the expand/collapse animation in AppShell so both move together.
export const SIDEBAR_MOTION = 'duration-300 ease-in-out motion-reduce:transition-none';

const ROW =
  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600';
const IDLE =
  'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';
const ACTIVE = 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200';

const navClass = ({ isActive }) => `${ROW} ${isActive ? ACTIVE : IDLE}`;

// The text next to each icon. It stays in the page when the sidebar is
// collapsed (so screen readers still hear "Budgets"), it just fades out and is
// clipped by the narrow sidebar.
function Label({ collapsed, children }) {
  return (
    <span
      className={`whitespace-nowrap transition-opacity ${SIDEBAR_MOTION} ${collapsed ? 'opacity-0' : 'opacity-100'}`}
    >
      {children}
    </span>
  );
}

// Desktop / large-tablet navigation (hidden below the lg breakpoint).
// Collapsed, it becomes a narrow rail of icons; hovering an icon shows its name.
export function Sidebar({ collapsed = false, onToggle }) {
  const { data: user } = useMe();
  const logout = useLogout();
  const tip = (label) => (collapsed ? label : undefined);

  return (
    <aside
      id="sidebar"
      className={`fixed inset-y-0 left-0 z-20 hidden flex-col overflow-x-hidden overflow-y-auto [scrollbar-width:thin] border-r border-slate-200 bg-white px-4 py-6 transition-[width] lg:flex dark:border-slate-800 dark:bg-slate-900 ${SIDEBAR_MOTION} ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <Logo
        className="px-2"
        textClassName={`whitespace-nowrap transition-opacity ${SIDEBAR_MOTION} ${collapsed ? 'opacity-0' : 'opacity-100'}`}
      />

      <nav aria-label="Main" className="mt-8 flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} title={tip(label)} className={navClass}>
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <Label collapsed={collapsed}>{label}</Label>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 space-y-1">
        <NavLink to="/guide" title={tip('Quick guide')} className={navClass}>
          <CircleHelp className="size-5 shrink-0" aria-hidden="true" />
          <Label collapsed={collapsed}>Quick guide</Label>
        </NavLink>
        <button
          type="button"
          onClick={onToggle}
          aria-controls="sidebar"
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`${ROW} ${IDLE}`}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5 shrink-0" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-5 shrink-0" aria-hidden="true" />
          )}
          <Label collapsed={collapsed}>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</Label>
        </button>
      </div>

      <div className="mt-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className={`min-w-0 pl-2 ${collapsed ? 'hidden' : ''}`} title={user ? `${user.name}\n${user.email}` : undefined}>
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <ThemeToggle className="shrink-0" />
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          title={tip('Log out')}
          className={`mt-2 ${ROW} ${IDLE}`}
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          <Label collapsed={collapsed}>Log out</Label>
        </button>
      </div>
    </aside>
  );
}
