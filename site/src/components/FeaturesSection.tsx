export function FeaturesSection() {
  return (
    <section className="features-section">
      <h2 className="section-title">Features</h2>
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h3 className="feature-title">One-Click Testing</h3>
          <p className="feature-desc">
            Send HTTP requests instantly. GET, POST, PUT, PATCH, DELETE — all at your fingertips
            with zero friction.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <h3 className="feature-title">Cross-Platform</h3>
          <p className="feature-desc">
            Works seamlessly on macOS, Windows, and Linux. One codebase, native performance
            everywhere.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
            </svg>
          </div>
          <h3 className="feature-title">Auto Updates</h3>
          <p className="feature-desc">
            Stay up to date automatically. Pigeon downloads and installs updates in the background
            so you always have the latest features.
          </p>
        </div>
      </div>
    </section>
  );
}
