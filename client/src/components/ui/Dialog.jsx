import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

// Built on the browser's <dialog> element, which already keeps keyboard focus
// inside, closes on Esc and makes the page behind it inert.
// Phones: a sheet that rises from the bottom. Larger screens: centred.
// Content is only rendered while open, so forms start fresh every time.
export function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first button (Close), which would override
      // React's autoFocus. Mark the field to start in with data-autofocus.
      dialog.querySelector('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc: let React state decide, so the dialog and `open` never disagree.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Tapping the dark backdrop closes it, but not a text selection that
      // started inside the dialog and was released outside.
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === ref.current;
      }}
      onClick={(event) => {
        if (pressStartedOnBackdrop.current && event.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50 sm:m-auto sm:max-w-lg sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-4">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

// Scrolls when the content is taller than the screen; the footer stays put.
export function DialogBody({ children, className = '' }) {
  return <div className={`min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2 ${className}`}>{children}</div>;
}

export function DialogFooter({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 dark:border-slate-800">
      {children}
    </div>
  );
}
