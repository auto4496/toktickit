import { cloneElement, FormEvent, useEffect, useRef, useState } from 'react';
import { AuthUser } from './auth-api';
import { ApiFailure, dateLabel, label, workflow } from './workflow-api';
import { Badge, Confirmation } from './WorkflowParts';
import './lab4.css';

type Person = { id: string; name: string; isActive?: boolean };
type Action = {
  id: string; ticketId: string; actionAt: string; description: string; result: string;
  assignedTo: Person; createdBy: Person; performedBy: Person;
  followUpRequired: boolean; followUpNote: string; attachmentNotes: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  version: number; createdAt: string; updatedAt: string;
};
type Revision = { id: string; operation: string; createdAt: string; actor: Person; snapshot: Record<string, unknown> };
type Page = { data: Action[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } };
type Detail = { data: Action; revisions?: Revision[] };
type Draft = { actionAt: string; description: string; result: string; assignedToId: string; followUpRequired: boolean; followUpNote: string; attachmentNotes: string };
const localDateTime = (value: string) => {
  const date = new Date(value), offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const blank = (): Draft => ({ actionAt: localDateTime(new Date().toISOString()), description: '', result: '', assignedToId: '', followUpRequired: false, followUpNote: '', attachmentNotes: '' });

export default function ActionsTaken({ ticketId, role, terminal, onChanged }: { ticketId: string; role: AuthUser['role']; terminal: boolean; onChanged?: () => void }) {
  const writable = role !== 'REQUESTER' && !terminal;
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [list, setList] = useState<Page | null>(null), [error, setError] = useState('');
  const [owners, setOwners] = useState<Person[]>([]), [ownerError, setOwnerError] = useState('');
  const [selected, setSelected] = useState<Detail | null>(null), [detailError, setDetailError] = useState('');
  const [mode, setMode] = useState<'list' | 'create' | 'view' | 'edit'>('list');
  const [draft, setDraft] = useState<Draft>(blank), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(''), [detailBusy, setDetailBusy] = useState(false), [needsReload, setNeedsReload] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false), [cancelConfirm, setCancelConfirm] = useState(false);
  const key = useRef(crypto.randomUUID());
  const createAttempt = useRef<{ key: string; body: Draft } | null>(null);
  const [recoverCreate, setRecoverCreate] = useState(false);
  const mutationLock = useRef(false), detailRequest = useRef(0), focusDetails = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null), feedbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (focusDetails.current && !busy && !detailBusy && mode === 'view') { headingRef.current?.focus(); focusDetails.current = false; }
  }, [busy, detailBusy, mode, selected]);
  useEffect(() => { if (conflict || Object.keys(fieldErrors).length) feedbackRef.current?.focus(); }, [conflict, fieldErrors]);
  useEffect(() => {
    let active = true; setList(null); setError('');
    workflow<Page>(`/tickets/${ticketId}/actions?page=${page}&pageSize=20`).then(value => {
      if (!Array.isArray(value?.data) || !value.meta || !Number.isInteger(value.meta.totalPages)) throw new Error('Invalid Actions response');
      if (active) setList(value);
    }).catch(() => { if (active) setError('Actions Taken could not be loaded. Try again.'); });
    return () => { active = false; };
  }, [ticketId, page, retry]);
  useEffect(() => {
    if (!writable) return;
    let active = true;
    setOwnerError('');
    workflow<{ data: Person[] }>(`/tickets/${ticketId}/actions/eligible-assignees`).then(value => { if (active) setOwners(value.data); }).catch(() => { if (active) setOwnerError('Staff choices could not be loaded. Retry the page.'); });
    return () => { active = false; };
  }, [ticketId, writable, retry]);
  const reloadList = () => { setRetry(value => value + 1); onChanged?.(); };
  const open = async (item: Action) => {
    const request = ++detailRequest.current;
    setDetailBusy(true); setDetailError(''); setMessage(''); setFieldErrors({}); setConflict(false); setNeedsReload(false); setMode('view'); setSelected({ data: item });
    try { const value = await workflow<Detail>(`/tickets/${ticketId}/actions/${item.id}`); if (request === detailRequest.current) { setSelected(value); focusDetails.current = true; } }
    catch { if (request === detailRequest.current) { setDetailError('Action details could not be loaded. Reload latest before changing it.'); setNeedsReload(true); } }
    finally { if (request === detailRequest.current) setDetailBusy(false); }
  };
  const startCreate = () => { key.current = crypto.randomUUID(); createAttempt.current = null; setRecoverCreate(false); setSelected(null); setDraft(blank()); setFieldErrors({}); setMessage(''); setConflict(false); setNeedsReload(false); setDetailError(''); setMode('create'); };
  const reloadLatest = async () => {
    if (!selected || mutationLock.current || detailBusy) return;
    setDetailBusy(true); setDetailError('');
    try {
      const value = await workflow<Detail>(`/tickets/${ticketId}/actions/${selected.data.id}`);
      setSelected(value); setConflict(false); setNeedsReload(false); setMessage('Latest Action loaded.');
      if (['COMPLETED', 'CANCELLED'].includes(value.data.status)) setMode('view');
      focusDetails.current = mode === 'view'; reloadList();
    } catch { setDetailError('Latest Action could not be loaded. Try Reload latest again.'); setNeedsReload(true); }
    finally { setDetailBusy(false); }
  };
  const showFailure = (reason: unknown, fallback: string, transitionFailure = false) => {
    if (reason instanceof ApiFailure) { setFieldErrors(reason.fieldErrors ?? {}); if (reason.status === 409) setConflict(true); }
    if (transitionFailure && (!(reason instanceof ApiFailure) || reason.status >= 500)) setNeedsReload(true);
    setMessage(reason instanceof ApiFailure ? reason.message : fallback);
  };
  const refreshHistory = async (action: Action, success: string, retainDraft = false) => {
    setSelected({ data: action }); setMode(retainDraft ? 'edit' : 'view'); setMessage(success); focusDetails.current = !retainDraft; reloadList();
    try { setSelected(await workflow<Detail>(`/tickets/${ticketId}/actions/${action.id}`)); setDetailError(''); }
    catch { setDetailError('Action saved, but its latest history could not be loaded. Reload latest.'); setNeedsReload(true); }
  };
  const recoverCreation = async () => {
    const attempt = createAttempt.current;
    if (!attempt || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setPending('recover');
    try {
      const response = await workflow<{ data: Action }>(`/tickets/${ticketId}/actions`, 'POST', attempt.body, { 'Idempotency-Key': attempt.key });
      createAttempt.current = null; setRecoverCreate(false); setConflict(false); setNeedsReload(false);
      const editable = writable && !['COMPLETED', 'CANCELLED'].includes(response.data.status);
      await refreshHistory(response.data, editable ? 'Original Action recovered. Your draft is retained. Save Action to apply your edits to this Action.' : 'Original Action recovered. It is now read-only.', editable);
    } catch {
      setMessage('Creation could not be confirmed. Your draft is retained. Try Recover saved Action again.');
    } finally { mutationLock.current = false; setBusy(false); setPending(''); }
  };
  const startEdit = () => {
    if (!selected) return;
    const item = selected.data;
    setDraft({ actionAt: localDateTime(item.actionAt), description: item.description, result: item.result, assignedToId: item.assignedTo.id, followUpRequired: item.followUpRequired, followUpNote: item.followUpNote, attachmentNotes: item.attachmentNotes });
    setFieldErrors({}); setMessage(''); setMode('edit');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (mutationLock.current || conflict || needsReload || recoverCreate || !writable) return;
    if (!draft.actionAt || !Number.isFinite(new Date(draft.actionAt).getTime())) { setFieldErrors({ actionAt: 'Choose a valid date and time.' }); return; }
    const textErrors: Record<string, string> = {};
    for (const name of ['description', 'result', 'followUpNote', 'attachmentNotes'] as const) {
      if ([...draft[name].normalize('NFC').trim()].length > 2000) textErrors[name] = 'Use at most 2000 characters.';
    }
    if (Object.keys(textErrors).length) { setFieldErrors(textErrors); setMessage('Please correct the highlighted fields.'); return; }
    mutationLock.current = true; setBusy(true); setPending('save'); setMessage(''); setFieldErrors({});
    const body = { ...draft, actionAt: new Date(draft.actionAt).toISOString(), followUpNote: draft.followUpRequired ? draft.followUpNote : '' };
    if (mode === 'create') createAttempt.current = { key: key.current, body };
    try {
      const response = mode === 'create'
        ? await workflow<{ data: Action }>(`/tickets/${ticketId}/actions`, 'POST', body, { 'Idempotency-Key': key.current })
        : await workflow<{ data: Action }>(`/tickets/${ticketId}/actions/${selected!.data.id}`, 'PATCH', { ...body, expectedVersion: selected!.data.version });
      createAttempt.current = null; setRecoverCreate(false);
      await refreshHistory(response.data, 'Action saved.');
    } catch (reason) {
      if (mode === 'create') {
        if (!(reason instanceof ApiFailure) || reason.status >= 500 || reason.code === 'IDEMPOTENCY_KEY_REUSED') {
          setRecoverCreate(true); setMessage('Creation could not be confirmed. Your draft is retained. Recover saved Action before saving changes.');
        } else {
          createAttempt.current = null; key.current = crypto.randomUUID();
          setFieldErrors(reason.fieldErrors ?? {}); setMessage(reason.message);
        }
      } else showFailure(reason, 'Action could not be saved. Try again.');
    } finally { mutationLock.current = false; setBusy(false); setPending(''); }
  };
  const transition = async (status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    if (!selected || mutationLock.current || conflict || needsReload || detailBusy || !writable) return;
    if (status === 'COMPLETED' && !selected.data.result.trim()) { setMessage('Edit this Action to record a Result before completing it.'); return; }
    mutationLock.current = true; setBusy(true); setPending(status); setMessage(status === 'IN_PROGRESS' ? 'Starting Action…' : 'Updating Action…'); setCancelConfirm(false);
    try {
      const result = await workflow<{ data: Action }>(`/tickets/${ticketId}/actions/${selected.data.id}/status`, 'PATCH', { status, expectedVersion: selected.data.version, ...(status === 'COMPLETED' ? { result: selected.data.result } : {}) });
      await refreshHistory(result.data, status === 'IN_PROGRESS' ? 'Action started.' : `Action ${label(status).toLowerCase()}.`);
    } catch (reason) {
      showFailure(reason, 'Action could not be updated. Reload latest before trying again.', true);
    } finally { mutationLock.current = false; setBusy(false); setPending(''); }
  };
  const item = selected?.data;
  const editable = writable && item && !['COMPLETED', 'CANCELLED'].includes(item.status);
  const blocked = busy || detailBusy || conflict || needsReload || recoverCreate;
  const control = (name: keyof Draft, caption: string, element: React.ReactElement) => <label key={name}>{caption}{cloneElement(element, {
    disabled: busy || detailBusy || !writable, 'aria-invalid': !!fieldErrors[name],
    'aria-describedby': fieldErrors[name] ? `${ticketId}-${name}-error` : undefined,
  })}{fieldErrors[name] && <small id={`${ticketId}-${name}-error`} className="lab4-field-error" role="alert">{fieldErrors[name]}</small>}</label>;
  return <section className="wf-panel wf-requester-extension lab4-actions" aria-labelledby="actions-heading">
    <div className="lab4-actions-heading"><div><h2 id="actions-heading">Actions Taken</h2><p>Work recorded under this ticket. The Ticket Owner coordinates the overall case.</p></div>{writable && mode === 'list' && <button className="wf-primary" type="button" onClick={startCreate}>Add Action</button>}</div>
    {message && <p ref={feedbackRef} tabIndex={-1} className={conflict ? 'wf-conflict' : 'wf-notice'} role={conflict ? 'alert' : 'status'}>{message}</p>}
    {Object.keys(fieldErrors).length > 0 && !message && <p ref={feedbackRef} tabIndex={-1} role="alert">Please correct the highlighted fields.</p>}
    {(conflict || needsReload) && selected && <button type="button" disabled={busy || detailBusy} onClick={() => void reloadLatest()}>{detailBusy ? 'Loading latest…' : 'Reload latest'}</button>}
    {recoverCreate && <button type="button" disabled={busy} onClick={() => void recoverCreation()}>{pending === 'recover' ? 'Recovering…' : 'Recover saved Action'}</button>}
    {mode === 'list' && (error ? <div role="alert"><p>{error}</p><button onClick={reloadList}>Retry</button></div> : !list ? <p role="status">Loading Actions Taken…</p> : list.data.length === 0 ? <p>No Actions Taken have been recorded for this Ticket.</p> : <><ol className="lab4-action-list">{list.data.map(action => <li key={action.id}><div><time dateTime={action.actionAt}>{dateLabel(action.actionAt)}</time><h3>{action.description}</h3><p><Badge value={action.status} /> Assigned to {action.assignedTo.name} · Performed by {action.performedBy.name}</p>{action.result && <p>Result: {action.result}</p>}{action.followUpRequired && <p>Follow-up required: {action.followUpNote}</p>}{action.attachmentNotes && <p>Attachment Notes: {action.attachmentNotes}</p>}</div><button type="button" onClick={() => void open(action)}>View Action</button></li>)}</ol><div className="lab4-page-controls"><span>Page {page} of {Math.max(1, list.meta.totalPages)}</span><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button disabled={page >= list.meta.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div></>)}
    {(mode === 'create' || mode === 'edit') && <form className="lab4-action-form" onSubmit={event => void save(event)}><h3>{mode === 'create' ? 'Create Action' : 'Edit Action'}</h3>
      {control('actionAt', 'Action date and time', <input type="datetime-local" required value={draft.actionAt} onChange={event => setDraft({ ...draft, actionAt: event.target.value })} />)}
      {control('description', 'Action Description', <textarea required maxLength={4000} rows={4} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} />)}
      {control('result', 'Result', <textarea maxLength={4000} rows={3} value={draft.result} onChange={event => setDraft({ ...draft, result: event.target.value })} />)}
      {control('assignedToId', 'Assigned to', <select required value={draft.assignedToId} onChange={event => setDraft({ ...draft, assignedToId: event.target.value })}><option value="">Choose staff member</option>{item?.assignedTo && !owners.some(owner => owner.id === item.assignedTo.id) && <option value={item.assignedTo.id}>{item.assignedTo.name} (unavailable)</option>}{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select>)}
      {ownerError && <div role="alert"><p>{ownerError}</p><button type="button" disabled={busy} onClick={() => setRetry(value => value + 1)}>Retry staff choices</button></div>}
      <label className="lab4-checkbox"><input type="checkbox" disabled={busy || detailBusy || !writable} checked={draft.followUpRequired} onChange={event => setDraft({ ...draft, followUpRequired: event.target.checked, followUpNote: event.target.checked ? draft.followUpNote : '' })} /> Follow-Up Required?</label>
      {draft.followUpRequired && control('followUpNote', 'Follow-up Note', <textarea required maxLength={4000} rows={3} value={draft.followUpNote} onChange={event => setDraft({ ...draft, followUpNote: event.target.value })} />)}
      {control('attachmentNotes', 'Attachment Notes', <textarea maxLength={4000} rows={2} value={draft.attachmentNotes} onChange={event => setDraft({ ...draft, attachmentNotes: event.target.value })} />)}
      <div className="wf-actions"><button className="wf-primary" type="submit" disabled={blocked || !!ownerError || !writable}>{busy ? 'Saving…' : 'Save Action'}</button><button type="button" disabled={busy || recoverCreate} onClick={() => { setMode(item ? 'view' : 'list'); setFieldErrors({}); }}>Cancel</button></div>
    </form>}
    {mode === 'view' && item && <div className="lab4-action-view"><div className="wf-actions"><button type="button" disabled={busy || detailBusy} onClick={() => { setMode('list'); setMessage(''); setConflict(false); setNeedsReload(false); }}>← All Actions</button>{editable && <><button type="button" disabled={blocked} onClick={startEdit}>Edit</button>{item.status === 'PLANNED' && <button type="button" disabled={blocked} onClick={() => void transition('IN_PROGRESS')}>{pending === 'IN_PROGRESS' ? 'Starting…' : 'Start'}</button>}<button className="wf-primary" type="button" disabled={blocked} onClick={() => void transition('COMPLETED')}>Complete</button><button type="button" disabled={blocked} onClick={() => setCancelConfirm(true)}>Cancel Action</button></>}</div>
      {detailBusy && <p role="status">Loading Action details…</p>}
      {detailError && <p role="alert">{detailError}</p>}
      <h3 ref={headingRef} tabIndex={-1}>{item.description}</h3><dl className="lab4-action-details"><div><dt>Status</dt><dd><Badge value={item.status} /></dd></div><div><dt>Action date</dt><dd>{dateLabel(item.actionAt)}</dd></div><div><dt>Assigned to</dt><dd>{item.assignedTo.name}</dd></div><div><dt>Performed by</dt><dd>{item.performedBy.name}</dd></div><div><dt>Result</dt><dd>{item.result || 'Not recorded'}</dd></div><div><dt>Follow-up</dt><dd>{item.followUpRequired ? item.followUpNote : 'Not required'}</dd></div><div><dt>Attachment Notes</dt><dd>{item.attachmentNotes || 'None'}</dd></div></dl>
      {role !== 'REQUESTER' && selected.revisions && <section><h4>Change history</h4><ol className="lab4-revisions">{selected.revisions.map(revision => <li key={revision.id}>{label(revision.operation)} by {revision.actor.name} · {dateLabel(revision.createdAt)}</li>)}</ol></section>}
    </div>}
    {cancelConfirm && <Confirmation title="Cancel this Action?" onCancel={() => setCancelConfirm(false)} onConfirm={() => void transition('CANCELLED')}>This Action will remain in the Ticket history and cannot be edited afterward.</Confirmation>}
  </section>;
}
