import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError('');
  };

  return (
    <main className="auth">
      <div className="auth-intro">
        <h1 className="wordmark">Sweety</h1>
        <p>Log up to four glucose readings a day and see how your numbers move across the month.</p>
      </div>

      <form className="auth-form" onSubmit={submit} noValidate>
        <h2>{isRegister ? 'Create your account' : 'Log in'}</h2>

        {isRegister && (
          <label>
            Name
            <input value={form.name} onChange={update('name')} autoComplete="name" />
          </label>
        )}
        {isRegister && (
          <fieldset className="role-choice">
            <legend>I am a…</legend>
            <label className="radio">
              <input
                type="radio"
                name="role"
                value="patient"
                checked={form.role === 'patient'}
                onChange={update('role')}
              />
              Patient
            </label>
            <label className="radio">
              <input
                type="radio"
                name="role"
                value="doctor"
                checked={form.role === 'doctor'}
                onChange={update('role')}
              />
              Doctor
            </label>
          </fieldset>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
          {isRegister && <span className="hint">At least 8 characters.</span>}
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="primary" disabled={busy}>
          {isRegister ? 'Create account' : 'Log in'}
        </button>
        <button type="button" className="link" onClick={switchMode}>
          {isRegister ? 'I already have an account' : 'I need an account'}
        </button>
      </form>
    </main>
  );
}
