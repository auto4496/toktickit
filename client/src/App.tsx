export default function App() {
  return (
    <div className="container my-5">
      <div className="p-5 mb-4 bg-body-tertiary rounded-3 border shadow-sm">
        <div className="container-fluid py-3">
          <h1 className="display-5 fw-bold text-primary">
            <i className="bi bi-ticket-perforated me-2"></i>TokTickIT
          </h1>
          <p className="col-md-8 fs-4 text-secondary">
            Lab 01 Initial Project Structure Setup
          </p>
          <div className="alert alert-success d-flex align-items-center mt-4" role="alert">
            <i className="bi bi-check-circle-fill me-2 fs-5"></i>
            <div>
              <strong>Bootstrap Verified:</strong> React + TypeScript + Vite + Bootstrap styles are configured and rendering correctly.
            </div>
          </div>
          <button className="btn btn-primary btn-lg mt-2" type="button">
            <i className="bi bi-rocket-takeoff me-2"></i>Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
