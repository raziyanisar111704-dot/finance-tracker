import { LogOut } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardTitle } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useLogout, useLogoutAllDevices, useMe } from '../auth/useAuth.js';
import { THEME_OPTIONS } from '../theme/ThemeToggle.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-medium has-checked:border-teal-600 has-checked:bg-teal-50 has-checked:text-teal-800 has-focus-visible:outline-2 has-focus-visible:outline-teal-600 dark:border-slate-700 dark:has-checked:bg-teal-950 dark:has-checked:text-teal-200"
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { data: user } = useMe();
  const logout = useLogout();
  const logoutAll = useLogoutAllDevices();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle description="Editing these arrives in step 4.4.">Account</CardTitle>
          <dl className="divide-y divide-slate-200 dark:divide-slate-800">
            <Detail label="Name" value={user.name} />
            <Detail label="Email" value={user.email} />
            <Detail label="Currency" value={user.currency} />
            <Detail label="Time zone" value={user.timezone} />
          </dl>
        </Card>

        <Card>
          <CardTitle description="Choose how the app looks on this device.">Appearance</CardTitle>
          <ThemePicker />
        </Card>

        <Card>
          <CardTitle description="Logging out removes your data from this browser's memory.">Sessions</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => logout.mutate()} loading={logout.isPending}>
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </Button>
            <Button variant="secondary" onClick={() => logoutAll.mutate()} loading={logoutAll.isPending}>
              Log out of all devices
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
