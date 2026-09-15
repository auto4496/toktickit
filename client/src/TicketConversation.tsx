import { useEffect, useRef, useState } from 'react';
import { dateLabel, label, Page, workflow } from './workflow-api';
import { Pagination } from './WorkflowParts';
type Entry = { id: string; content: string; author: { name: string; role: string }; createdAt: string };
export default function TicketConversation({ ticketId, role, terminal }: { ticketId: string; role: string; terminal: boolean }) {
  const [tab, setTab] = useState<'comments' | 'internal-notes'>('comments');
  const [drafts, setDrafts] = useState({ comments: '', 'internal-notes': '' });
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [data, setData] = useState<Page<Entry> | null>(null), [error, setError] = useState('');
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [reloadRequired, setReloadRequired] = useState(false);
  const requestGeneration = useRef(0);
  useEffect(() => { setDrafts({ comments: '', 'internal-notes': '' }); setNotice(''); }, [ticketId]);
  useEffect(() => {
    const generation = ++requestGeneration.current; setData(null); setError('');
    workflow<Page<Entry>>(`/tickets/${ticketId}/${tab}?page=${page}&pageSize=20`).then(result => { if (generation === requestGeneration.current) { setData(result); setReloadRequired(false); } }).catch(e => { if (generation === requestGeneration.current) setError(e.message); });
    return () => { requestGeneration.current++; };
  }, [ticketId, tab, page, retry]);
  const changeTab = (value: typeof tab) => { if (!busy && value !== tab) { setData(null); setError(''); setTab(value); setPage(1); setNotice(''); } };
  async function post() {
    if (busy || !data || reloadRequired) return;
    setBusy(true); setNotice('');
    try {
      await workflow(`/tickets/${ticketId}/${tab}`, 'POST', { content: drafts[tab] });
      setDrafts(current => ({ ...current, [tab]: '' })); setNotice(tab === 'comments' ? 'Public comment posted.' : 'Internal note added.');
      setPage(Math.max(1, Math.ceil((data.meta.totalItems + 1) / 20))); setRetry(value => value + 1);
    } catch (e) {
      setNotice(`${(e as Error).message} Your draft is retained. Review the refreshed conversation before posting again.`);
      setReloadRequired(true); setRetry(value => value + 1);
    } finally { setBusy(false); }
  }
  const internal = tab === 'internal-notes';
  return <section className={`wf-panel wf-conversation ${internal ? 'wf-private' : ''}`} aria-label="Ticket conversation">
    {role === 'REQUESTER' ? <h2>Public Comments</h2> : <div className="wf-tabs" role="tablist" aria-label="Conversation visibility">{(['comments', 'internal-notes'] as const).map((value, index) => <button key={value} id={`tab-${value}`} role="tab" aria-selected={tab === value} aria-controls="conversation-panel" tabIndex={tab === value ? 0 : -1} disabled={busy} onClick={() => changeTab(value)} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 'comments' : e.key === 'End' ? 'internal-notes' : index === 0 ? 'internal-notes' : 'comments'; changeTab(next); document.getElementById(`tab-${next}`)?.focus(); } }}>{value === 'comments' ? 'Public Comments' : '🔒 Internal Notes'}</button>)}</div>}
    <div id="conversation-panel" role={role === 'REQUESTER' ? undefined : 'tabpanel'} aria-labelledby={role === 'REQUESTER' ? undefined : `tab-${tab}`}>
      <p className="wf-visibility">{internal ? 'Internal — visible only to IT Staff and Administrators' : 'Visible to the requester'}</p>
      {notice && <p role="status" className="wf-notice">{notice}</p>}
      {error ? <div role="alert"><p>{error}</p><button onClick={() => setRetry(retry + 1)}>Reload conversation</button></div> : !data ? <p role="status">Loading conversation…</p> : <><ol className="wf-entries">{data.data.map(entry => <li key={entry.id}><div><strong>{entry.author.name}</strong><span>{label(entry.author.role)}</span><time dateTime={entry.createdAt}>{dateLabel(entry.createdAt)}</time></div><p>{entry.content}</p></li>)}</ol>{!data.data.length && <p className="wf-muted">{internal ? 'No internal notes yet.' : 'No public comments yet.'}</p>}<Pagination page={page} totalPages={data.meta.totalPages} onPage={setPage} /></>}
      {terminal ? <p className="wf-readonly">This ticket is read-only.</p> : role !== 'ADMINISTRATOR' && <form className="wf-composer" onSubmit={e => { e.preventDefault(); void post(); }}><label htmlFor={`draft-${tab}`}>{internal ? 'Internal note' : 'Public comment'}</label><textarea id={`draft-${tab}`} rows={4} required value={drafts[tab]} onChange={e => setDrafts({ ...drafts, [tab]: e.target.value })} disabled={busy} aria-describedby="composer-help" /><small id="composer-help">1–2,000 characters · {internal ? 'Never shared with the requester' : 'Shared with everyone on this ticket'}</small><button className="wf-primary" disabled={busy || !data || reloadRequired || !drafts[tab].trim() || [...drafts[tab].trim().normalize('NFC')].length > 2000}>{busy ? 'Posting…' : internal ? 'Add internal note' : 'Post public comment'}</button></form>}
    </div></section>;
}
