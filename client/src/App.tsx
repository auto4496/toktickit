import { FormEvent, useEffect, useState } from 'react';

type HealthResponse = { status: string; service: string };
type Category = { id: number; name: string };
type Requester = { id: string; name: string; email: string };

const REQUESTER_STORAGE_KEY = 'toktickit.requester';

const isCategory = (value: unknown): value is Category => {
  if (typeof value !== 'object' || value === null) return false;
  const category = value as Record<string, unknown>;
  return typeof category.id === 'number' && typeof category.name === 'string';
};

const isRequester = (value: unknown): value is Requester => {
  if (typeof value !== 'object' || value === null) return false;
  const requester = value as Record<string, unknown>;
  return (
    typeof requester.id === 'string' &&
    typeof requester.name === 'string' &&
    typeof requester.email === 'string'
  );
};

const readStoredRequester = (): Requester | null => {
  try {
    const stored = window.localStorage.getItem(REQUESTER_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as unknown;
    return isRequester(parsed) ? parsed : null;
  } catch {
    window.localStorage.removeItem(REQUESTER_STORAGE_KEY);
    return null;
  }
};

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function LegacySystemCheck() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'online' | 'offline' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkSystem = async () => {
    setLoading(true);
    setStatus(null);
    setCategories([]);
    setErrorMessage(null);
    const apiUrl = import.meta.env.VITE_API_URL ?? '';

    try {
      const [healthResponse, categoriesResponse] = await Promise.all([
        fetch(`${apiUrl}/api/health`),
        fetch(`${apiUrl}/api/categories`),
      ]);
      if (!healthResponse.ok || !categoriesResponse.ok) throw new Error();

      const healthData = (await healthResponse.json()) as HealthResponse;
      const categoryData = (await categoriesResponse.json()) as unknown;
      if (
        healthData.status !== 'ok' ||
        healthData.service !== 'TokTickIT API' ||
        !Array.isArray(categoryData) ||
        !categoryData.every(isCategory)
      ) {
        throw new Error();
      }

      setCategories(categoryData);
      setStatus('online');
    } catch {
      setStatus('offline');
      setErrorMessage('Unable to connect to TokTickIT API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-5">
      <div className="p-5 mb-4 bg-body-tertiary rounded-3 border shadow-sm">
        <div className="container-fluid py-3">
          <h1 className="display-5 fw-bold text-primary mb-3">
            <i className="bi bi-ticket-perforated me-2" />TokTickIT IT Service Desk
          </h1>
          <p className="col-md-8 fs-5 text-secondary mb-4">System Health Check &amp; Verification</p>
          <button className="btn btn-primary btn-lg mb-4" type="button" onClick={checkSystem} disabled={loading}>
            {loading ? 'Loading...' : 'Check System'}
          </button>
          {loading && <div className="alert alert-info" role="status">Loading...</div>}
          {status === 'online' && (
            <>
              <div className="alert alert-success" role="status"><strong>System Status: Online</strong></div>
              <section aria-labelledby="category-list-heading">
                <h2 id="category-list-heading" className="h4 mb-3">Supported Request Categories</h2>
                <ol className="list-group list-group-numbered">
                  {categories.map((category) => <li className="list-group-item" key={category.id}>{category.name}</li>)}
                </ol>
              </section>
            </>
          )}
          {status === 'offline' && (
            <div className="alert alert-danger" role="alert">
              <strong>System Status: Offline</strong>
              {errorMessage && <div className="mt-1">{errorMessage}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequesterSelection({ onSelected }: { onSelected: (requester: Requester) => void }) {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'failure'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState('loading');
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/requesters`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = (await response.json()) as unknown;
        if (!Array.isArray(body) || !body.every(isRequester)) throw new Error();
        if (!active) return;
        setRequesters(body);
        setState(body.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (active) setState('failure');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => setAttempt((value) => value + 1);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const requester = requesters.find((item) => item.id === selectedId);
    if (requester) onSelected(requester);
  };

  return (
    <main className="requester-page">
      <section className="requester-card" aria-labelledby="requester-heading">
        <div className="brand-mark" aria-hidden="true"><i className="bi bi-ticket-perforated" /></div>
        <p className="eyebrow">TokTickIT development access</p>
        <h1 id="requester-heading">Select Development Requester</h1>
        <p className="intro">Choose who you are testing as. This is a testing mechanism, not authentication.</p>

        {state === 'loading' && <p className="state-message" role="status">Loading requesters...</p>}
        {state === 'empty' && (
          <div className="state-panel">
            <p>No active Development Requesters are available</p>
            <button className="btn btn-outline-success" type="button" onClick={retry}>Retry</button>
          </div>
        )}
        {state === 'failure' && (
          <div className="alert alert-danger state-panel" role="alert">
            <p>Unable to load Development Requesters. Try again.</p>
            <button className="btn btn-outline-danger" type="button" onClick={retry}>Retry</button>
          </div>
        )}
        {state === 'ready' && (
          <form onSubmit={submit}>
            <label className="form-label fw-semibold" htmlFor="requester-select">Development Requester</label>
            <select
              id="requester-select"
              className="form-select form-select-lg"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Choose a requester</option>
              {requesters.map((requester) => (
                <option key={requester.id} value={requester.id}>{requester.name} — {requester.email}</option>
              ))}
            </select>
            <button className="btn btn-success btn-lg w-100 mt-4" type="submit" disabled={!selectedId}>Continue</button>
          </form>
        )}
      </section>
    </main>
  );
}

function ApplicationShell({ requester, onChangeRequester }: { requester: Requester; onChangeRequester: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activePath = window.location.pathname;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/tickets" onClick={(event) => { event.preventDefault(); navigate('/tickets'); }}>
          <i className="bi bi-ticket-perforated" /> TokTickIT
        </a>
        <button
          className="menu-button"
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <i className={menuOpen ? 'bi bi-x-lg' : 'bi bi-list'} /> Menu
        </button>
        <nav className={menuOpen ? 'is-open' : ''} aria-label="Primary navigation">
          <a aria-current={activePath === '/tickets' ? 'page' : undefined} href="/tickets" onClick={(event) => { event.preventDefault(); setMenuOpen(false); navigate('/tickets'); }}>My Tickets</a>
          <a aria-current={activePath === '/tickets/new' ? 'page' : undefined} href="/tickets/new" onClick={(event) => { event.preventDefault(); setMenuOpen(false); navigate('/tickets/new'); }}>Create Ticket</a>
        </nav>
        <div className="requester-chip">
          <span><strong>{requester.name}</strong><small>Testing context — not authentication</small></span>
          <button type="button" onClick={onChangeRequester}>Change Requester</button>
        </div>
      </header>
      <main className="workspace">
        <p className="eyebrow">Requester workspace</p>
        <h1>My Tickets</h1>
        <p className="text-secondary">Your ticket list will appear here in the next Lab 2 issue.</p>
      </main>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [requester, setRequester] = useState<Requester | null>(readStoredRequester);

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  if (path === '/lab-01') return <LegacySystemCheck />;

  if (!requester) {
    if (path !== '/select-requester') window.history.replaceState({}, '', '/select-requester');
    return (
      <RequesterSelection
        onSelected={(selectedRequester) => {
          window.localStorage.setItem(REQUESTER_STORAGE_KEY, JSON.stringify(selectedRequester));
          setRequester(selectedRequester);
          navigate('/tickets');
        }}
      />
    );
  }

  return (
    <ApplicationShell
      requester={requester}
      onChangeRequester={() => {
        window.localStorage.removeItem(REQUESTER_STORAGE_KEY);
        setRequester(null);
        navigate('/select-requester');
      }}
    />
  );
}
