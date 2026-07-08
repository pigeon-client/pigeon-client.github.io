import type { CSSProperties } from "react";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

export function OrganizeSection() {
  return (
    <section id="organize" className="organize">
      <div className="wrap">
        <p className="kicker reveal">the best part</p>
        <h2 className="reveal">Send it. It sorts itself.</h2>
        <p className="lead reveal" style={delay(0.1)}>
          Other clients make you name, file, and save everything by hand. Pigeon does the librarian
          work while you work.
        </p>
        <div className="org-grid">
          <article className="org-card reveal">
            <div className="org-demo" aria-hidden="true">
              <span className="chip">
                <span className="m">GET</span>/todos/1<span className="x">✕</span>
              </span>
              <span className="chip ghost">
                <s>Untitled Request</s>
              </span>
            </div>
            <h3>Tabs name themselves</h3>
            <p>
              New tabs auto-derive their name from the URL path and follow it as you type. Rename
              one manually and it locks — your name wins.
            </p>
          </article>
          <article className="org-card reveal" style={delay(0.1)}>
            <div className="org-demo tree" aria-hidden="true">
              <div>📁 jsonplaceholder.typicode.com</div>
              <div className="ind">
                📁 todos <span className="c">2</span>
              </div>
              <div className="ind2">
                <span className="m">GET</span>/
              </div>
              <div className="ind2">
                <span className="m">GET</span>/1
              </div>
            </div>
            <h3>Requests file themselves</h3>
            <p>
              Every send is auto-saved as a draft and filed into a path-compressed tree — one folder
              per domain, grouped by endpoint. No "save as…" dialog, ever.
            </p>
          </article>
          <article className="org-card reveal" style={delay(0.2)}>
            <div className="org-demo tree" aria-hidden="true">
              <div className="bucket">Today</div>
              <div className="ind">
                <span className="m">GET</span>/todos/1 <span className="ok">200</span>
              </div>
              <div className="bucket">Yesterday</div>
              <div className="ind">
                <span className="m p2">POST</span>/login <span className="ok">201</span>
              </div>
            </div>
            <h3>History writes itself</h3>
            <p>
              Every request lands in a time-bucketed log — Today, Yesterday, This Week — with
              method, name, and status. Search it all with <code>⌘F</code>.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
