import {
  ArrowRight,
  ChartColumn,
  DatabaseBackup,
  FileUp,
  PiggyBank,
  Plus,
  Settings,
  Smartphone,
  Target,
} from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

// A short tutorial: the few things to do first, in order, each with a button
// that goes straight there. The full manual is docs/USER_GUIDE.md.
const STEPS = [
  {
    icon: Settings,
    title: 'Set up once',
    text: 'Check your currency and time zone, and enter your opening balance: the money you have today (it can be negative, e.g. a credit-card balance). Then your balance is right from day one.',
    to: '/settings',
    action: 'Open Settings',
  },
  {
    icon: Plus,
    title: 'Add your income and expenses',
    text: 'Use the round + button (phone) or "Add transaction". Choose Expense or Income, type the amount (use a dot for decimals: 99.50), pick a category and save. Add a note like "Swiggy dinner": you can search notes later.',
    to: '/transactions?add=1',
    action: 'Add a transaction',
  },
  {
    icon: PiggyBank,
    title: 'Record money you save as an expense in Savings',
    text: 'Moving money to savings, an SIP or FD? Add it as an expense in the Savings or Investments category. It is counted as saved, not spent, so your spending stays honest.',
  },
  {
    icon: Target,
    title: 'Set monthly budgets',
    text: 'Give the categories you want to control a monthly limit. Bars turn amber at 80% and red when you go over. Next month, copy last month\'s budgets with one button.',
    to: '/budgets',
    action: 'Set budgets',
  },
  {
    icon: ChartColumn,
    title: 'See where your money goes',
    text: 'The Dashboard shows this month at a glance. Reports cover any month, year or date range, by category and payment method, and can be downloaded or printed (choose "Save as PDF" as the printer).',
    to: '/reports',
    action: 'Open Reports',
  },
  {
    icon: FileUp,
    title: 'Bring in past transactions (optional)',
    text: 'Download a CSV statement from your bank and import it. You check every row before anything is saved, rows you already have are skipped, and one button undoes the whole import.',
    to: '/transactions/import',
    action: 'Import a CSV',
  },
  {
    icon: Smartphone,
    title: 'Install it on your phone',
    text: 'Android: Settings → Install app. iPhone: in Safari tap Share → Add to Home Screen. It opens like an app, and long-pressing the icon (Android) offers "Add transaction".',
    to: '/settings',
    action: 'Install',
  },
  {
    icon: DatabaseBackup,
    title: 'Download a backup every month',
    text: 'Settings → Your data → download the backup and the CSV, and keep them somewhere safe (e.g. Google Drive). The free database has no automatic backups.',
    to: '/settings',
    action: 'Back up now',
  },
];

const TIPS = [
  ['Edit or delete', 'Tap any transaction to edit or delete it.'],
  ['Find something', 'Transactions → search the notes, or filter by type, category, payment method and dates.'],
  ['Dig into a number', 'Select a category or a month on the Dashboard or in Reports to see exactly which transactions make it up.'],
  ['Look at another month', 'Use the ‹ › arrows next to the month name.'],
  ['Dark mode', 'The ☀/🌙 button switches Light, Dark or System.'],
  ['Forgot your password?', 'Use "Forgot password?" on the login page to get a reset link by email.'],
  ['Shared or lost phone?', 'Settings → Log out of all devices.'],
  ['Never type bank details', 'The app only needs amounts, dates, categories and notes. No bank passwords, card numbers, PINs or CVVs, ever.'],
];

export default function GuidePage() {
  useDocumentTitle('Quick guide');

  return (
    <>
      <PageHeader
        title="Quick guide"
        description="Eight steps to get the most out of Finance Tracker. Takes about 5 minutes."
      />

      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card className="flex gap-4">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-teal-700 text-sm font-semibold text-white dark:bg-teal-600">
                  {i + 1}
                </span>
                <step.icon className="size-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{step.title}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.text}</p>
                {step.to && (
                  <Link to={step.to} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'mt-3' })}>
                    {step.action}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">Good to know</h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {TIPS.map(([title, text]) => (
            <div key={title}>
              <dt className="font-medium">{title}</dt>
              <dd className="text-slate-600 dark:text-slate-300">{text}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
