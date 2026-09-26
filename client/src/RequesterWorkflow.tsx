import { useState } from 'react';
import { ApiFailure, dateLabel, workflow } from './workflow-api';
import { Confirmation } from './WorkflowParts';
import TicketConversation from './TicketConversation';
export default function RequesterWorkflow({ ticket, onUpdated }: { ticket: { id: string; ticketNumber: string; currentStatus: string; version?: number; requesterResolvedAt?: string | null }; onUpdated: () => void }) {
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false);
  async function indicate() {
    if (busy || conflict) return;
    setConfirm(false); setBusy(true); setError('');
    try { await workflow(`/tickets/${ticket.id}/resolution-indication`, 'POST', { expectedVersion: ticket.version }); onUpdated(); }
    catch (e) { setError((e as Error).message); if (e instanceof ApiFailure && e.status === 409) setConflict(true); }
    finally { setBusy(false); }
  }
  return <div className="wf-requester-extension">{ticket.requesterResolvedAt ? <p className="wf-notice">You reported this problem appears resolved · {dateLabel(ticket.requesterResolvedAt)}. IT Staff will review it.</p> : ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'].includes(ticket.currentStatus) && <section className="wf-panel"><h2>Is the problem resolved?</h2><p>IT Staff will review this and formally resolve or close your ticket.</p><button disabled={busy || conflict} onClick={() => setConfirm(true)}>{busy ? 'Reporting…' : 'Problem appears resolved'}</button>{error && <p role="alert">{error}</p>}{conflict && <button onClick={onUpdated}>Reload latest details</button>}</section>}
    <TicketConversation ticketId={ticket.id} role="REQUESTER" terminal={['CLOSED', 'CANCELLED'].includes(ticket.currentStatus)} />
    {confirm && <Confirmation title="Report apparent resolution" onCancel={() => setConfirm(false)} onConfirm={() => void indicate()}>{ticket.ticketNumber}: IT Staff will review this and formally resolve or close your ticket. This does not change the ticket status.</Confirmation>}
  </div>;
}
