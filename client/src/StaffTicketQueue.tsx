import { FormEvent, useEffect, useState } from 'react';
import { AuthUser } from './auth-api';
import { ApiFailure, dateLabel, label, Owner, Page, statuses, workflow, WorkflowTicket } from './workflow-api';
import { Badge, Pagination } from './WorkflowParts';
const defaults = { search: '', currentStatus: '', itPriority: '', categoryId: '', owner: 'all', sortBy: 'updatedAt', sortDirection: 'desc', pageSize: '10' };
export default function StaffTicketQueue({ user, onOpen }: { user: AuthUser; onOpen: (id: string) => void }) {
  const [draft, setDraft] = useState(defaults), [applied, setApplied] = useState(defaults);
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [result, setResult] = useState<Page<WorkflowTicket> | null>(null), [error, setError] = useState('');
  const [owners, setOwners] = useState<Owner[]>([]), [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [lookupError, setLookupError] = useState(''), [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true; setLookupError('');
    Promise.all([workflow<{ id: number; name: string }[]>('/categories'), user.role === 'IT_STAFF' ? workflow<{ data: Owner[] }>('/staff/eligible-owners') : Promise.resolve({ data: [] })])
      .then(([refs, people]) => { if (active) { setCategories(refs); setOwners(people.data); } })
      .catch(() => { if (active) setLookupError('Some filter choices could not be loaded.'); });
    return () => { active = false; };
  }, [user.role, retry]);
  useEffect(() => {
    let active = true; setResult(null); setError('');
    const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== '')), page: String(page) });
    workflow<Page<WorkflowTicket>>(`/staff/tickets?${query}`).then(data => { if (active) setResult(data); }).catch(e => { if (active) setError(e instanceof ApiFailure && e.status === 403 ? 'This queue is not available for your role.' : e.message); });
    return () => { active = false; };
  }, [applied, page, retry]);
  const select = (key: keyof typeof defaults, title: string, choices: [string, string][]) => <label>{title}<select value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}>{choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
  const apply = (e: FormEvent) => { e.preventDefault(); setPage(1); setApplied({ ...draft, search: draft.search.trim() }); };
  const clear = () => { setDraft(defaults); setApplied(defaults); setPage(1); };
  const filtered = Object.keys(defaults).some(key => applied[key as keyof typeof defaults] !== defaults[key as keyof typeof defaults]);
  return <main className="wf-page"><header className="wf-heading"><div><p className="eyebrow">SUPPORT WORKSPACE</p><h1>{user.role === 'ADMINISTRATOR' ? 'Ticket Lookup' : 'Ticket Queue'}</h1><p>Find and prioritize support requests.</p></div>{result && <span className="wf-count">{result.meta.totalItems} matching tickets</span>}</header>
    <form className="wf-panel wf-filters" onSubmit={apply}><div className="wf-search"><label>Search tickets<input type="search" maxLength={100} placeholder="Ticket number, summary or description" value={draft.search} onChange={e => setDraft({ ...draft, search: e.target.value })} /></label><button className="wf-primary" type="submit">Search</button><button type="button" className="wf-filter-toggle" aria-expanded={expanded} aria-controls="queue-filters" onClick={() => setExpanded(!expanded)}>Filters & sort</button></div>
      <div id="queue-filters" className={`wf-filter-grid ${expanded ? 'is-expanded' : ''}`}>
        {select('currentStatus', 'Status', [['', 'All statuses'], ...statuses.map(s => [s, label(s)] as [string, string])])}
        {select('itPriority', 'IT Priority', [['', 'All priorities'], ...['LOW', 'MEDIUM', 'HIGH'].map(s => [s, label(s)] as [string, string])])}
        {select('categoryId', 'Category', [['', 'All categories'], ...categories.map(c => [String(c.id), c.name] as [string, string])])}
        {select('owner', 'Owner', [['all', 'All owners'], ['unassigned', 'Unassigned'], ['me', 'Assigned to me'], ...owners.map(o => [o.id, o.name] as [string, string])])}
        {select('sortBy', 'Sort by', [['updatedAt', 'Last updated'], ['createdAt', 'Created date'], ['ticketNumber', 'Ticket number'], ['itPriority', 'IT Priority']])}
        {select('sortDirection', 'Order', [['desc', 'Descending'], ['asc', 'Ascending']])}
        {select('pageSize', 'Tickets per page', [['10', '10'], ['20', '20'], ['50', '50']])}
        <div className="wf-actions"><button type="submit">Apply filters</button><button type="button" onClick={clear}>Clear filters</button></div>
      </div>{lookupError && <p role="alert">{lookupError} <button type="button" onClick={() => setRetry(retry + 1)}>Retry filters</button></p>}
    </form>
    {error ? <section className="wf-panel wf-state" role="alert"><h2>Unable to load tickets</h2><p>{error}</p><button onClick={() => setRetry(retry + 1)}>Retry</button></section> : !result ? <section className="wf-panel wf-state" role="status">Loading tickets…</section> : result.data.length === 0 ? <section className="wf-panel wf-state"><h2>{page > 1 ? 'No tickets on this page' : filtered ? 'No matching tickets' : 'No tickets yet'}</h2><p>{filtered ? 'Try another search or clear your filters.' : 'Support requests will appear here.'}</p>{filtered && <button onClick={clear}>Clear filters</button>}</section> : <>
      <div className="wf-panel wf-table-wrap"><table className="wf-table"><thead><tr>{['Ticket', 'Category', 'Priority', 'Status', 'Owner', 'Updated'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{result.data.map(t => <tr key={t.id}><td><a href={`/staff/tickets/${t.id}`} onClick={e => { e.preventDefault(); onOpen(t.id); }} aria-label={`${t.ticketNumber}: ${t.summary}`}>{t.ticketNumber}</a><p>{t.summary}</p></td><td>{t.category.name}</td><td><Badge value={t.itPriority} /><small>Requested: {label(t.requestedPriority)}</small></td><td><Badge value={t.currentStatus} /></td><td>{t.owner ? `${t.owner.name}${t.owner.isActive === false ? ' (Inactive)' : ''}` : 'Unassigned'}</td><td><time dateTime={t.updatedAt} title={t.updatedAt}>{dateLabel(t.updatedAt)}</time></td></tr>)}</tbody></table></div>
      <div className="wf-ticket-cards">{result.data.map(t => <article className="wf-panel" key={t.id}><div className="wf-card-top"><strong>{t.ticketNumber}</strong><Badge value={t.currentStatus} /></div><h2>{t.summary}</h2><p>{t.category.name}</p><div className="wf-actions"><span>IT: <Badge value={t.itPriority} /></span><span>Requested: {label(t.requestedPriority)}</span></div><p>{t.owner ? `${t.owner.name}${t.owner.isActive === false ? ' (Inactive)' : ''}` : 'Unassigned'}</p><small>Updated {dateLabel(t.updatedAt)}</small><a href={`/staff/tickets/${t.id}`} onClick={e => { e.preventDefault(); onOpen(t.id); }}>Open ticket <span className="visually-hidden">{t.ticketNumber}</span> →</a></article>)}</div>
    </>}
    {result && <footer className="wf-results-footer"><span>{result.data.length ? (page - 1) * result.meta.pageSize + 1 : 0}–{(page - 1) * result.meta.pageSize + result.data.length > result.meta.totalItems ? result.meta.totalItems : (page - 1) * result.meta.pageSize + result.data.length} of {result.meta.totalItems}</span><Pagination page={page} totalPages={result.meta.totalPages} onPage={setPage} /></footer>}
  </main>;
}
