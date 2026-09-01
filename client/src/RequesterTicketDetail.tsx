import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type { Requester } from './App';

type RefItem = { id: number; name: string };
type Attachment = { id: string; ticketId: string; originalName: string; mimeType: string; sizeBytes: number; uploadedAt: string; removedAt: string | null; removalReason: string | null; canDownload: boolean };
type TicketDetail = { id: string; ticketNumber: string; ticketDate: string; requester: Requester; category: RefItem; relatedSystem: RefItem; summary: string; requestedPriority: string; itPriority: string | null; description: string; currentStatus: string; attachments: Attachment[]; updatedAt: string };

const apiUrl = () => import.meta.env.VITE_API_URL ?? '';
const headers = (requester: Requester) => ({ 'X-Requester-Id': requester.id });
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MiB`;

type DetailResponse = { data: TicketDetail };
const isDetail = (value: unknown): value is DetailResponse => {
  if (!value || typeof value !== 'object') return false;
  const data = value as { data?: Partial<TicketDetail> };
  return typeof data.data?.id === 'string' && typeof data.data?.ticketNumber === 'string' && Array.isArray(data.data?.attachments);
};

export default function RequesterTicketDetail({ requester, ticketId, onBack }: { requester: Requester; ticketId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'not-found' | 'failure'>('loading');
  const [retry, setRetry] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<Record<string, boolean>>({});
  const [removing, setRemoving] = useState<Attachment | null>(null);
  const [reason, setReason] = useState('');
  const removeButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;
    setState('loading');
    fetch(`${apiUrl()}/api/tickets/${ticketId}`, { headers: headers(requester) })
      .then(async (response) => {
        if (response.status === 404) return { kind: 'not-found' as const };
        const body = await response.json();
        return response.ok && isDetail(body) ? { kind: 'loaded' as const, data: body.data } : { kind: 'failure' as const };
      })
      .then((result) => {
        if (!active) return;
        if (result.kind === 'loaded') { setDetail(result.data); setState('loaded'); }
        else setState(result.kind);
      })
      .catch(() => active && setState('failure'));
    return () => { active = false; };
  }, [requester.id, ticketId, retry]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !detail) return;
    setUploadMessage(`Uploading ${file.name}…`);
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch(`${apiUrl()}/api/tickets/${detail.id}/attachments`, { method: 'POST', headers: headers(requester), body: form });
      const body = await response.json();
      if (!response.ok || !body.data) throw new Error();
      setDetail({ ...detail, attachments: [body.data as Attachment, ...detail.attachments] });
      setUploadMessage(`${file.name} uploaded.`);
    } catch {
      setUploadMessage(`${file.name} could not be uploaded. Try again.`);
    }
  };

  const download = async (attachment: Attachment) => {
    try {
      const response = await fetch(`${apiUrl()}/api/attachments/${attachment.id}/download`, { headers: headers(requester) });
      if (!response.ok) throw new Error();
      const href = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = href; link.download = attachment.originalName; link.click();
      URL.revokeObjectURL(href);
      setUnavailable((value) => ({ ...value, [attachment.id]: false }));
    } catch {
      setUnavailable((value) => ({ ...value, [attachment.id]: true }));
    }
  };

  const remove = async () => {
    if (!removing || !detail) return;
    try {
      const response = await fetch(`${apiUrl()}/api/attachments/${removing.id}`, { method: 'DELETE', headers: { ...headers(requester), 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const body = await response.json();
      if (!response.ok || !body.data) throw new Error();
      setDetail({ ...detail, attachments: detail.attachments.map((attachment) => attachment.id === removing.id ? body.data as Attachment : attachment) });
      setRemoving(null); setReason(''); removeButton.current?.focus();
    } catch {
      setUploadMessage('The Attachment could not be removed. Check the reason and try again.');
    }
  };

  if (state === 'loading') return <main className="detail-page"><p role="status">Loading Ticket details…</p><div className="ticket-skeleton" /></main>;
  if (state === 'not-found') return <main className="detail-page state-panel" aria-labelledby="detail-not-found"><h1 id="detail-not-found">Ticket not found</h1><p>The requested Ticket is unavailable.</p><button className="btn btn-success" onClick={onBack}>Back to My Tickets</button></main>;
  if (state === 'failure') return <main className="detail-page state-panel" role="alert"><h1>Ticket details unavailable</h1><p>Ticket details could not be loaded. Try again.</p><button className="btn btn-outline-success" onClick={() => setRetry((value) => value + 1)}>Retry</button></main>;
  if (!detail) return null;

  return <main className="detail-page">
    <button className="btn btn-link back-link" onClick={onBack}>← Back to My Tickets</button>
    <header className="detail-header"><div><p className="ticket-card-number">{detail.ticketNumber}</p><h1>{detail.summary}</h1></div><span className="ticket-badge status-new">Status: {detail.currentStatus}</span></header>
    <p className="detail-dates">Ticket date: {formatDate(detail.ticketDate)} · Last updated: {formatDate(detail.updatedAt)}</p>
    <section className="detail-panel" aria-labelledby="ticket-information"><h2 id="ticket-information">Ticket information</h2><dl className="detail-grid">
      <div><dt>Requester</dt><dd>{detail.requester.name}<br />{detail.requester.email}</dd></div><div><dt>Category</dt><dd>{detail.category.name}</dd></div><div><dt>Related System</dt><dd>{detail.relatedSystem.name}</dd></div><div><dt>Requested Priority</dt><dd>{detail.requestedPriority}</dd></div><div><dt>IT Priority</dt><dd>{detail.itPriority ?? 'Not assigned'}</dd></div><div><dt>Current Status</dt><dd>{detail.currentStatus}</dd></div><div className="detail-wide"><dt>Description</dt><dd>{detail.description}</dd></div>
    </dl></section>
    <section className="detail-panel attachment-section" aria-labelledby="attachments-heading"><div className="page-heading-row"><div><h2 id="attachments-heading">Attachments</h2><p>{detail.attachments.filter((item) => !item.removedAt).length} of 5 active attachments</p></div><label className="btn btn-success attachment-add">Add Attachment<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={upload} /></label></div><p className="attachment-help">JPG, PNG, WEBP, or PDF; maximum 5 MiB each. Attachments are downloaded only; preview is unavailable.</p>
      {uploadMessage && <p className="attachment-message" role="status">{uploadMessage}</p>}
      {detail.attachments.length === 0 ? <p className="empty-attachments">No Attachments yet.</p> : <ul className="attachment-list">{detail.attachments.map((attachment) => <li key={attachment.id} className="attachment-row"><div><strong>{attachment.originalName}</strong><span>{attachment.mimeType} · {formatSize(attachment.sizeBytes)} · Uploaded {formatDate(attachment.uploadedAt)}</span>{attachment.removedAt && <span className="ticket-badge removed-badge">Removed {formatDate(attachment.removedAt)}: {attachment.removalReason}</span>}{unavailable[attachment.id] && <span className="attachment-unavailable">Unavailable — This file cannot be downloaded right now.</span>}</div>{!attachment.removedAt && <div className="attachment-actions"><button className="btn btn-outline-success" onClick={() => download(attachment)}>{unavailable[attachment.id] ? 'Retry Download' : 'Download'}</button><button ref={removeButton} className="btn btn-outline-danger" onClick={(event) => { removeButton.current = event.currentTarget; setRemoving(attachment); }}>Remove</button></div>}</li>)}</ul>}
    </section>
    {removing && <div className="dialog-backdrop" role="presentation"><section className="removal-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-title"><h2 id="remove-title">Remove {removing.originalName}?</h2><p>The file can no longer be opened through TokTickIT. Its metadata will remain visible.</p><label htmlFor="removal-reason">Removal reason</label><textarea id="removal-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={200} autoFocus /><div className="form-actions"><button className="btn btn-outline-secondary" onClick={() => { setRemoving(null); setReason(''); removeButton.current?.focus(); }}>Cancel</button><button className="btn btn-danger" disabled={reason.trim().length < 5} onClick={remove}>Remove Attachment</button></div></section></div>}
  </main>;
}
