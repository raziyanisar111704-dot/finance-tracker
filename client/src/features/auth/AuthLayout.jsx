import { Card } from '../../components/ui/Card.jsx';
import { Logo } from '../../components/ui/Logo.jsx';
import { ThemeToggle } from '../theme/ThemeToggle.jsx';

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 flex-col items-center justify-center py-8">
        <Logo className="mb-8 text-lg" />
        <Card as="div" className="w-full max-w-sm p-6 sm:p-8">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </Card>
        {footer && <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">{footer}</p>}
      </main>
    </div>
  );
}

export const linkClasses =
  'font-medium text-teal-700 underline-offset-4 hover:underline dark:text-teal-400';
