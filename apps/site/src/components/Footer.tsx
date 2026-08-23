import {
  COMPARISON_LINKS,
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  HERO_SUB,
  ISSUES_URL,
  LICENSE_URL,
  RELEASES_URL,
  REPO_URL,
  SITE_NAME,
} from "../lib/constants";

export function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <div className="foot-brand">
          <a className="foot-logo" href="/" aria-label={`${SITE_NAME} home`}>
            <img src="/pigeon-mark.svg" alt="" aria-hidden="true" width={20} height={20} />
            {SITE_NAME}
          </a>
          <p className="foot-tag">{HERO_SUB}</p>
          <a className="foot-email" href={CONTACT_MAILTO}>
            {CONTACT_EMAIL}
          </a>
        </div>

        <div className="foot-cols">
          <nav className="foot-col" aria-label="Explore">
            <h2 className="foot-heading">Explore</h2>
            <a href="/blog">Blog</a>
            <a href="/#download">Download</a>
            <a href="/#features">Features</a>
          </nav>
          <nav className="foot-col" aria-label="Compare">
            <h2 className="foot-heading">Compare</h2>
            {COMPARISON_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <nav className="foot-col" aria-label="Open source">
            <h2 className="foot-heading">Open source</h2>
            <a href={REPO_URL}>GitHub</a>
            <a href={ISSUES_URL}>Issues</a>
            <a href={RELEASES_URL}>Releases</a>
          </nav>
        </div>
      </div>

      <div className="wrap foot-legal">
        <p>© 2026 {SITE_NAME} contributors</p>
        <a href={LICENSE_URL}>MIT License</a>
      </div>
    </footer>
  );
}
