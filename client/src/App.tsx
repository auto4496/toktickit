import { useEffect, useRef, useState } from 'react';
import CreateTicket from './CreateTicket';
import MyTickets from './MyTickets';
import RequesterTicketDetail from './RequesterTicketDetail';
import AuthForm from './AuthForm';
import StaffTicketQueue from './StaffTicketQueue';
import StaffTicketDetail from './StaffTicketDetail';
import './workflow.css';
import { AUTH_EVENT, AuthUser, authRequest, clearAuthState, resetCsrf } from './auth-api';
import './auth.css';

export type Requester = { id: string; name: string; email: string };
const landing = (user: AuthUser) => user.mustChangePassword ? '/change-password' : user.role === 'REQUESTER' ? '/tickets' : user.role === 'IT_STAFF' ? '/staff/tickets' : '/admin/users';
const roleName = (role: AuthUser['role']) => ({ REQUESTER: 'Requester', IT_STAFF: 'IT Staff', ADMINISTRATOR: 'Administrator' })[role];
const ticketPath = /^\/tickets\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function internalDestination(value: unknown): string | null {
  return typeof value === 'string' && (['/tickets', '/tickets/new', '/staff/tickets', '/admin/users'].includes(value) || ticketPath.test(value) || value.startsWith('/staff/') && ticketPath.test(value.slice(6))) ? value : null;
}
function permittedDestination(value: unknown, user: AuthUser): string | null {
  const route = internalDestination(value);
  if (!route) return null;
  if (user.role === 'REQUESTER') return route === '/tickets' || route === '/tickets/new' || ticketPath.test(route) ? route : null;
  const staffRoute = route === '/staff/tickets' || route.startsWith('/staff/') && ticketPath.test(route.slice(6));
  if (user.role === 'IT_STAFF') return staffRoute ? route : null;
  return route === '/admin/users' || staffRoute ? route : null;
}
function navigate(path: string, intended: string | null = null) {
  history.pushState(intended ? { toktickitReturnTo: intended } : {}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [path, setPath] = useState(location.pathname);
  const [menu, setMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // History retains only an allowlisted path across a login/password-gate reload.
  // It is untrusted input and is revalidated against the authenticated role.
  const intended = useRef(internalDestination(location.pathname) ?? internalDestination(history.state?.toktickitReturnTo));
  const rememberDestination = () => {
    intended.current = internalDestination(location.pathname) ?? intended.current;
  };
  const continueToDestination = (next: AuthUser) => {
    if (next.mustChangePassword) {
      rememberDestination(); navigate('/change-password', intended.current);
    } else {
      const destination = permittedDestination(intended.current, next) ?? landing(next);
      intended.current = null; navigate(destination);
    }
  };
  useEffect(() => {
    const route = () => setPath(location.pathname);
    const expired = (event: Event) => {
      rememberDestination();
      if ((event as CustomEvent).detail === 'password') {
        setUser((current) => current ? { ...current, mustChangePassword: true } : null); navigate('/change-password', intended.current);
      } else { setUser(null); navigate('/login', intended.current); }
    };
    window.addEventListener('popstate', route); window.addEventListener(AUTH_EVENT, expired);
    return () => { window.removeEventListener('popstate', route); window.removeEventListener(AUTH_EVENT, expired); };
  }, []);
  useEffect(() => {
    let active = true; resetCsrf(); localStorage.removeItem('toktickit.requester'); setLoading(true); setFailure('');
    authRequest('me').then((data) => {
      if (!active) return; setUser(data.user);
      if (['/login', '/', '/select-requester'].includes(location.pathname) || data.user.mustChangePassword) continueToDestination(data.user);
      else if (location.pathname !== '/change-password') intended.current = null;
    }).catch((error) => {
      if (!active) return;
      if (error.message !== 'Sign in to continue.') setFailure('Unable to check your session. Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  async function logout() {
    if (loggingOut) return; setLoggingOut(true); setFailure('');
    try { await authRequest('logout', {}); clearAuthState(); intended.current = null; setUser(null); navigate('/login'); }
    catch { setFailure('Sign out could not be completed. Please try again.'); }
    finally { setLoggingOut(false); }
  }
  const signedIn = (next: AuthUser) => { setUser(next); setFailure(''); continueToDestination(next); };
  if (loading) return <main className="auth-page"><div className="auth-card" role="status">Checking your session…</div></main>;
  if (!user && failure) return <main className="auth-page"><div className="auth-card" role="alert"><h1>Connection unavailable</h1><p>{failure}</p><button className="auth-submit" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div></main>;
  if (!user) return <AuthForm onSuccess={signedIn} />;
  if (user.mustChangePassword || path === '/change-password') return <><AuthForm change onSuccess={signedIn} onLogout={logout} />{failure && <p className="auth-floating-error" role="alert">{failure}</p>}</>;
  const requesterRoute = user.role === 'REQUESTER' && (path === '/tickets' || path === '/tickets/new' || /^\/tickets\/[0-9a-f-]+$/i.test(path));
  const laterRoute = path === landing(user) || (user.role === 'ADMINISTRATOR' && path === '/staff/tickets');
  return <div className="app-shell" key={user.id}>
    <header className="topbar">
      <a className="wordmark" href={landing(user)} onClick={(e) => { e.preventDefault(); navigate(landing(user)); }}><i className="bi bi-ticket-perforated" aria-hidden="true" /> TokTickIT</a>
      <button className="menu-button" type="button" aria-expanded={menu} aria-label="Toggle navigation menu" onClick={() => setMenu(!menu)}>Menu</button>
      <nav className={menu ? 'is-open' : ''} aria-label="Primary navigation">
        {(user.role === 'REQUESTER' ? [['/tickets', 'My Tickets'], ['/tickets/new', 'Create Ticket']] : user.role === 'IT_STAFF' ? [['/staff/tickets', 'Ticket Queue']] : [['/admin/users', 'Users'], ['/staff/tickets', 'Ticket Lookup']]).map(([url, label]) => <a key={url} href={url} aria-current={path === url ? 'page' : undefined} onClick={(e) => { e.preventDefault(); setMenu(false); navigate(url); }}>{label}</a>)}
      </nav>
      <div className="requester-chip"><span><strong>{user.name}</strong><small>{roleName(user.role)}</small></span><button type="button" onClick={() => navigate('/change-password')}>Password</button><button type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? 'Signing out…' : 'Logout'}</button></div>
    </header>
    {failure && <div role="alert" className="auth-error">{failure}</div>}
    {user.role !== 'REQUESTER' && (path === '/staff/tickets' || path.startsWith('/staff/') && ticketPath.test(path.slice(6))) ? path === '/staff/tickets' ? <StaffTicketQueue user={user} onOpen={id => navigate(`/staff/tickets/${id}`)} /> : <StaffTicketDetail key={path} user={user} ticketId={path.split('/').pop()!} onBack={() => navigate('/staff/tickets')} /> : requesterRoute ? path === '/tickets/new' ? <CreateTicket requester={user} /> : path === '/tickets' ? <MyTickets requester={user} /> : <RequesterTicketDetail key={path} requester={user} ticketId={path.split('/').pop()!} onBack={() => navigate('/tickets')} /> :
      <main className="requester-page"><section className="requester-card"><p className="eyebrow">{roleName(user.role)}</p><h1>{laterRoute ? 'Your account is ready' : 'Access unavailable'}</h1><p>{laterRoute ? 'You are securely signed in. This workspace will be available with the next Lab 3 increment.' : 'This page is not available for your role.'}</p>{!laterRoute && <button className="auth-submit" onClick={() => navigate(landing(user))}>Return to your workspace</button>}</section></main>}
  </div>;
}
