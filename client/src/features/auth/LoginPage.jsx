import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PasswordField } from '../../components/ui/PasswordField.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { fieldErrors } from '../../lib/errors.js';
import { AuthLayout, linkClasses } from './AuthLayout.jsx';
import { useLogin } from './useAuth.js';

export default function LoginPage() {
  useDocumentTitle('Log in');
  const [form, setForm] = useState({ email: '', password: '' });
  const login = useLogin();
  const errors = fieldErrors(login.error);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  function handleSubmit(event) {
    event.preventDefault();
    // On success, GuestOnly sees the user and redirects into the app.
    login.mutate(form);
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your finances."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className={linkClasses}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {login.error && Object.keys(errors).length === 0 && <Alert>{login.error.message}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <Button type="submit" loading={login.isPending} className="w-full">
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
