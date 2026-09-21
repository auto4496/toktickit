import { FormEvent, useEffect, useRef, useState } from 'react';
import { AuthUser } from './auth-api';
import { ApiFailure, label, workflow } from './workflow-api';
import { Confirmation } from './WorkflowParts';
import './users.css';

export type ManagedUser = AuthUser & { isActive: boolean; version: number; createdAt: string; updatedAt: string };
type Draft = { name: string; email: string; role: AuthUser['role']; isActive: boolean };
const empty: Draft = { name: '', email: '', role: 'REQUESTER', isActive: true };
const roles = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as const;
const fieldsOf = (user: Draft): Draft => ({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
function PasswordFields({ password, confirm, setPassword, setConfirm, errors }: { password: string; confirm: string; setPassword: (v: string) => void; setConfirm: (v: string) => void; errors: Record<string, string> }) {
  const [show, setShow] = useState(false);
  return <><label htmlFor="initialPassword">Initial password</label><div className="users-password"><input id="initialPassword" name="initialPassword" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} aria-invalid={!!errors.initialPassword} aria-describedby="password-help initialPassword-error" /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div><small id="password-help">Use 15–128 characters. Share this initial password with the user securely.</small>{errors.initialPassword && <span className="users-error" id="initialPassword-error">{errors.initialPassword}</span>}<label htmlFor="confirmPassword">Confirm initial password</label><input id="confirmPassword" name="confirmPassword" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined} />{errors.confirmPassword && <span className="users-error" id="confirmPassword-error">{errors.confirmPassword}</span>}</>;
}
function passwordErrors(password: string, confirm: string) {
  const errors: Record<string, string> = {};
  if ([...password].length < 15 || [...password].length > 128 || new TextEncoder().encode(password).length > 512 || !password.trim()) errors.initialPassword = 'Use 15–128 characters, not only spaces.';
  if (password !== confirm) errors.confirmPassword = 'Passwords must match.';
  return errors;
}
function focusError(form: HTMLFormElement | null) { setTimeout(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); }

function ResetPassword({ user, own, onClose, onSaved, onConflict }: { user: ManagedUser; own: boolean; onClose: () => void; onSaved: (v: ManagedUser) => void; onConflict: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), form = useRef<HTMLFormElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => { node?.close(); queueMicrotask(() => { if (!node?.open) opener.current?.focus(); }); }; }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    const invalid = passwordErrors(password, confirm); setErrors(invalid); setMessage('');
    if (Object.keys(invalid).length) { focusError(form.current); return; }
    setBusy(true);
    try { const result = await workflow<{ data: ManagedUser }>(`/admin/users/${user.id}/initial-password`, 'POST', { initialPassword: password, confirmPassword: confirm, expectedVersion: user.version }); setPassword(''); setConfirm(''); onSaved(result.data); }
    catch (error) { if (error instanceof ApiFailure && error.code === 'USER_CONFLICT') { onConflict(); onClose(); } else { setMessage(error instanceof Error ? error.message : 'Unable to reset password.'); setErrors(error instanceof ApiFailure ? error.fieldErrors ?? {} : {}); focusError(form.current); } }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="wf-dialog users-reset" aria-labelledby="reset-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><form ref={form} onSubmit={submit} noValidate><p className="eyebrow">Account security</p><h2 id="reset-title">Set a new initial password</h2><p>All existing sessions for <strong>{user.name}</strong> will end. They must change this password when they next sign in.</p>{own && <p className="wf-conflict">This is your account. You will return to sign in after saving.</p>}{message && <p role="alert" className="users-error">{message}</p>}<fieldset disabled={busy}><PasswordFields {...{ password, confirm, setPassword, setConfirm, errors }} /></fieldset><div className="wf-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="wf-primary" disabled={busy}>{busy ? 'Saving…' : 'Set initial password'}</button></div></form></dialog>;
}

function UserEditor({ selected, actor, onClose, onSaved, onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void; selected: ManagedUser | null; actor: AuthUser; onClose: () => void; onSaved: (v: ManagedUser, reset?: boolean) => void }) {
  const [baseline, setBaseline] = useState(selected), [draft, setDraft] = useState<Draft>(selected ? fieldsOf(selected) : empty);
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false), [fresh, setFresh] = useState<ManagedUser | null>(null);
  const [discard, setDiscard] = useState(false), [reset, setReset] = useState(false);
  const form = useRef<HTMLFormElement>(null), title = useRef<HTMLHeadingElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline ? fieldsOf(baseline) : empty);
  useEffect(() => { title.current?.focus(); return () => { queueMicrotask(() => opener.current?.focus()); }; }, []);
  useEffect(() => { const leave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave); }, [dirty]);
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  const close = () => { if (busy) return; setPassword(''); setConfirm(''); if (dirty) setDiscard(true); else onClose(); };
  function field(key: keyof Draft, value: string | boolean) { setDraft(current => ({ ...current, [key]: value })); }
  async function reload() {
    setBusy(true); setMessage('');
    try { const result = await workflow<{ data: ManagedUser[] }>('/admin/users'); const latest = result.data.find(u => u.id === baseline!.id); if (!latest) throw new Error('This account is no longer available. Return to Users.'); setFresh(latest); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to reload account.'); } finally { setBusy(false); }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy || conflict) return;
    const invalid: Record<string, string> = baseline ? {} : passwordErrors(password, confirm);
    if (!draft.name.trim() || [...draft.name.trim().normalize('NFC')].length > 100) invalid.name = 'Enter a name between 1 and 100 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) invalid.email = 'Enter a valid email address.';
    setErrors(invalid); setMessage(''); if (Object.keys(invalid).length) { focusError(form.current); return; }
    setBusy(true);
    try {
      const result = await workflow<{ data: ManagedUser }>(`/admin/users${baseline ? `/${baseline.id}` : ''}`, baseline ? 'PATCH' : 'POST', { ...draft, ...(baseline ? { expectedVersion: baseline.version } : { initialPassword: password }) });
      setPassword(''); setConfirm(''); onSaved(result.data);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save the account.'); setErrors(error instanceof ApiFailure ? error.fieldErrors ?? {} : {}); if (error instanceof ApiFailure && error.code === 'USER_CONFLICT') setConflict(true); focusError(form.current); }
    finally { setBusy(false); }
  }
  const errorText = (key: string) => errors[key] && <span className="users-error" id={`${key}-error`}>{errors[key]}</span>;
  return <aside className="wf-panel users-editor" aria-labelledby="editor-title"><button className="users-back" type="button" onClick={close} disabled={busy}>← Back to Users</button><p className="eyebrow">{baseline ? 'Manage account' : 'Welcome someone new'}</p><h2 id="editor-title" ref={title} tabIndex={-1}>{baseline ? 'Edit user' : 'Create user'}</h2><p className="wf-muted">{baseline ? 'Keep account details and access up to date.' : 'One account, one role. A clear place to start.'}</p>
    {message && <p className="users-error" role="alert">{message}</p>}
    {conflict && <section className="wf-conflict" aria-label="Account conflict"><p>Your draft is preserved. Reload the latest account and review it before trying again.</p>{!fresh ? <button onClick={reload} disabled={busy}>Reload latest account</button> : <><dl><dt>Latest name</dt><dd>{fresh.name}</dd><dt>Latest email</dt><dd>{fresh.email}</dd><dt>Latest access</dt><dd>{label(fresh.role)} · {fresh.isActive ? 'Active' : 'Inactive'}</dd></dl><button onClick={() => { setBaseline(fresh); setFresh(null); setConflict(false); setMessage('Latest version reviewed. Check your draft, then save deliberately.'); }}>Keep my draft with latest version</button><button onClick={() => { setBaseline(fresh); setDraft(fieldsOf(fresh)); setFresh(null); setConflict(false); setMessage('Latest account loaded.'); setErrors({}); }}>Use latest values</button></>}</section>}
    <form ref={form} onSubmit={submit} noValidate><fieldset disabled={busy}><label htmlFor="user-name">Name</label><input id="user-name" name="name" autoComplete="name" value={draft.name} onChange={e => field('name', e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} />{errorText('name')}<label htmlFor="user-email">Email</label><input id="user-email" name="email" type="email" autoComplete="email" value={draft.email} onChange={e => field('email', e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />{errorText('email')}<label htmlFor="user-role">Role</label><select id="user-role" value={draft.role} onChange={e => field('role', e.target.value)} aria-invalid={!!errors.role} aria-describedby={errors.role ? 'role-error' : undefined}>{roles.map(role => <option key={role} value={role}>{label(role)}</option>)}</select>{errorText('role')}{baseline?.id === actor.id && draft.role !== actor.role && <p className="wf-conflict">Changing your own role will sign you out.</p>}<label className="users-active"><input type="checkbox" role="switch" checked={draft.isActive} disabled={baseline?.id === actor.id} onChange={e => field('isActive', e.target.checked)} aria-invalid={!!errors.isActive} aria-describedby="active-help" /><span>Active account</span></label><small id="active-help">{baseline?.id === actor.id ? 'Your own account must stay active.' : 'Inactive users cannot sign in. Changing access ends existing sessions.'}</small>{errorText('isActive')}
    {!baseline && <section className="users-credential"><p className="wf-visibility">The user must change their initial password at first sign in.</p><PasswordFields {...{ password, confirm, setPassword, setConfirm, errors }} /></section>}</fieldset><div className="wf-actions users-save"><button type="button" onClick={close} disabled={busy}>Cancel</button><button className="wf-primary" disabled={busy || conflict}>{busy ? 'Saving…' : baseline ? 'Save changes' : 'Create account'}</button></div></form>
    {baseline && <section className="users-security"><h3>Password access</h3><p className="wf-muted">Set a new initial password if this user needs help signing in.</p><button disabled={busy || conflict || dirty} onClick={() => setReset(true)}>Set new initial password</button>{dirty && <small>Save or discard account edits before resetting the password.</small>}</section>}
    {discard && <Confirmation title="Discard account changes?" onCancel={() => setDiscard(false)} onConfirm={onClose}>Your unsaved account details will be lost. Password fields have been cleared.</Confirmation>}
    {reset && baseline && <ResetPassword user={baseline} own={baseline.id === actor.id} onClose={() => setReset(false)} onConflict={() => { setConflict(true); setMessage('This account changed. Review its latest version first.'); }} onSaved={value => { setReset(false); onSaved(value, true); }} />}
  </aside>;
}

export default function UserManagement({ user, onSelfChanged, onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void; user: AuthUser; onSelfChanged: (value: ManagedUser, signedOut: boolean) => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]), [loading, setLoading] = useState(true), [failure, setFailure] = useState(''), [notice, setNotice] = useState('');
  const [search, setSearch] = useState(''), [role, setRole] = useState(''), [query, setQuery] = useState(''), [attempt, setAttempt] = useState(0);
  const [editor, setEditor] = useState<{ user: ManagedUser | null } | null>(null);
  useEffect(() => { let active = true; setLoading(true); setFailure(''); workflow<{ data: ManagedUser[] }>(`/admin/users${query}`).then(result => { if (active) setUsers(result.data); }).catch(error => { if (active) setFailure(error instanceof Error ? error.message : 'Unable to load users.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [query, attempt]);
  function filter(e: FormEvent) { e.preventDefault(); const params = new URLSearchParams(); if (search.trim()) params.set('search', search.trim()); if (role) params.set('role', role); setQuery(params.size ? `?${params}` : ''); setAttempt(v => v + 1); }
  function saved(value: ManagedUser, reset = false) { setEditor(null); if (value.id === user.id) { const signedOut = reset || value.role !== user.role; onSelfChanged(value, signedOut); if (signedOut) return; } setNotice(reset ? 'Initial password updated. Existing sessions ended; the user must change their password at sign in.' : 'Account saved successfully.'); setAttempt(v => v + 1); }
  return <main className={`wf-page users-page${editor ? ' users-editing' : ''}`}><header className="wf-heading"><div><p className="eyebrow">Administration</p><h1>Users</h1><p>A well-organized team starts with the right access.</p></div><button className="wf-primary" disabled={!!editor} onClick={() => { setNotice(''); setEditor({ user: null }); }}>＋ Create user</button></header>{notice && <p className="wf-notice" role="status">{notice}</p>}<div className="users-layout"><section className="users-directory" aria-label="User directory"><form className="wf-panel users-filters" onSubmit={filter}><label>Search users<input placeholder="Search name or email" value={search} onChange={e => setSearch(e.target.value)} maxLength={100} /></label><label>Role filter<select value={role} onChange={e => setRole(e.target.value)}><option value="">All roles</option>{roles.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label><button type="submit">Search</button></form>
    {loading ? <div className="wf-panel wf-state" role="status">Loading users…</div> : failure ? <div className="wf-panel" role="alert"><p>{failure}</p><button onClick={() => setAttempt(v => v + 1)}>Try again</button></div> : <><p className="users-result-count">{users.length} {users.length === 1 ? 'account' : 'accounts'}{query ? ' matching your search' : ' in your workspace'}</p>{users.length === 0 ? <div className="wf-panel wf-state"><h2>No users found</h2><p>Try a different name, email, or role.</p></div> : <div className="wf-panel users-table-wrap"><table className="users-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th><span className="users-sr">Actions</span></th></tr></thead><tbody>{users.map(value => <tr key={value.id} className={editor?.user?.id === value.id ? 'users-selected' : ''}><td data-label="Name"><div className="users-person"><span className="users-avatar" aria-hidden="true">{value.name.slice(0, 1).toUpperCase()}</span><span><strong>{value.name}</strong>{value.id === user.id && <small>You</small>}</span></div></td><td data-label="Email">{value.email}</td><td data-label="Role">{label(value.role)}</td><td data-label="Status"><span className={`users-status ${value.isActive ? 'is-active' : ''}`}>{value.isActive ? 'Active' : 'Inactive'}</span>{value.mustChangePassword && <small>Password change required</small>}</td><td><button disabled={!!editor} aria-label={`Edit ${value.name}`} onClick={() => { setNotice(''); setEditor({ user: value }); }}>Edit</button></td></tr>)}</tbody></table></div>}</>}
    <p className="users-footnote"><i className="bi bi-shield-check" aria-hidden="true" /> Access is managed by administrators. Each user has one role.</p></section>{editor && <UserEditor key={editor.user?.id ?? 'new'} selected={editor.user} actor={user} onDirtyChange={onDirtyChange} onClose={() => setEditor(null)} onSaved={saved} />}</div></main>;
}
