import { useRef } from "react";
import { useHeroDemo } from "../hooks/useHeroDemo";
import { INSTALL_CMD, RELEASES_LATEST_URL, REPO_URL } from "../lib/constants";
import type { PlatformAsset } from "../types/release";
import { InstallBox } from "./CopyButton";

export function HeroSection({ primaryDownload }: { primaryDownload: PlatformAsset | null }) {
  const appRef = useRef<HTMLDivElement>(null);
  useHeroDemo(appRef);

  const downloadUrl = primaryDownload?.downloadUrl ?? RELEASES_LATEST_URL;

  return (
    <section className="hero">
      <div className="wrap">
        <span className="badge reveal visible">
          <span className="dot" aria-hidden="true" /> free &amp; open source · MIT licensed
        </span>
        <h1 className="reveal visible">
          The API client that
          <br />
          <span className="accent">organizes itself</span>
          <span className="cursor" aria-hidden="true" />
        </h1>
        <p className="sub reveal visible" style={{ "--d": "0.1s" } as React.CSSProperties}>
          Send a request — Pigeon names the tab, files it under its domain, and saves your history.
          Zero housekeeping. Free, open-source, native.
        </p>
        <div className="hero-ctas reveal visible" style={{ "--d": "0.2s" } as React.CSSProperties}>
          <a className="btn btn-primary" href={downloadUrl} aria-label="Download Pigeon for macOS">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
            Download for macOS
          </a>
          <a
            className="btn btn-ghost"
            href={REPO_URL}
            aria-label="View Pigeon source code on GitHub"
          >
            Star on GitHub
          </a>
        </div>
        <div className="reveal visible" style={{ "--d": "0.3s" } as React.CSSProperties}>
          <InstallBox command={INSTALL_CMD} />
        </div>
        <p className="hero-note reveal visible" style={{ "--d": "0.3s" } as React.CSSProperties}>
          macOS (Apple Silicon &amp; Intel) · Linux &amp; Windows coming soon
        </p>

        <div
          ref={appRef}
          className="app reveal visible"
          style={{ "--d": "0.3s" } as React.CSSProperties}
          role="img"
          aria-label="Animated demo of Pigeon sending a GET request and receiving a 200 OK JSON response"
        >
          <div className="app-titlebar">
            <span />
            <span />
            <span />
            <span className="tb-name">Pigeon</span>
          </div>
          <div className="app-body">
            <aside className="sb" aria-hidden="true">
              <div className="sb-new">+ New Request</div>
              <div className="sb-tabs">
                <span>History</span>
                <span className="on">Draft</span>
                <span>Collections</span>
              </div>
              <div className="sb-tree">
                <div className="sb-item newf" id="demo-folder">
                  <span>▸ 📁 jsonplaceholder…</span>
                  <span className="cnt" id="demo-cnt">
                    1
                  </span>
                </div>
                <div className="sb-item">
                  <span>▸ 📁 api.z.ai</span>
                  <span className="cnt">1</span>
                </div>
                <div className="sb-item">
                  <span>▸ 📁 httpbin.org</span>
                  <span className="cnt">1</span>
                </div>
                <div className="sb-item">
                  <span>▸ 📁 localhost</span>
                  <span className="cnt">2</span>
                </div>
                <div className="sb-item">
                  <span>▸ 📁 dummyjson.com</span>
                  <span className="cnt">5</span>
                </div>
              </div>
              <div className="sb-foot">
                <span id="demo-reqs">37</span> requests · 19 drafts
              </div>
            </aside>
            <div className="mn" aria-hidden="true">
              <div className="mn-tabs">
                <span className="on tab" id="demo-tab">
                  <span className="m">GET</span>
                  <span className="demo-tabname" id="demo-tabname">
                    Untitled Request
                  </span>
                  <span className="x">✕</span>
                </span>
                <span className="plus" id="demo-plus">
                  +
                </span>
              </div>
              <div className="urlrow">
                <span className="method">
                  GET <i />
                </span>
                <span className="url" id="demo-url">
                  <span className="caret" />
                </span>
                <span className="send" id="demo-send">
                  Send
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </span>
              </div>
              <div className="ed-tabs">
                <span className="on">Params</span>
                <span>Auth</span>
                <span>
                  Headers <sup>1</sup>
                </span>
                <span>Body</span>
              </div>
              <div className="resp">
                <div className="resp-bar">
                  <span className="spinner" id="demo-spin" />
                  <span id="demo-status" style={{ display: "none" }} className="status">
                    200 OK
                  </span>
                  <span id="demo-time" style={{ display: "none" }}>
                    ⏱ 369 ms
                  </span>
                  <span id="demo-size" style={{ display: "none" }}>
                    ◎ 83 B
                  </span>
                  <span className="right">
                    <span style={{ color: "var(--text)" }}>Body</span>
                    <span>Headers 25</span>
                    <span className="pill">
                      <span className="on">Pretty</span>
                      <span>Raw</span>
                    </span>
                  </span>
                </div>
                <div className="resp-body" id="demo-json">
                  <div className="ln">
                    <span className="no">1</span>
                    <span className="p">{"{"}</span>
                  </div>
                  <div className="ln">
                    <span className="no">2</span>
                    <span>
                      &nbsp;&nbsp;<span className="k">"userId"</span>
                      <span className="p">:</span> <span className="n">1</span>
                      <span className="p">,</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span className="no">3</span>
                    <span>
                      &nbsp;&nbsp;<span className="k">"id"</span>
                      <span className="p">:</span> <span className="n">1</span>
                      <span className="p">,</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span className="no">4</span>
                    <span>
                      &nbsp;&nbsp;<span className="k">"title"</span>
                      <span className="p">:</span> <span className="s">"delectus aut autem"</span>
                      <span className="p">,</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span className="no">5</span>
                    <span>
                      &nbsp;&nbsp;<span className="k">"completed"</span>
                      <span className="p">:</span> <span className="b">false</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span className="no">6</span>
                    <span className="p">{"}"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="demo-caption reveal visible" style={{ "--d": "0.4s" } as React.CSSProperties}>
          ▲ watch it organize itself — no folders were harmed (or created by hand)
        </p>
      </div>
    </section>
  );
}
