import { useEffect, useState } from 'react';
import CreateTicket from './CreateTicket';
import MyTickets from './MyTickets';
import RequesterTicketDetail from './RequesterTicketDetail';
import AuthForm from './AuthForm';
import { AUTH_EVENT, AuthUser, authRequest, clearAuthState, resetCsrf } from './auth-api';
import './auth.css';

export type Requester = { id: string; name: string; email: string };
const landing = (user: AuthUser) => user.mustChangePassword ? '/change-password' : user.role === 'REQUESTER' ? '/tickets' : user.role === 'IT_STAFF' ? '/staff/tickets' : '/admin/users';
const roleName = (role: AuthUser['role']) => ({ REQUESTER: 'Requester', IT_STAFF: 'IT Staff', ADMINISTRATOR: 'Administrator' })[role];
function navigate(path: string) { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [path, setPath] = useState(location.pathname);
  const [menu, setMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    const route = () => setPath(location.pathname);
    const expired = (event: Event) => {
      if ((event as CustomEvent).detail === 'password') {
        setUser((current) => current ? { ...current, mustChangePassword: true } : null); navigate('/change-password');
      } else { setUser(null); navigate('/login'); }
    };
    window.addEventListener('popstate', route); window.addEventListener(AUTH_EVENT, expired);
    return () => { window.removeEventListener('popstate', route); window.removeEventListener(AUTH_EVENT, expired); };
  }, []);
  useEffect(() => {
    let active = true; resetCsrf(); localStorage.removeItem('toktickit.requester'); setLoading(true); setFailure('');
    authRequest('me').then((data) => {
      if (!active) return; setUser(data.user);
      if (['/login', '/', '/select-requester'].includes(location.pathname) || data.user.mustChangePassword) navigate(landing(data.user));
    }).catch((error) => {
      if (!active) return;
      if (error.message !== 'Sign in to continue.') setFailure('Unable to check your session. Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  async function logout() {
    if (loggingOut) return; setLoggingOut(true); setFailure('');
    try { await authRequest('logout', {}); clearAuthState(); setUser(null); navigate('/login'); }
    catch { setFailure('Sign out could not be completed. Please try again.'); }
    finally { setLoggingOut(false); }
  }
  const signedIn = (next: AuthUser) => { setUser(next); setFailure(''); navigate(landing(next)); };
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
    {requesterRoute ? path === '/tickets/new' ? <CreateTicket requester={user} /> : path === '/tickets' ? <MyTickets requester={user} /> : <RequesterTicketDetail requester={user} ticketId={path.split('/').pop()!} onBack={() => navigate('/tickets')} /> :
      <main className="requester-page"><section className="requester-card"><p className="eyebrow">{roleName(user.role)}</p><h1>{laterRoute ? 'Your account is ready' : 'Access unavailable'}</h1><p>{laterRoute ? 'You are securely signed in. This workspace will be available with the next Lab 3 increment.' : 'This page is not available for your role.'}</p>{!laterRoute && <button className="auth-submit" onClick={() => navigate(landing(user))}>Return to your workspace</button>}</section></main>}
  </div>;
}
