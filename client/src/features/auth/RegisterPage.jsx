import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PasswordField } from '../../components/ui/PasswordField.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { fieldErrors } from '../../lib/errors.js';
import { AuthLayout, linkClasses } from './AuthLayout.jsx';
import { useRegister } from './useAuth.js';

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const register = useRegister();
  const errors = fieldErrors(register.error);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  function handleSubmit(event) {
    event.preventDefault();
    register.mutate(form);
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Track income, spending and budgets on every device."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className={linkClasses}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {register.error && Object.keys(errors).length === 0 && <Alert>{register.error.message}</Alert>}
        <TextField
          label="Name"
          autoComplete="name"
          required
          value={form.name}
          onChange={update('name')}
          error={errors.name}
        />
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
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 10 characters. A short sentence is easy to remember and hard to guess."
        />
        <Button type="submit" loading={register.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
