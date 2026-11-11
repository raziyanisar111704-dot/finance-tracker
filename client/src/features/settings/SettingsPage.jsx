import { ChevronRight, DatabaseBackup, Download, FileUp, LogOut, Share, Smartphone, Tags, Trash } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { downloadBackup, downloadTransactionsCsv } from '../../api/export.js';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button, buttonClasses } from '../../components/ui/Button.jsx';
import { Card, CardTitle } from '../../components/ui/Card.jsx';
import { Dialog, DialogBody, DialogFooter } from '../../components/ui/Dialog.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { PasswordField } from '../../components/ui/PasswordField.jsx';
import { SelectField } from '../../components/ui/SelectField.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { fieldErrors } from '../../lib/errors.js';
import { currencySymbol, minorToInputString, parseSignedAmount } from '../../lib/money.js';
import { isIos, useInstallPrompt } from '../../lib/pwa.js';
import { useDeleteAccount, useLogout, useLogoutAllDevices, useMe, useUpdateMe } from '../auth/useAuth.js';
import { THEME_OPTIONS } from '../theme/ThemeToggle.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

// All of these use 2 decimal places, like INR. Switching to a currency with a
// different number of decimals (e.g. JPY) would change what stored amounts mean.
const CURRENCIES = [
  { code: 'INR', name: 'Indian rupee' },
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' },
  { code: 'AED', name: 'UAE dirham' },
  { code: 'SGD', name: 'Singapore dollar' },
  { code: 'AUD', name: 'Australian dollar' },
  { code: 'CAD', name: 'Canadian dollar' },
];

// Browsers list some zones by their old names; show the current ones.
const RENAMED_ZONES = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Europe/Kiev': 'Europe/Kyiv',
};
const zoneName = (zone) => RENAMED_ZONES[zone] ?? zone;
const deviceZone = zoneName(Intl.DateTimeFormat().resolvedOptions().timeZone);

function useTimeZones(current) {
  return useMemo(() => {
    const zones = new Set((Intl.supportedValuesOf?.('timeZone') ?? []).map(zoneName));
    zones.add(current);
    zones.add(deviceZone);
    return [...zones].sort();
  }, [current]);
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

const formFromUser = (user) => ({
  name: user.name,
  currency: user.currency,
  timezone: user.timezone,
  openingBalance: user.openingBalanceMinor === 0 ? '' : minorToInputString(user.openingBalanceMinor, user.currency),
});

function ProfileForm({ user }) {
  const formId = useId();
  const update = useUpdateMe();
  const zones = useTimeZones(user.timezone);
  const [form, setForm] = useState(() => formFromUser(user));
  const [localErrors, setLocalErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const { openingBalanceMinor: balanceError, ...serverErrors } = fieldErrors(update.error);
  const errors = { ...serverErrors, ...(balanceError && { openingBalance: balanceError }), ...localErrors };
  const generalError = update.error && Object.keys(errors).length === 0 ? update.error.message : null;

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setLocalErrors({});
    setSaved(false);
    if (update.error) update.reset();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const balance = parseSignedAmount(form.openingBalance, form.currency);
    const problems = {};
    if (!name) problems.name = 'Enter your name.';
    if (balance.error) problems.openingBalance = balance.error;
    setLocalErrors(problems);
    if (Object.keys(problems).length > 0) return;

    const values = { name, currency: form.currency, timezone: form.timezone, openingBalanceMinor: balance.minor };
    const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== user[key]));
    if (Object.keys(changes).length === 0) return setSaved(true);
    update.mutate(changes, {
      onSuccess: (next) => {
        setForm(formFromUser(next));
        setSaved(true);
      },
    });
  }

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
      {generalError && <Alert>{generalError}</Alert>}
      {saved && <Alert tone="success">Your settings are saved.</Alert>}

      <TextField
        label="Name"
        autoComplete="name"
        maxLength={60}
        value={form.name}
        onChange={(event) => setField('name', event.target.value)}
        error={errors.name}
      />
      <TextField label="Email" value={user.email} readOnly disabled hint="Your email can't be changed yet." />

      <SelectField
        label="Currency"
        value={form.currency}
        onChange={(event) => setField('currency', event.target.value)}
        error={errors.currency}
        hint="Only changes how amounts are shown. Amounts are not converted."
      >
        {CURRENCIES.some((c) => c.code === user.currency) || (
          <option value={user.currency}>{user.currency}</option>
        )}
        {CURRENCIES.map(({ code, name }) => (
          <option key={code} value={code}>
            {currencySymbol(code)} {code} · {name}
          </option>
        ))}
      </SelectField>

      <div>
        <SelectField
          label="Time zone"
          value={form.timezone}
          onChange={(event) => setField('timezone', event.target.value)}
          error={errors.timezone}
          hint="Decides when a new day and month start, e.g. for “this month”."
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll('_', ' ')}
            </option>
          ))}
        </SelectField>
        {form.timezone !== deviceZone && (
          <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => setField('timezone', deviceZone)}>
            Use this device's time zone ({deviceZone.replaceAll('_', ' ')})
          </Button>
        )}
      </div>

      <TextField
        label={`Opening balance (${currencySymbol(form.currency)})`}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={form.openingBalance}
        onChange={(event) => setField('openingBalance', event.target.value)}
        error={errors.openingBalance}
        hint="What you had before your first transaction here. Use a minus sign if you were in debt."
      />

      <div className="flex justify-end">
        <Button type="submit" form={formId} loading={update.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

// Hidden when the app is already running installed.
function InstallCard() {
  const { canInstall, installed, install } = useInstallPrompt();
  if (installed) return null;

  return (
    <Card>
      <CardTitle description="Open it from your home screen like any other app, full screen and quicker to start.">
        Install the app
      </CardTitle>
      {canInstall ? (
        <Button onClick={install}>
          <Smartphone className="size-4" aria-hidden="true" />
          Install app
        </Button>
      ) : isIos() ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>Open this page in Safari.</li>
          <li>
            Tap <Share className="inline size-4 align-text-bottom" aria-hidden="true" /> Share.
          </li>
          <li>Choose “Add to Home Screen”, then “Add”.</li>
        </ol>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Open your browser's menu (⋮) and choose “Install app” or “Add to Home screen”. Chrome, Edge and Samsung
          Internet support it.
        </p>
      )}
    </Card>
  );
}

function DownloadButton({ label, icon: Icon, download }) {
  const [state, setState] = useState({ pending: false, error: null, name: null });
  async function handleClick() {
    setState({ pending: true, error: null, name: null });
    try {
      setState({ pending: false, error: null, name: await download() });
    } catch (error) {
      setState({ pending: false, error, name: null });
    }
  }
  return (
    <div>
      <Button variant="secondary" onClick={handleClick} loading={state.pending} className="w-full sm:w-auto">
        {!state.pending && <Icon className="size-4" aria-hidden="true" />}
        {label}
      </Button>
      {state.error && (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400" role="alert">
          {state.error.message}
        </p>
      )}
      {state.name && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400" role="status">
          Saved as {state.name}
        </p>
      )}
    </div>
  );
}

function DeleteAccountDialog({ open, onClose, email }) {
  const formId = useId();
  const remove = useDeleteAccount();
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const error = localError || fieldErrors(remove.error).password || remove.error?.message;

  function close() {
    if (remove.isPending) return;
    setPassword('');
    setLocalError('');
    remove.reset();
    onClose();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!password) return setLocalError('Enter your password to confirm.');
    // On success the user is logged out and the route guard opens the login page.
    remove.mutate(password);
  }

  return (
    <Dialog open={open} onClose={close} title="Delete your account?">
      <DialogBody className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <p>
          This permanently deletes <strong className="text-slate-900 dark:text-slate-100">{email}</strong> and every
          transaction, budget and category in it. It can't be undone.
        </p>
        <p>Download a backup first if you might want your data later.</p>
        <form id={formId} onSubmit={handleSubmit} noValidate>
          {/* Hidden username helps password managers fill the right password. */}
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <PasswordField
            label="Your password"
            autoComplete="current-password"
            data-autofocus
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setLocalError('');
              if (remove.error) remove.reset();
            }}
            error={error}
          />
        </form>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={close} disabled={remove.isPending}>
          Cancel
        </Button>
        <Button type="submit" form={formId} variant="danger" loading={remove.isPending}>
          Delete everything
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { data: user } = useMe();
  const logout = useLogout();
  const logoutAll = useLogoutAllDevices();
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <PageHeader title="Settings" />
      {/* First, so phones see it without scrolling past the account form. */}
      <div className="mb-6 empty:hidden">
        <InstallCard />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Account</CardTitle>
          <ProfileForm user={user} />
        </Card>

        <div className="space-y-6">
          <Card padded={false}>
            <Link
              to="/settings/categories"
              className="flex items-center gap-4 rounded-2xl p-5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <Tags className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Categories</span>
                <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                  Add, rename, recolour or archive your categories.
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
            </Link>
          </Card>

          <Card>
            <CardTitle description="Choose how the app looks on this device.">Appearance</CardTitle>
            <ThemePicker />
          </Card>

          <Card>
            <CardTitle description="Your data is yours. Reports also have a CSV download for one period.">
              Your data
            </CardTitle>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                  Every transaction, to open in Excel or Google Sheets.
                </p>
                <DownloadButton label="Download all transactions (CSV)" icon={Download} download={downloadTransactionsCsv} />
              </div>
              <div>
                <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                  A complete copy of your categories, transactions and budgets.
                </p>
                <DownloadButton label="Download backup (JSON)" icon={DatabaseBackup} download={downloadBackup} />
              </div>
              <div>
                <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                  Bring in transactions from a bank statement or a CSV downloaded from this app.
                </p>
                <Link to="/transactions/import" className={buttonClasses({ variant: 'secondary' })}>
                  <FileUp className="size-4" aria-hidden="true" />
                  Import from CSV
                </Link>
              </div>
            </div>
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

          <Card>
            <CardTitle description="Permanently delete your account and all of its data.">Delete account</CardTitle>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              <Trash className="size-4" aria-hidden="true" />
              Delete account
            </Button>
          </Card>
        </div>
      </div>

      <DeleteAccountDialog open={deleting} onClose={() => setDeleting(false)} email={user.email} />
    </>
  );
}
