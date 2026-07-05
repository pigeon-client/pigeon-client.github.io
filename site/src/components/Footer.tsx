const REPO = "https://github.com/pigeon-client/pigeon";

interface FooterProps {
  version: string;
}

export function Footer({ version }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img
            src="/pigeon-logo-32.png"
            alt=""
            width={22}
            height={22}
            className="brand-mark"
            style={{ width: 22, height: 22 }}
          />
          Pigeon
          {version && version !== "0.0.0" && (
            <span className="ver-pill" style={{ marginLeft: 4 }}>
              <span className="dot" />v{version}
            </span>
          )}
        </div>

        <nav className="footer-links">
          <a href="#features">Features</a>
          <a href="#download">Download</a>
          <a href={`${REPO}/releases`} target="_blank" rel="noopener noreferrer">
            Releases
          </a>
          <a href={REPO} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
