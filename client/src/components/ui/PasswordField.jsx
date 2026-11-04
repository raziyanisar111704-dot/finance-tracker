import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { TextField } from './TextField.jsx';

export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <TextField
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <Icon className="size-5" aria-hidden="true" />
        </button>
      }
      {...props}
    />
  );
}
