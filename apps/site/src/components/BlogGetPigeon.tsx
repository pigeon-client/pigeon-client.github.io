import { getInstallCmd, REPO_URL } from "../lib/constants";
import { CopyButton } from "./CopyButton";

/** Shared install CTA for every blog post — one command, one copy button. */
export function BlogGetPigeon({ origin }: { origin?: string }) {
  const command = getInstallCmd(origin);

  return (
    <section className="blog-get" aria-labelledby="blog-get-heading">
      <h2 id="blog-get-heading">Get Pigeon</h2>
      <div className="blog-get-install">
        <code title={command}>{command}</code>
        <CopyButton text={command} />
      </div>
      <p className="blog-get-note">
        Open source, free forever: <a href={REPO_URL}>{REPO_URL.replace("https://", "")}</a>. Star
        it if it saves you a few clicks.
      </p>
    </section>
  );
}
