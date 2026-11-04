import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider.jsx';

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

// Compact button that cycles Light → Dark → System.
export function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const index = THEME_OPTIONS.findIndex((option) => option.value === theme);
  const current = THEME_OPTIONS[index];
  const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next.value)}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
      title={`Theme: ${current.label}`}
      className={`inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
