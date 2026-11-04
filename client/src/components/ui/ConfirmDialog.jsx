import { Alert } from './Alert.jsx';
import { Button } from './Button.jsx';
import { Dialog, DialogBody, DialogFooter } from './Dialog.jsx';

// "Are you sure?" for actions that can't be undone.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Delete',
  pending = false,
  error,
}) {
  return (
    <Dialog open={open} onClose={pending ? () => {} : onClose} title={title}>
      <DialogBody className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        {children}
        {error && <Alert>{error.message}</Alert>}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={pending}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
