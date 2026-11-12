import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { resetPassword } from '../../api/auth.js';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PasswordField } from '../../components/ui/PasswordField.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { fieldErrors } from '../../lib/errors.js';
import { clearPrivateData, ME_KEY, queryClient } from '../../lib/queryClient.js';
import { AuthLayout, linkClasses } from './AuthLayout.jsx';

const newLinkAction = (
  <Link to="/forgot-password" className={linkClasses}>
    Send me a new link
  </Link>
);

// Opened from the emailed link: /reset-password?token=…
// Works whether or not someone is logged in on this browser.
export default function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const urlToken = params.get('token');
  const token = urlToken ?? location.state?.token ?? '';

  // Move the token out of the address bar (and so out of the browser
  // history and anything copied from the address bar). It is kept in the
  // page's history state, so a refresh still works.
  useEffect(() => {
    if (urlToken) navigate('/reset-password', { replace: true, state: { token: urlToken } });
  }, [urlToken, navigate]);

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [localErrors, setLocalErrors] = useState({});
  const save = useMutation({
    mutationFn: resetPassword,
    onSuccess: (message) => {
      // The server ended every session, including any on this browser.
      clearPrivateData();
      queryClient.setQueryData(ME_KEY, null);
      navigate('/login', { replace: true, state: { message } });
    },
  });
  const serverErrors = fieldErrors(save.error);
  const errors = { ...serverErrors, ...localErrors };
  // A problem with the link itself (expired, used, made up), not the password.
  const linkProblem = save.error && !serverErrors.password ? save.error.message : null;

  function handleSubmit(event) {
    event.preventDefault();
    const problems = {};
    if (form.password.length < 10) problems.password = 'Password must be at least 10 characters.';
    else if (form.password !== form.confirm) problems.confirm = "The two passwords don't match.";
    setLocalErrors(problems);
    if (Object.keys(problems).length === 0) save.mutate({ token, password: form.password });
  }

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const footer = (
    <>
      Remembered it?{' '}
      <Link to="/login" className={linkClasses}>
        Back to log in
      </Link>
    </>
  );

  if (!token) {
    return (
      <AuthLayout title="Choose a new password" footer={footer}>
        <Alert title="This link is incomplete." action={newLinkAction}>
          Open the link from the email again, or ask for a new one.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="After this, every device will be logged out and you can log in with the new password."
      footer={footer}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {linkProblem && (
          <Alert title={linkProblem} action={newLinkAction}>
            Links work once, for 30 minutes, and only the newest one.
          </Alert>
        )}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 10 characters. A short sentence is easy to remember and hard to guess."
        />
        <PasswordField
          label="Type it again"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />
        <Button type="submit" loading={save.isPending} className="w-full">
          Change password
        </Button>
      </form>
    </AuthLayout>
  );
}
