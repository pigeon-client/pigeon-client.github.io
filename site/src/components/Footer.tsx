import { ISSUES_URL, LICENSE_URL, RELEASES_URL, REPO_URL } from "../lib/constants";

export function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <p>© 2026 Pigeon contributors · MIT License</p>
        <nav aria-label="Footer">
          <a href={REPO_URL}>GitHub</a>
          <a href={ISSUES_URL}>Issues</a>
          <a href={RELEASES_URL}>Releases</a>
          <a href={LICENSE_URL}>License</a>
        </nav>
      </div>
    </footer>
  );
}
