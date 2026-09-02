import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type { Requester } from './App';

type RefItem = { id: number; name: string };
type Attachment = { id: string; ticketId: string; originalName: string; mimeType: string; sizeBytes: number; uploadedAt: string; removedAt: string | null; removalReason: string | null; canDownload: boolean };
type TicketDetail = { id: string; ticketNumber: string; ticketDate: string; requester: Requester; category: RefItem; relatedSystem: RefItem; summary: string; requestedPriority: string; itPriority: string | null; description: string; currentStatus: string; attachments: Attachment[]; updatedAt: string };
type UploadState = { file: File; status: 'uploading' | 'invalid' | 'failed'; message: string };

const apiUrl = () => import.meta.env.VITE_API_URL ?? '';
const headers = (requester: Requester) => ({ 'X-Requester-Id': requester.id });
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MiB`;
const maximumFileBytes = 5 * 1024 * 1024;
const allowedFiles: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };

type DetailResponse = { data: TicketDetail };
const isDetail = (value: unknown): value is DetailResponse => {
  if (!value || typeof value !== 'object') return false;
  const data = value as { data?: Partial<TicketDetail> };
  return typeof data.data?.id === 'string' && typeof data.data?.ticketNumber === 'string' && Array.isArray(data.data?.attachments);
};

const isAttachment = (value: unknown): value is Attachment => {
  if (!value || typeof value !== 'object') return false;
  const attachment = value as Partial<Attachment>;
  return typeof attachment.id === 'string' && typeof attachment.originalName === 'string' && typeof attachment.uploadedAt === 'string';
};

const readErrorCode = async (response: Response) => {
  try {
    const body = await response.json() as { error?: { code?: unknown } };
    return typeof body.error?.code === 'string' ? body.error.code : null;
  } catch {
    return null;
  }
};

const validateSelectedFile = (file: File) => {
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!file.name.trim() || !allowedFiles[extension] || allowedFiles[extension] !== file.type) {
    return 'Choose a JPG, PNG, WEBP, or PDF file whose extension matches its type.';
  }
  if (file.size > maximumFileBytes) return 'Choose a file that is 5 MiB or smaller.';
  return null;
};

const uploadFailure = (code: string | null) => {
  if (code === 'ATTACHMENT_FILENAME_INVALID') return { status: 'invalid' as const, message: 'The filename is not valid. Choose another file.' };
  if (code === 'ATTACHMENT_TYPE_UNSUPPORTED') return { status: 'invalid' as const, message: 'The extension, declared type, and file contents must identify the same supported file type.' };
  if (code === 'ATTACHMENT_TOO_LARGE') return { status: 'invalid' as const, message: 'Choose a file that is 5 MiB or smaller.' };
  if (code === 'ATTACHMENT_LIMIT_REACHED') return { status: 'failed' as const, message: 'This Ticket already has five active Attachments.' };
  if (code === 'RESOURCE_NOT_FOUND') return { status: 'failed' as const, message: 'The requested Ticket is unavailable.' };
  return { status: 'failed' as const, message: 'The Attachment could not be uploaded. Try again.' };
};

export default function RequesterTicketDetail({ requester, ticketId, onBack }: { requester: Requester; ticketId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'not-found' | 'failure'>('loading');
  const [retry, setRetry] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<Record<string, boolean>>({});
  const [removing, setRemoving] = useState<Attachment | null>(null);
  const [reason, setReason] = useState('');
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);
  const removeButton = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    setState('loading');
    setDetail(null);
    setUploadState(null);
    setOperationMessage(null);
    setUnavailable({});
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

  const closeRemoval = () => {
    setRemoving(null);
    setReason('');
    setRemovalError(null);
    setRemovingBusy(false);
    window.setTimeout(() => removeButton.current?.focus(), 0);
  };

  useEffect(() => {
    if (!removing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !removingBusy) {
        event.preventDefault();
        closeRemoval();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [removing, removingBusy]);

  const uploadAttachment = async (file: File) => {
    if (!detail) return;
    const clientError = validateSelectedFile(file);
    if (clientError) {
      setUploadState({ file, status: 'invalid', message: clientError });
      return;
    }

    setOperationMessage(null);
    setUploadState({ file, status: 'uploading', message: 'Uploading…' });
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch(`${apiUrl()}/api/tickets/${detail.id}/attachments`, { method: 'POST', headers: headers(requester), body: form });
      if (!response.ok) {
        setUploadState({ file, ...uploadFailure(await readErrorCode(response)) });
        return;
      }
      const body = await response.json() as { data?: unknown };
      if (!isAttachment(body.data)) throw new Error('Invalid Attachment response.');
      const uploadedAttachment = body.data;
      setDetail((current) => current ? { ...current, attachments: [uploadedAttachment, ...current.attachments] } : current);
      setUploadState(null);
      setOperationMessage(`${file.name} uploaded.`);
    } catch {
      setUploadState({ file, status: 'failed', message: 'The Attachment could not be uploaded. Try again.' });
    }
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadAttachment(file);
  };

  const download = async (attachment: Attachment) => {
    setOperationMessage(null);
    try {
      const response = await fetch(`${apiUrl()}/api/attachments/${attachment.id}/download`, { headers: headers(requester) });
      if (!response.ok) {
        const code = await readErrorCode(response);
        if (code === 'ATTACHMENT_FILE_UNAVAILABLE') setUnavailable((value) => ({ ...value, [attachment.id]: true }));
        else if (code === 'RESOURCE_NOT_FOUND') setOperationMessage('The requested Attachment is unavailable.');
        else setOperationMessage('The Attachment could not be downloaded. Try again.');
        return;
      }
      const href = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = href; link.download = attachment.originalName; link.click();
      URL.revokeObjectURL(href);
      setUnavailable((value) => ({ ...value, [attachment.id]: false }));
    } catch {
      setOperationMessage('The Attachment could not be downloaded. Try again.');
    }
  };

  const remove = async () => {
    if (!removing || !detail || removingBusy) return;
    setRemovingBusy(true);
    setRemovalError(null);
    try {
      const response = await fetch(`${apiUrl()}/api/attachments/${removing.id}`, { method: 'DELETE', headers: { ...headers(requester), 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      if (!response.ok) {
        const code = await readErrorCode(response);
        setRemovalError(code === 'RESOURCE_NOT_FOUND' ? 'The requested Attachment is unavailable.' : 'The Attachment could not be removed. Check the reason and try again.');
        return;
      }
      const body = await response.json() as { data?: unknown };
      if (!isAttachment(body.data)) throw new Error('Invalid Attachment response.');
      const removedAttachment = body.data;
      setDetail((current) => current ? { ...current, attachments: current.attachments.map((attachment) => attachment.id === removing.id ? removedAttachment : attachment) } : current);
      closeRemoval();
    } catch {
      setRemovalError('The Attachment could not be removed. Check the reason and try again.');
    } finally {
      setRemovingBusy(false);
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
    <section className="detail-panel attachment-section" aria-labelledby="attachments-heading"><div className="page-heading-row"><div><h2 id="attachments-heading">Attachments</h2><p>{detail.attachments.filter((item) => !item.removedAt).length} of 5 active attachments</p></div><label className={`btn btn-success attachment-add${uploadState?.status === 'uploading' ? ' disabled' : ''}`} aria-disabled={uploadState?.status === 'uploading'}>Add Attachment<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" disabled={uploadState?.status === 'uploading'} onChange={upload} /></label></div><p className="attachment-help">JPG, PNG, WEBP, or PDF; maximum 5 MiB each; maximum five active files. Attachments are downloaded only.</p>
      {operationMessage && <p className="attachment-message" role="status">{operationMessage}</p>}
      {uploadState && <ul className="attachment-list upload-list" aria-live="polite"><li className={`attachment-row attachment-${uploadState.status}`}><div><strong>{uploadState.file.name}</strong><span>{uploadState.message}</span></div>{uploadState.status !== 'uploading' && <div className="attachment-actions">{uploadState.status === 'failed' && <button className="btn btn-outline-success" type="button" onClick={() => void uploadAttachment(uploadState.file)}>Retry Upload</button>}<button className="btn btn-outline-danger" type="button" onClick={() => setUploadState(null)}>Remove selection</button></div>}</li></ul>}
      {detail.attachments.length === 0 ? <p className="empty-attachments">No Attachments yet.</p> : <ul className="attachment-list">{detail.attachments.map((attachment) => <li key={attachment.id} className="attachment-row"><div><strong>{attachment.originalName}</strong><span>{attachment.mimeType} · {formatSize(attachment.sizeBytes)} · Uploaded {formatDate(attachment.uploadedAt)}</span>{attachment.removedAt && <span className="ticket-badge removed-badge">Removed {formatDate(attachment.removedAt)}: {attachment.removalReason}</span>}{unavailable[attachment.id] && <><span className="ticket-badge unavailable-badge">Unavailable</span><span className="attachment-unavailable">This file cannot be downloaded right now.</span></>}</div>{!attachment.removedAt && <div className="attachment-actions"><button className="btn btn-outline-success" onClick={() => void download(attachment)}>{unavailable[attachment.id] ? 'Retry Download' : 'Download'}</button><button className="btn btn-outline-danger" onClick={(event) => { removeButton.current = event.currentTarget; setRemovalError(null); setRemoving(attachment); }}>Remove</button></div>}</li>)}</ul>}
    </section>
    {removing && <div className="dialog-backdrop" role="presentation"><section ref={dialogRef} className="removal-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-title"><h2 id="remove-title">Remove {removing.originalName}?</h2><p>The file can no longer be opened through TokTickIT. Its metadata will remain visible.</p><label htmlFor="removal-reason">Removal reason</label><textarea id="removal-reason" value={reason} onChange={(event) => { setReason(event.target.value); setRemovalError(null); }} minLength={5} maxLength={200} required disabled={removingBusy} aria-invalid={Boolean(removalError)} aria-describedby={removalError ? 'removal-error' : undefined} autoFocus />{removalError && <p id="removal-error" className="field-error" role="alert">{removalError}</p>}<div className="form-actions"><button className="btn btn-outline-secondary" disabled={removingBusy} onClick={closeRemoval}>Cancel</button><button className="btn btn-danger" disabled={removingBusy || reason.trim().length < 5} onClick={() => void remove()}>{removingBusy ? 'Removing…' : 'Remove Attachment'}</button></div></section></div>}
  </main>;
}
