import type { CSSProperties } from "react";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

export function OrganizeSection() {
  return (
    <section id="organize" className="organize">
      <div className="wrap">
        <p className="kicker reveal">the best part</p>
        <h2 className="reveal">Send it. It sorts itself.</h2>
        <p className="lead reveal" style={delay(0.1)}>
          No naming, filing, or saving by hand. Pigeon does the librarian work while you work.
        </p>
        <div className="org-grid">
          <article className="org-card reveal org-playing">
            <div className="org-demo org-name" aria-hidden="true">
              <span className="chip ghost org-a-ghost">
                <s>Untitled Request</s>
              </span>
              <span className="org-a-arrow" aria-hidden="true">
                →
              </span>
              <span className="chip live org-a-live">
                <span className="m">GET</span>/todos/1<span className="x">✕</span>
              </span>
              <div className="org-caps">
                <span className="org-cap c0">Untitled tab</span>
                <span className="org-cap c1">URL typed</span>
                <span className="org-cap c2">Auto-named</span>
              </div>
            </div>
            <h3>Tabs name themselves</h3>
            <p>
              New tabs auto-derive their name from the URL path. Rename manually and it locks — your
              name wins.
            </p>
          </article>
          <article className="org-card reveal org-playing" style={delay(0.1)}>
            <div className="org-demo tree org-file" aria-hidden="true">
              <div className="org-a-domain">
                <span className="org-chev">▾</span> 📁 jsonplaceholder.typicode.com
              </div>
              <div className="ind org-a-folder">
                <span className="org-chev">▾</span> 📁 todos <span className="c org-a-cnt">2</span>
              </div>
              <div className="ind2 org-a-req0">
                <span className="m">GET</span>/
              </div>
              <div className="ind2 org-a-req1">
                <span className="m">GET</span>/1
              </div>
              <div className="org-caps">
                <span className="org-cap c0">Domain folder</span>
                <span className="org-cap c1">Path nest</span>
                <span className="org-cap c2">Draft filed</span>
              </div>
            </div>
            <h3>Requests file themselves</h3>
            <p>
              Every send auto-saves as a draft and files into a domain tree. No "save as…" dialog,
              ever.
            </p>
          </article>
          <article className="org-card reveal org-playing" style={delay(0.2)}>
            <div className="org-demo tree org-hist" aria-hidden="true">
              <div className="bucket org-a-b0">Today</div>
              <div className="ind org-a-h0">
                <span className="m">GET</span>/todos/1 <span className="ok">200</span>
              </div>
              <div className="bucket org-a-b1">Yesterday</div>
              <div className="ind org-a-h1">
                <span className="m p2">POST</span>/login <span className="ok">201</span>
              </div>
              <div className="org-caps">
                <span className="org-cap c0">Logged today</span>
                <span className="org-cap c1">Bucketed by day</span>
                <span className="org-cap c2">Search with ⌘F</span>
              </div>
            </div>
            <h3>History writes itself</h3>
            <p>
              Every request lands in a time-bucketed log with method, name, and status. Search with{" "}
              <code>⌘F</code>.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
