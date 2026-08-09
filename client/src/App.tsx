import { useState } from 'react';

type HealthResponse = {
  status: string;
  service: string;
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'online' | 'offline' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setStatus(null);
    setErrorMessage(null);

    const apiUrl = import.meta.env.VITE_API_URL ?? '';

    try {
      const response = await fetch(`${apiUrl}/api/health`);

      if (!response.ok) {
        throw new Error(`Health check failed with HTTP ${response.status}`);
      }

      const data = (await response.json()) as HealthResponse;

      if (data.status !== 'ok' || data.service !== 'TokTickIT API') {
        throw new Error('Unexpected health-check response');
      }

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
            <i className="bi bi-ticket-perforated me-2"></i>TokTickIT IT Service Desk
          </h1>
          <p className="col-md-8 fs-5 text-secondary mb-4">
            System Health Check &amp; Verification
          </p>

          <div className="mb-4">
            <button
              className="btn btn-primary btn-lg"
              type="button"
              onClick={checkHealth}
              disabled={loading}
              id="check-system-btn"
            >
              {loading ? 'Loading...' : 'Check System'}
            </button>
          </div>

          {loading && (
            <div className="alert alert-info" role="status">
              Loading...
            </div>
          )}

          {status === 'online' && (
            <div className="alert alert-success" role="status">
              <strong>System Status: Online</strong>
            </div>
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
