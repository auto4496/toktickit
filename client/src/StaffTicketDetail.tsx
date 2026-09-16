import { useEffect, useState } from 'react';
import { apiFetch, AuthUser } from './auth-api';
import { ApiFailure, dateLabel, label, Owner, transitions, workflow, WorkflowTicket } from './workflow-api';
import { Badge, Confirmation } from './WorkflowParts';
import TicketConversation from './TicketConversation';
export default function StaffTicketDetail({ user, ticketId, onBack }: { user: AuthUser; ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<WorkflowTicket | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [owners, setOwners] = useState<Owner[]>([]), [ownerError, setOwnerError] = useState('');
  const [ownerId, setOwnerId] = useState(''), [priority, setPriority] = useState(''), [status, setStatus] = useState('');
  const [busy, setBusy] = useState(''), [notice, setNotice] = useState<Record<string, string>>({}), [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState<{ operation: string; body: object; text: string } | null>(null);
  const [unavailable, setUnavailable] = useState<Record<string, boolean>>({});
  const admin = user.role === 'ADMINISTRATOR';
  useEffect(() => {
    let active = true; setTicket(null); setError(''); setConflict(false); setNotice({});
    workflow<{ data: WorkflowTicket }>(`/staff/tickets/${ticketId}`).then(({ data }) => { if (active) { setTicket(data); setOwnerId(data.owner?.id ?? ''); setPriority(data.itPriority); setStatus(''); } }).catch(e => { if (active) setError(e instanceof ApiFailure && e.status === 404 ? 'This ticket was not found.' : e.message); });
    return () => { active = false; };
  }, [ticketId, retry]);
  useEffect(() => {
    if (admin) return;
    let active = true; setOwnerError('');
    workflow<{ data: Owner[] }>('/staff/eligible-owners').then(({ data }) => { if (active) setOwners(data); }).catch(() => { if (active) setOwnerError('Owner choices could not be loaded. Reload details to try again.'); });
    return () => { active = false; };
  }, [admin, retry]);
  async function mutate(operation: string, body: object) {
    if (!ticket || busy || conflict) return;
    setConfirm(null); setBusy(operation); setNotice(current => ({ ...current, [operation]: '' }));
    try {
      const { data } = await workflow<{ data: WorkflowTicket }>(`/staff/tickets/${ticketId}/${operation}`, operation === 'claim' ? 'POST' : 'PATCH', { ...body, expectedVersion: ticket.version });
      setTicket(data); setOwnerId(data.owner?.id ?? ''); setPriority(data.itPriority); setStatus(''); setNotice(current => ({ ...current, [operation]: 'Ticket updated.' }));
    } catch (e) {
      const failure = e as Error;
      if (e instanceof ApiFailure && e.status === 409) setConflict(true);
      setNotice(current => ({ ...current, [operation]: failure.message }));
    } finally { setBusy(''); }
  }
  async function download(id: string, name: string) {
    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL ?? ''}/api/attachments/${id}/download`);
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setUnavailable(current => ({ ...current, [id]: false }));
    } catch { setUnavailable(current => ({ ...current, [id]: true })); }
  }
  if (error || !ticket) return <main className="wf-page"><button onClick={onBack}>← Back to Queue</button><section className="wf-panel wf-state" role={error ? 'alert' : 'status'}><h1>{error ? 'Ticket unavailable' : 'Loading ticket…'}</h1>{error && <><p>{error}</p><button onClick={() => setRetry(retry + 1)}>Retry</button></>}</section></main>;
  const terminal = ['CLOSED', 'CANCELLED'].includes(ticket.currentStatus), disabled = !!busy || conflict;
  const activeOwner = ticket.owner && ticket.owner.isActive && ['IT_STAFF', 'ADMINISTRATOR'].includes(ticket.owner.role);
  return <main className="wf-page wf-detail"><button className="wf-back" onClick={onBack}>← Back to {admin ? 'Ticket Lookup' : 'Queue'}</button><header className="wf-heading"><div><p className="eyebrow">{ticket.ticketNumber}</p><h1>{ticket.summary}</h1><p>Updated {dateLabel(ticket.updatedAt)}</p></div><Badge value={ticket.currentStatus} /></header>
    {conflict && <div className="wf-conflict" role="alert"><strong>This ticket changed or the action is no longer available.</strong><p>Your attempted selections are still shown. Reload the latest details before trying again.</p><button onClick={() => setRetry(retry + 1)}>Reload latest details</button></div>}
    {ticket.requesterResolvedAt && <p className="wf-notice">The requester reported this problem appears resolved · {dateLabel(ticket.requesterResolvedAt)}</p>}
    <div className="wf-detail-grid"><section className="wf-panel wf-information"><h2>Ticket information</h2><dl><div><dt>Requester</dt><dd>{ticket.requester.name}<small>{ticket.requester.email}</small></dd></div><div><dt>Created</dt><dd>{dateLabel(ticket.ticketDate)}</dd></div><div><dt>Category</dt><dd>{ticket.category.name}</dd></div><div><dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd></div><div><dt>Requested Priority</dt><dd><Badge value={ticket.requestedPriority} /></dd></div><div><dt>IT Priority</dt><dd><Badge value={ticket.itPriority} /></dd></div></dl><h3>Description</h3><p className="wf-description">{ticket.description}</p></section>
      <aside className="wf-panel wf-operations"><h2>{admin ? 'Ticket oversight' : 'Manage ticket'}</h2>{terminal && <p className="wf-readonly">This ticket is read-only.{ticket.currentStatus === 'CLOSED' && !admin ? ' You may reopen it below.' : ''}</p>}
        <div className="wf-operation"><h3>Owner</h3><p>{ticket.owner ? `${ticket.owner.name}${ticket.owner.isActive === false ? ' (Inactive)' : ''}` : 'Unassigned'}</p>{!admin && !terminal && <>{!ticket.owner && <button disabled={disabled} onClick={() => void mutate('claim', {})}>{busy === 'claim' ? 'Claiming…' : 'Claim ticket'}</button>}{notice.claim && <p role="status">{notice.claim}</p>}<label>Assign to<select value={ownerId} disabled={disabled || !!ownerError} onChange={e => setOwnerId(e.target.value)}><option value="" disabled={!['NEW', 'OPEN', 'REOPENED'].includes(ticket.currentStatus)}>Unassigned</option>{ticket.owner && !owners.some(o => o.id === ticket.owner!.id) && <option value={ticket.owner.id}>{ticket.owner.name} (Unavailable)</option>}{owners.map(owner => <option value={owner.id} key={owner.id}>{owner.name} · {label(owner.role)}</option>)}</select></label>{ownerError && <p role="alert">{ownerError}</p>}<button disabled={disabled || !!ownerError || ownerId === (ticket.owner?.id ?? '')} onClick={() => setConfirm({ operation: 'owner', body: { ownerId: ownerId || null, confirmed: true }, text: `${ticket.ticketNumber}: change owner from ${ticket.owner?.name ?? 'Unassigned'} to ${owners.find(o => o.id === ownerId)?.name ?? 'Unassigned'}?` })}>Assign / Reassign</button>{notice.owner && <p role="status">{notice.owner}</p>}</>}</div>
        <form className="wf-operation" onSubmit={e => { e.preventDefault(); void mutate('priority', { itPriority: priority }); }}><label>IT Priority<select value={priority} disabled={disabled || terminal} onChange={e => setPriority(e.target.value)}>{['LOW', 'MEDIUM', 'HIGH'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label><small>Requested priority stays unchanged.</small>{!terminal && <button disabled={disabled || priority === ticket.itPriority}>{busy === 'priority' ? 'Saving…' : 'Save priority'}</button>}{notice.priority && <p role="status">{notice.priority}</p>}</form>
        {!admin && (transitions[ticket.currentStatus]?.length ?? 0) > 0 && <form className="wf-operation" onSubmit={e => { e.preventDefault(); if (['RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'].includes(status)) setConfirm({ operation: 'status', body: { currentStatus: status, confirmed: true }, text: `${ticket.ticketNumber}: change status from ${label(ticket.currentStatus)} to ${label(status)}?` }); else void mutate('status', { currentStatus: status }); }}><label>Next status<select value={status} disabled={disabled} onChange={e => setStatus(e.target.value)}><option value="">Choose next status</option>{transitions[ticket.currentStatus].map(value => <option key={value} value={value} disabled={!activeOwner && ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED'].includes(value)}>{label(value)}</option>)}</select></label>{!activeOwner && <small>Assign an active owner before starting work, waiting for the requester or resolving.</small>}<button className="wf-primary" disabled={disabled || !status}>{busy === 'status' ? 'Updating…' : 'Update status'}</button>{notice.status && <p role="status">{notice.status}</p>}</form>}
        {admin && <p className="wf-muted">You can review this ticket and update IT Priority. IT Staff manage ownership, status and conversation.</p>}
      </aside>
      <section className="wf-panel wf-attachments"><h2>Attachments</h2>{!ticket.attachments.length && <p className="wf-muted">No attachments.</p>}<ul>{ticket.attachments.map(file => <li key={file.id}><div><strong>{file.originalName}</strong><small>{file.mimeType} · {Math.ceil(file.sizeBytes / 1024)} KB</small>{file.removedAt && <p>Removed · {file.removalReason}</p>}{unavailable[file.id] && <p role="alert">File unavailable. Try downloading again.</p>}</div>{file.canDownload && <button onClick={() => void download(file.id, file.originalName)}>{unavailable[file.id] ? 'Retry download' : 'Download'}</button>}</li>)}</ul></section>
    </div><TicketConversation key={ticket.id} ticketId={ticket.id} role={user.role} terminal={terminal} />
    {confirm && <Confirmation title="Confirm ticket update" onCancel={() => setConfirm(null)} onConfirm={() => void mutate(confirm.operation, confirm.body)}>{confirm.text}</Confirmation>}
  </main>;
}
