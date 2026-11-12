import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '../../components/ui/Button.jsx';
import { Dialog, DialogBody, DialogFooter } from '../../components/ui/Dialog.jsx';
import { GUIDE_STEPS } from './guideContent.js';

// The Quick guide one step at a time, in a dialog: Back / Next move through
// the steps; Esc, the close button or tapping outside ends it; following a
// step's button closes it and goes there. Never opens by itself.
export function QuickTour({ open, onClose }) {
  const [index, setIndex] = useState(0);
  const step = GUIDE_STEPS[index];
  const last = index === GUIDE_STEPS.length - 1;

  // The next tour starts from the beginning again.
  function close() {
    setIndex(0);
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="Quick tour">
      <DialogBody>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Step {index + 1} of {GUIDE_STEPS.length}
        </p>
        {/* Progress, for orientation only. */}
        <div aria-hidden="true" className="mb-5 mt-2 flex gap-1.5">
          {GUIDE_STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-teal-700 dark:bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`}
            />
          ))}
        </div>

        <div aria-live="polite" className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            <step.icon className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.text}</p>
            {step.to && (
              <Link
                to={step.to}
                onClick={close}
                className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'mt-3' })}
              >
                {step.action}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => setIndex(index - 1)} disabled={index === 0} className="mr-auto">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
        {last ? (
          <Button onClick={close}>Finish</Button>
        ) : (
          <Button onClick={() => setIndex(index + 1)}>
            Next
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
