import { useState } from 'react';

type HealthResponse = {
  status: string;
  service: string;
};

type Category = {
  id: number;
  name: string;
};

const isCategory = (value: unknown): value is Category => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const category = value as Record<string, unknown>;
  return typeof category.id === 'number' && typeof category.name === 'string';
};

export default function App() {
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

      if (!healthResponse.ok) {
        throw new Error(`Health check failed with HTTP ${healthResponse.status}`);
      }

      if (!categoriesResponse.ok) {
        throw new Error(
          `Category request failed with HTTP ${categoriesResponse.status}`,
        );
      }

      const healthData = (await healthResponse.json()) as HealthResponse;
      const categoryData = (await categoriesResponse.json()) as unknown;

      if (
        healthData.status !== 'ok' ||
        healthData.service !== 'TokTickIT API'
      ) {
        throw new Error('Unexpected health-check response');
      }

      if (!Array.isArray(categoryData) || !categoryData.every(isCategory)) {
        throw new Error('Unexpected category response');
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
            <i className="bi bi-ticket-perforated me-2"></i>TokTickIT IT Service Desk
          </h1>
          <p className="col-md-8 fs-5 text-secondary mb-4">
            System Health Check &amp; Verification
          </p>

          <div className="mb-4">
            <button
              className="btn btn-primary btn-lg"
              type="button"
              onClick={checkSystem}
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
            <>
              <div className="alert alert-success" role="status">
                <strong>System Status: Online</strong>
              </div>

              <section aria-labelledby="category-list-heading">
                <h2 id="category-list-heading" className="h4 mb-3">
                  Supported Request Categories
                </h2>
                <ol className="list-group list-group-numbered">
                  {categories.map((category) => (
                    <li className="list-group-item" key={category.id}>
                      {category.name}
                    </li>
                  ))}
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
