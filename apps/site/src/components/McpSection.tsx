import type { CSSProperties } from "react";

const delay = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;

const STEPS = [
  {
    title: "Connect",
    body: "Point it at an MCP server over Streamable HTTP — session tracked automatically.",
  },
  { title: "List", body: "Tools and resources show up with their input schema, no config." },
  {
    title: "Call",
    body: "A form builds itself from the schema; complex args fall back to raw JSON.",
  },
  {
    title: "Inspect",
    body: "Result renders as pretty or raw JSON, with timing — no separate client.",
  },
];

export function McpSection() {
  return (
    <section id="mcp">
      <div className="wrap">
        <p className="kicker reveal">first-class mcp testing</p>
        <h2 className="reveal">Test your MCP server without leaving Pigeon.</h2>
        <p className="lead reveal" style={delay(0.1)}>
          Connect, list tools, call one, inspect the result — the same fast, local workflow as
          testing a REST endpoint.
        </p>
        <div
          className="oss-flex"
          style={{ display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap" }}
        >
          <div className="reveal" style={{ ...delay(0.15), flex: "1 1 320px", minWidth: 280 }}>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="num">{i + 1}</span>
                  <p>
                    <strong>{s.title}</strong>
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <div className="reveal" style={{ ...delay(0.25), flex: "1 1 420px", minWidth: 280 }}>
            <img
              src="/mcp-screenshot.png"
              alt="Pigeon's MCP bench connected to a server, showing three tools and the JSON result of calling search_docs"
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid var(--border)",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
