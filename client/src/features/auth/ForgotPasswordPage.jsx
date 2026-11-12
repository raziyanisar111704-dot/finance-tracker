import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { requestPasswordReset } from '../../api/auth.js';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { fieldErrors } from '../../lib/errors.js';
import { AuthLayout, linkClasses } from './AuthLayout.jsx';

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const location = useLocation();
  // The login page passes on what was typed there.
  const [email, setEmail] = useState(location.state?.email ?? '');
  const send = useMutation({ mutationFn: requestPasswordReset });
  const errors = fieldErrors(send.error);

  function handleSubmit(event) {
    event.preventDefault();
    send.mutate(email);
  }

  const footer = (
    <>
      Remembered it?{' '}
      <Link to="/login" className={linkClasses}>
        Back to log in
      </Link>
    </>
  );

  if (send.isSuccess) {
    return (
      <AuthLayout title="Check your email" footer={footer}>
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <MailCheck className="size-10 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          <p role="status">{send.data}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>The email comes from Finance Tracker and can take a minute or two.</li>
            <li>
              Not there? Check <strong>Spam</strong> or <strong>Promotions</strong>, and that{' '}
              <strong>{email.trim()}</strong> is the address you signed up with.
            </li>
            <li>Only the newest link works. Asking again cancels the previous one.</li>
          </ul>
          <Button variant="secondary" onClick={() => send.reset()}>
            Send another link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter the email you signed up with. We'll send you a link to choose a new password."
      footer={footer}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {send.error && !errors.email && <Alert>{send.error.message}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <Button type="submit" loading={send.isPending} className="w-full">
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
