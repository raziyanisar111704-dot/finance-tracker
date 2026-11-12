import { ArrowRight, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { GUIDE_STEPS as STEPS, GUIDE_TIPS as TIPS } from './guideContent.js';
import { QuickTour } from './QuickTour.jsx';

export default function GuidePage() {
  useDocumentTitle('Quick guide');
  const [touring, setTouring] = useState(false);

  return (
    <>
      <PageHeader
        title="Quick guide"
        description="Eight steps to get the most out of Finance Tracker. Takes about 5 minutes."
        actions={
          <Button onClick={() => setTouring(true)}>
            <PlayCircle className="size-4" aria-hidden="true" />
            Take the tour
          </Button>
        }
      />
      <QuickTour open={touring} onClose={() => setTouring(false)} />

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
