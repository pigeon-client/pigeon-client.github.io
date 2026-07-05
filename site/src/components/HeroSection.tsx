import type { CSSProperties } from "react";
import { PLATFORM_LABELS } from "../lib/github";
import type { PlatformAsset } from "../types/release";

interface HeroSectionProps {
  primaryDownload: PlatformAsset | null;
  detectedOS: PlatformAsset["platform"];
  version: string;
}

const RELEASES_URL = "https://github.com/pigeon-client/pigeon/releases";

export function HeroSection({ primaryDownload, detectedOS, version }: HeroSectionProps) {
  const osLabel = PLATFORM_LABELS[detectedOS].replace(/\s*\(.*\)/, "");

  return (
    <section className="hero" id="top">
      <div className="hero-grid">
        {/* ── Copy ── */}
        <div className="hero-copy reveal">
          <span className="badge-row">
            <b>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "currentColor",
                  display: "inline-block",
                }}
              />
              {version && version !== "0.0.0" ? `v${version}` : "open source"}
            </b>
            Native • Tauri-powered • no Electron bloat
          </span>

          <h1>
            The API client that
            <br />
            <span className="grad">stays out of your way.</span>
          </h1>

          <p className="lede">
            Send requests, organize collections, switch environments and import cURL — in a fast,
            native desktop app for macOS, Windows and Linux.
          </p>

          <div className="cta-row">
            <a
              className="btn btn-primary"
              href={primaryDownload ? primaryDownload.downloadUrl : RELEASES_URL}
              {...(primaryDownload ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {primaryDownload ? `Download for ${osLabel}` : "View releases"}
            </a>
            <a className="btn btn-ghost" href="#download">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              Install via terminal
            </a>
          </div>

          <p className="hero-note">
            <b>Free & open source.</b> No account, no telemetry, no cloud lock-in.
          </p>

          <div className="stats">
            <div className="stat">
              <div className="n">7</div>
              <div className="l">HTTP methods</div>
            </div>
            <div className="stat">
              <div className="n">3</div>
              <div className="l">platforms</div>
            </div>
            <div className="stat">
              <div className="n">0</div>
              <div className="l">CORS limits</div>
            </div>
          </div>
        </div>

        {/* ── App window mock ── */}
        <div className="hero-mock reveal" style={{ "--d": "0.12s" } as CSSProperties}>
          <AppMock />
        </div>
      </div>
    </section>
  );
}

function AppMock() {
  return (
    <div
      className="mock"
      role="img"
      aria-label="Pigeon app sending a request and showing a 200 response"
    >
      <div className="mock-bar">
        <span className="tl r" />
        <span className="tl y" />
        <span className="tl g" />
        <span className="mock-title">
          <img className="mock-logo" src="/pigeon-logo-32.png" alt="" width={15} height={15} />
          Pigeon — users API
        </span>
      </div>

      <div className="mock-tabs">
        <span className="mock-tab on">
          <span className="m" style={{ color: "var(--get)" }}>
            GET
          </span>{" "}
          users
        </span>
        <span className="mock-tab">
          <span className="m" style={{ color: "var(--post)" }}>
            POST
          </span>{" "}
          login
        </span>
        <span className="mock-tab">
          <span className="m" style={{ color: "var(--put)" }}>
            PUT
          </span>{" "}
          profile
        </span>
      </div>

      <div className="mock-url">
        <span
          className="method-pill"
          style={{
            color: "var(--get)",
            background: "color-mix(in oklch, var(--get) 15%, transparent)",
            borderColor: "color-mix(in oklch, var(--get) 30%, transparent)",
          }}
        >
          GET
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
        <span className="url-field">
          <span className="scheme">https://</span>
          <span className="var">{"{{baseUrl}}"}</span>
          <span className="path">/v1/users</span>
        </span>
        <span className="send-btn">
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
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </span>
      </div>

      <div className="mock-resp">
        <div className="load-bar" aria-hidden="true">
          <i />
        </div>
        <div className="resp-meta">
          <span className="status-chip">
            <span className="d" />
            200 OK
          </span>
          <span className="muted">38 ms</span>
          <span className="muted">1.2 KB</span>
        </div>
        <pre className="code">
          <span className="ln">
            <span className="gut">1</span>
            <span className="p">{"{"}</span>
          </span>
          <span className="ln">
            <span className="gut">2</span>
            {"  "}
            <span className="k">"users"</span>
            <span className="p">: [</span>
          </span>
          <span className="ln">
            <span className="gut">3</span>
            {"    "}
            <span className="p">{"{ "}</span>
            <span className="k">"id"</span>
            <span className="p">: </span>
            <span className="n">1</span>
            <span className="p">, </span>
            <span className="k">"name"</span>
            <span className="p">: </span>
            <span className="s">"Ada"</span>
            <span className="p">{" }"}</span>
            <span className="p">,</span>
          </span>
          <span className="ln">
            <span className="gut">4</span>
            {"    "}
            <span className="p">{"{ "}</span>
            <span className="k">"id"</span>
            <span className="p">: </span>
            <span className="n">2</span>
            <span className="p">, </span>
            <span className="k">"name"</span>
            <span className="p">: </span>
            <span className="s">"Linus"</span>
            <span className="p">{" }"}</span>
          </span>
          <span className="ln">
            <span className="gut">5</span>
            {"  "}
            <span className="p">],</span>
          </span>
          <span className="ln">
            <span className="gut">6</span>
            {"  "}
            <span className="k">"total"</span>
            <span className="p">: </span>
            <span className="n">2</span>
          </span>
          <span className="ln">
            <span className="gut">7</span>
            <span className="p">{"}"}</span>
          </span>
        </pre>
      </div>
    </div>
  );
}
