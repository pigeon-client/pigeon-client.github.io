import { type CSSProperties, useRef } from "react";
import { useInViewPlay } from "../hooks/useInViewPlay";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

/**
 * "While you edit" story beat — small daily wins, told as looping demos.
 * Both moments mirror real BodyEditor behavior: formatJsonPreservingVars()
 * normalizes loose JS objects and strips trailing commas on paste/format.
 */
export function MomentsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const playing = useInViewPlay(sectionRef);

  return (
    <section id="moments" ref={sectionRef} className={`moments${playing ? " playing" : ""}`}>
      <div className="wrap">
        <p className="kicker reveal">while you edit</p>
        <h2 className="reveal">Paste it messy. Send it clean.</h2>
        <p className="lead reveal" style={delay(0.1)}>
          Code from docs and console logs isn&apos;t valid JSON. Pigeon rewrites it on the way in —
          quotes, keys, commas — so you never clean up by hand.
        </p>
        <div className="mom-grid">
          <article className="mom-card reveal">
            <div className="mo-demo mo-jsobj" aria-hidden="true">
              <div className="mo-tabs">
                <span>Params</span>
                <span>Auth</span>
                <span>Headers</span>
                <span className="on">Body</span>
              </div>
              <div className="mo-types">
                <span>None</span>
                <span className="on">JSON</span>
                <span>Raw</span>
                <span className="mo-format">Format</span>
              </div>
              <div className="mo-line mo-ghost mo-a-ghost">
                <span className="no">1</span>
                <span className="tx">
                  <span className="p">{"{"}</span> <span className="bad">name</span>
                  <span className="p">:</span> <span className="bad">&apos;John&apos;</span>
                  <span className="p">,</span> <span className="bad">age</span>
                  <span className="p">:</span> <span className="n">30</span>{" "}
                  <span className="p">{"}"}</span>
                </span>
              </div>
              <div className="mo-arrow mo-a-arrow">↓</div>
              <div className="mo-clean">
                <div className="mo-line mo-a-l0">
                  <span className="no">1</span>
                  <span className="p">{"{"}</span>
                </div>
                <div className="mo-line mo-a-l1">
                  <span className="no">2</span>
                  <span className="ind">
                    <span className="k">&quot;name&quot;</span>
                    <span className="p">:</span> <span className="s">&quot;John&quot;</span>
                    <span className="p">,</span>
                  </span>
                </div>
                <div className="mo-line mo-a-l2">
                  <span className="no">3</span>
                  <span className="ind">
                    <span className="k">&quot;age&quot;</span>
                    <span className="p">:</span> <span className="n">30</span>
                  </span>
                </div>
                <div className="mo-line mo-a-l3">
                  <span className="no">4</span>
                  <span className="p">{"}"}</span>
                </div>
              </div>
              <span className="mo-pill mo-a-pill">✓ valid JSON</span>
              <div className="mo-caps">
                <span className="mo-cap c0">Pasted from console</span>
                <span className="mo-cap c1">Keys + quotes fixed</span>
                <span className="mo-cap c2">Valid JSON</span>
              </div>
            </div>
            <h3>JS objects become JSON</h3>
            <p>
              Bare keys and <code>&apos;single quotes&apos;</code> are rewritten to strict JSON as
              you paste — <code>{"{{vars}}"}</code> left untouched.
            </p>
          </article>

          <article className="mom-card reveal" style={delay(0.1)}>
            <div className="mo-demo mo-comma" aria-hidden="true">
              <div className="mo-tabs">
                <span>Params</span>
                <span>Auth</span>
                <span>Headers</span>
                <span className="on">Body</span>
              </div>
              <div className="mo-types">
                <span>None</span>
                <span className="on">JSON</span>
                <span>Raw</span>
                <span className="mo-format mo-a-format">Format</span>
              </div>
              <div className="mo-lines">
                <div className="mo-line">
                  <span className="no">1</span>
                  <span className="p">{"{"}</span>
                </div>
                <div className="mo-line">
                  <span className="no">2</span>
                  <span className="ind">
                    <span className="k">&quot;title&quot;</span>
                    <span className="p">:</span>{" "}
                    <span className="s">&quot;delectus aut autem&quot;</span>
                    <span className="p">,</span>
                  </span>
                </div>
                <div className="mo-line">
                  <span className="no">3</span>
                  <span className="ind">
                    <span className="k">&quot;done&quot;</span>
                    <span className="p">:</span> <span className="b">false</span>
                    <span className="comma mo-a-comma">,</span>
                  </span>
                </div>
                <div className="mo-line">
                  <span className="no">4</span>
                  <span className="p">{"}"}</span>
                </div>
              </div>
              <div className="mo-bar">
                <span className="mo-ok mo-a-ok">● 200 OK</span>
              </div>
              <div className="mo-caps">
                <span className="mo-cap c0">Trailing comma snuck in</span>
                <span className="mo-cap c1">Hit Format</span>
                <span className="mo-cap c2">Sent · 200 OK</span>
              </div>
            </div>
            <h3>Trailing commas delete themselves</h3>
            <p>
              Docs love a trailing comma. JSON doesn&apos;t. One <code>Format</code> and it&apos;s
              gone — then it sends.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
