import { FormEvent, useRef, useState } from 'react';
import { AuthUser, authRequest } from './auth-api';

export default function AuthForm({ change = false, onSuccess, onLogout }: { change?: boolean; onSuccess: (user: AuthUser) => void; onLogout?: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const form = useRef<HTMLFormElement>(null);
  const fields = change ? [['currentPassword', 'Current password'], ['newPassword', 'New password'], ['confirmPassword', 'Confirm new password']] : [['email', 'Email address'], ['password', 'Password']];
  function focusInvalid(next: Record<string, string>) { requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>(`[name="${Object.keys(next)[0]}"]`)?.focus()); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const next: Record<string, string> = {};
    for (const [key, label] of fields) if (!values[key]) next[key] = `Enter your ${label.toLowerCase()}.`;
    if (!change && values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'Enter a valid email address.';
    if (change) {
      const length = Array.from(values.newPassword ?? '').length;
      if (length < 15 || length > 128 || !(values.newPassword ?? '').trim()) next.newPassword = 'Use a passphrase containing 15 to 128 characters.';
      if (values.newPassword !== values.confirmPassword) next.confirmPassword = 'Passwords must match.';
      if (values.newPassword === values.currentPassword) next.newPassword = 'Choose a password different from your current one.';
    }
    setErrors(next); setMessage('');
    if (Object.keys(next).length) { focusInvalid(next); return; }
    setBusy(true);
    try {
      const result = await authRequest(change ? 'change-password' : 'login', values);
      setValues({}); onSuccess(result.user);
    } catch (error) {
      const failure = error as Error & { fields?: Record<string, string> };
      setMessage(failure.message); if (failure.fields) { setErrors(failure.fields); focusInvalid(failure.fields); }
    } finally { setBusy(false); }
  }
  return <main className="auth-page">
    <a className="auth-brand" href="/login"><i className="bi bi-ticket-perforated" aria-hidden="true" /> TokTickIT</a>
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-symbol"><i className={change ? 'bi bi-key' : 'bi bi-shield-check'} aria-hidden="true" /></div>
      <p className="eyebrow">YOUR IT SUPPORT, IN ONE PLACE</p>
      <h1 id="auth-title">{change ? 'Choose your new password' : 'Sign in to TokTickIT'}</h1>
      <p className="auth-intro">{change ? 'Set a personal password to keep your account secure and continue to TokTickIT.' : 'Sign in to track requests and keep work moving.'}</p>
      {message && <div className="auth-error" role="alert">{message}</div>}
      <form ref={form} onSubmit={submit} noValidate aria-busy={busy}>
        {fields.map(([key, label]) => <div className="auth-field" key={key}>
          <label htmlFor={`auth-${key}`}>{label}</label>
          <div className="auth-input-wrap">
            <input id={`auth-${key}`} name={key} required type={key === 'email' ? 'email' : visible[key] ? 'text' : 'password'} autoComplete={key === 'email' ? 'username' : key === 'password' || key === 'currentPassword' ? 'current-password' : 'new-password'} value={values[key] ?? ''} onChange={(e) => setValues({ ...values, [key]: e.target.value })} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : key === 'newPassword' ? 'password-rules' : undefined} disabled={busy} />
            {key !== 'email' && <button className="password-toggle" type="button" aria-label={`${visible[key] ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setVisible({ ...visible, [key]: !visible[key] })}><i className={visible[key] ? 'bi bi-eye-slash' : 'bi bi-eye'} aria-hidden="true" /></button>}
          </div>
          {errors[key] && <p className="field-error" id={`${key}-error`}>{errors[key]}</p>}
          {key === 'newPassword' && <p className="auth-hint" id="password-rules">15–128 characters. Spaces and long passphrases are welcome.</p>}
        </div>)}
        <button className="auth-submit" disabled={busy} type="submit">{busy ? change ? 'Saving password…' : 'Signing in…' : change ? 'Save password and continue' : 'Sign in'}<i className="bi bi-arrow-right" aria-hidden="true" /></button>
        {busy && <span className="visually-hidden" role="status">Please wait</span>}
      </form>
      {change && onLogout ? <button className="auth-back" onClick={onLogout} type="button">Sign out</button> : <p className="auth-help">Need access? Contact your administrator.</p>}
    </section>
    <p className="auth-footer"><i className="bi bi-lock" aria-hidden="true" /> A dedicated space for your support requests</p>
  </main>;
}
