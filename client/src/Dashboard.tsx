import { useEffect, useState } from 'react';
import { AuthUser } from './auth-api';
import { ApiFailure, dateLabel, label, workflow } from './workflow-api';
import { Badge } from './WorkflowParts';
import './dashboard.css';

type RecentTicket = { id: string; ticketNumber: string; summary: string; currentStatus: string; itPriority?: string; updatedAt: string; href: string };
type RequesterData = { asOf: string; windowStart: string; metrics: { open: number; waitingForRequester: number; recentlyUpdated: number; recentlyResolved: number }; recentTickets: RecentTicket[] };
type StaffData = { asOf: string; windowStart: string; metrics: { unassigned: number; myOwned: number; myFollowUps: number; byStatus: Record<string, number>; byPriority: Record<string, number> }; recentTickets: RecentTicket[] };
const staffCards = (data: StaffData) => [
  { label: 'Unassigned tickets', value: data.metrics.unassigned, href: '/staff/tickets?owner=unassigned&status=open' },
  { label: 'Owned by you', value: data.metrics.myOwned, href: '/staff/tickets?owner=me&status=open' },
  { label: 'Your follow-up Actions', value: data.metrics.myFollowUps, href: '/staff/tickets?actionAssignee=me' },
];
const requesterCards = (data: RequesterData) => [
  { label: 'Open tickets', value: data.metrics.open, href: '/tickets?status=open' },
  { label: 'Waiting for you', value: data.metrics.waitingForRequester, href: '/tickets?currentStatus=WAITING_FOR_REQUESTER' },
  { label: 'Recently updated (7 days)', value: data.metrics.recentlyUpdated, href: '/tickets?sortBy=updatedAt&sortDirection=desc' },
  { label: 'Recently resolved (7 days)', value: data.metrics.recentlyResolved, href: '/tickets?currentStatus=RESOLVED' },
];

export default function Dashboard({ user, onNavigate }: { user: AuthUser; onNavigate: (path: string) => void }) {
  const staff = user.role !== 'REQUESTER';
  const [data, setData] = useState<RequesterData | StaffData | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setData(null); setError('');
    workflow<RequesterData | StaffData>(staff ? '/dashboard/staff' : '/dashboard/requester')
      .then(value => { if (active) setData(value); })
      .catch(reason => { if (active) setError(reason instanceof ApiFailure && reason.status === 403 ? 'This dashboard is not available for your role. Return to your workspace using the navigation.' : reason instanceof ApiFailure && reason.status === 401 ? 'Sign in to view your dashboard.' : 'Dashboard information could not be loaded. Try again.'); });
    return () => { active = false; };
  }, [staff, retry, user.id]);
  const cards = data ? staff ? staffCards(data as StaffData) : requesterCards(data as RequesterData) : [];
  const go = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => { event.preventDefault(); onNavigate(href); };
  return <main className={`wf-page lab4-dashboard ${staff ? 'lab4-dashboard-staff' : ''}`}>
    <header className="wf-heading"><div><p className="eyebrow">{staff ? 'SUPPORT WORKSPACE' : 'YOUR REQUESTS'}</p><h1>{staff ? 'IT Staff Dashboard' : 'Requester Dashboard'}</h1><p>{staff ? 'Work that needs attention across the service desk.' : 'Follow the progress of your support requests.'}</p></div></header>
    {error ? <section className="wf-panel wf-state" role="alert"><h2>Dashboard unavailable</h2><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>Retry</button></section> : !data ? <section className="wf-panel wf-state" role="status">Loading dashboard…</section> : <>
      <section aria-label="Ticket metrics" className="lab4-metrics">{cards.map(card => <a key={card.label} className="wf-panel lab4-metric" href={card.href} onClick={event => go(event, card.href)}><span>{card.label}</span><strong>{card.value}</strong><small>View tickets →</small></a>)}</section>
      {staff && <section className="lab4-breakdown" aria-label="Ticket breakdown"><div className="wf-panel"><h2>By status</h2><div className="lab4-breakdown-grid">{Object.entries((data as StaffData).metrics.byStatus).map(([status, count]) => <a key={status} href={`/staff/tickets?currentStatus=${status}`} onClick={event => go(event, `/staff/tickets?currentStatus=${status}`)}><span>{label(status)}</span><strong>{count}</strong></a>)}</div></div><div className="wf-panel"><h2>By IT Priority</h2><div className="lab4-breakdown-grid">{Object.entries((data as StaffData).metrics.byPriority).map(([priority, count]) => <a key={priority} href={`/staff/tickets?itPriority=${priority}`} onClick={event => go(event, `/staff/tickets?itPriority=${priority}`)}><span>{label(priority)}</span><strong>{count}</strong></a>)}</div></div></section>}
      <section className="wf-panel" aria-labelledby="lab4-recent-heading"><h2 id="lab4-recent-heading">Recently updated tickets</h2>{data.recentTickets.length === 0 ? <p>No tickets were updated in the last seven days.</p> : <ul className="lab4-recent">{data.recentTickets.map(item => <li key={item.id}><div><a href={item.href} onClick={event => go(event, item.href)}>{item.ticketNumber}: {item.summary}</a><small>Updated {dateLabel(item.updatedAt)}</small></div><div className="lab4-recent-badges"><Badge value={item.currentStatus} />{item.itPriority && <Badge value={item.itPriority} />}</div></li>)}</ul>}</section>
      <p className="lab4-asof">Updated as of {dateLabel(data.asOf)}. Recent means the previous seven days.</p>
    </>}
  </main>;
}
